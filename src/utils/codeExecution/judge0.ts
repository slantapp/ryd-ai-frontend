import {
  canExecuteCode,
  judge0LanguageName,
  resolveJudge0LanguageId,
} from "./judge0Languages";
import { prepareCodeForExecution, type CodeRunResult } from "./types";
import { compilerOptionsFor } from "./compilerOptions";
import { bytesToBase64, zipStore } from "./zipStore";
import {
  IMAGE_LINE_PREFIX,
  instrumentSource,
  shiftScriptLines,
  splitImageLines,
} from "./instrument";
import {
  emptyOutputHint,
  friendlyRunError,
  isWaitingForInput,
  judge0RejectionPlan,
  logsAfterTimeLimit,
  SQL_HOST_MESSAGE,
  formatSqlTable,
  trimProgramOutput,
  versionHostNote,
  withRunDetails,
} from "./runFeedback";

type Judge0Submission = {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  status?: { id: number; description: string };
};

const DEFAULT_JUDGE0_API_URL = "https://ce.judge0.com";

function getJudge0ApiUrl(): string {
  const configured = import.meta.env.VITE_JUDGE0_API_URL?.trim();
  return configured?.replace(/\/$/, "") || DEFAULT_JUDGE0_API_URL;
}

function getJudge0Headers(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const authToken = import.meta.env.VITE_JUDGE0_AUTH_TOKEN?.trim();
  if (authToken) {
    headers["X-Auth-Token"] = authToken;
  }

  return headers;
}

function failureText(data: Judge0Submission): string {
  return [data.compile_output, data.stderr, data.message, data.status?.description]
    .filter((item) => item?.trim())
    .join("\n");
}

export function parseJudge0Submission(
  received: Judge0Submission,
  language?: string,
  lineOffset = 0,
): CodeRunResult {
  const statusId = received.status?.id;
  const data: Judge0Submission = {
    ...received,
    stderr: shiftScriptLines(received.stderr, lineOffset),
    compile_output: shiftScriptLines(received.compile_output, lineOffset),
  };
  const { text: stdout, images } = splitImageLines(
    (received.stdout ?? "").replace(/\r\n/g, "\n"),
  );
  const pictures = images.map((src) => `${IMAGE_LINE_PREFIX}${src}`);
  const printed = stdout.trim() ? trimProgramOutput(stdout) : [];

  if (statusId === 3) {
    if (stdout.trim()) {
      const sql = (language || "").toLowerCase();
      if (sql === "sqlite" || sql === "sql") return { logs: formatSqlTable(stdout), stdout };
      return { logs: [...printed, ...pictures], stdout };
    }
    if (pictures.length) return { logs: pictures, stdout };
    if (data.stderr?.trim()) return { logs: trimProgramOutput(data.stderr), stdout };
    return { logs: [emptyOutputHint(language)], stdout };
  }

  if (statusId === 5) {
    return { logs: [...logsAfterTimeLimit(stdout, data.stderr, pictures)], stdout };
  }

  if (statusId === 6 || (statusId && statusId >= 7 && statusId <= 12)) {
    const raw = failureText(data);
    if (statusId !== 6 && isWaitingForInput(raw)) {
      return { logs: [...printed, ...pictures], waiting: true, stdout };
    }
    const friendly = friendlyRunError(raw, language);
    return {
      logs: [...printed, ...pictures, ...withRunDetails(friendly.summary, friendly.details)],
      stdout,
    };
  }

  if (data.message) {
    const friendly = friendlyRunError(data.message, language);
    return { logs: withRunDetails(friendly.summary, friendly.details) };
  }

  if (statusId && statusId !== 3) {
    const friendly = friendlyRunError(
      data.status?.description || `Execution failed (status ${statusId}).`,
      language,
    );
    return { logs: withRunDetails(friendly.summary, friendly.details) };
  }

  return { logs: [] };
}

export type StudentCodeOptions = {
  stdin?: string;
  version?: string;
  files?: Record<string, string>;
  setupSql?: string;
  /** Re-run with one more answer each time the program waits. See instrument.ts. */
  live?: boolean;
  seed?: number;
};

function isSqlLanguage(language?: string): boolean {
  const key = (language || "").toLowerCase();
  return key === "sql" || key === "sqlite" || key === "sqlite3";
}

function timeLimits(language?: string): {
  cpu_time_limit: number;
  wall_time_limit: number;
  memory_limit: number;
} {
  const java = (language || "").toLowerCase() === "java";
  return {
    cpu_time_limit: java ? 10 : 5,
    wall_time_limit: java ? 15 : 10,
    memory_limit: 256000,
  };
}

/**
 * Execute student code through Judge0.
 * Default instance: https://ce.judge0.com
 */
export async function executeStudentCode(
  code: string,
  language?: string,
  options?: StudentCodeOptions,
): Promise<CodeRunResult> {
  const apiUrl = getJudge0ApiUrl();
  const headers = getJudge0Headers();
  const languageId = await resolveJudge0LanguageId(
    language,
    apiUrl,
    headers,
    options?.version,
  );

  const hostNote = versionHostNote(
    options?.version,
    languageId != null ? judge0LanguageName(languageId) : undefined,
  );
  const annotate = (result: CodeRunResult): CodeRunResult =>
    hostNote ? { ...result, logs: [hostNote, ...result.logs] } : result;

  if (!languageId) {
    return annotate({
      logs: [],
      error: isSqlLanguage(language)
        ? SQL_HOST_MESSAGE
        : `Code execution is not supported for "${language || "unknown"}".`,
    });
  }

  const preparedCode = prepareCodeForExecution(code, language);
  const instrumented = instrumentSource(preparedCode, language, {
    live: options?.live,
    seed: options?.seed,
  });
  const source = options?.setupSql?.trim()
    ? `${options.setupSql.trim()}\n${instrumented.source}`
    : instrumented.source;
  const compilerOptions = compilerOptionsFor(language);
  const extraFiles = Object.entries(options?.files ?? {}).filter(
    ([name, content]) => name.trim() && content != null,
  );
  const additionalFiles = extraFiles.length
    ? bytesToBase64(
        zipStore(extraFiles.map(([name, content]) => ({ name, content }))),
      )
    : undefined;
  const limits = timeLimits(language);

  const payload = (include: { limits: boolean; files: boolean }) => ({
    source_code: source,
    language_id: languageId,
    ...(compilerOptions ? { compiler_options: compilerOptions } : {}),
    ...(options?.stdin !== undefined ? { stdin: options.stdin } : {}),
    ...(include.limits ? limits : {}),
    ...(include.files && additionalFiles
      ? { additional_files: additionalFiles }
      : {}),
  });

  try {
    const endpoint = `${apiUrl}/submissions?base64_encoded=false&wait=true&fields=stdout,stderr,compile_output,message,status`;
    let include = { limits: true, files: true };
    let response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload(include)),
    });
    if (response.status === 422) {
      const text = await response.text();
      const plan = judge0RejectionPlan(text, extraFiles.length > 0);
      if (plan.hostMessage) return annotate({ logs: [], error: plan.hostMessage });
      include = { limits: plan.limits, files: plan.files };
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload(include)),
      });
    }

    const data = (await response.json()) as Judge0Submission & {
      message?: string;
    };

    if (!response.ok) {
      const authHint =
        response.status === 401 || response.status === 403
          ? "Check VITE_JUDGE0_AUTH_TOKEN or use a backend proxy for production."
          : undefined;
      return annotate({
        logs: [],
        error:
          authHint ||
          data.message ||
          `Judge0 request failed (${response.status}).`,
      });
    }

    return annotate(parseJudge0Submission(data, language, instrumented.lineOffset));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return annotate({
      logs: [],
      error: `Could not run code: ${message}`,
    });
  }
}

export { canExecuteCode };
