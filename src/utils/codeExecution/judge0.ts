import {
  canExecuteCode,
  judge0LanguageName,
  resolveJudge0LanguageId,
} from "./judge0Languages";
import { prepareCodeForExecution, type CodeRunResult } from "./types";
import { compilerOptionsFor } from "./compilerOptions";
import { bytesToBase64, zipStore } from "./zipStore";
import {
  emptyOutputHint,
  friendlyRunError,
  judge0RejectionPlan,
  SQL_HOST_MESSAGE,
  TIME_LIMIT_MESSAGE,
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

function parseJudge0Submission(
  data: Judge0Submission,
  language?: string,
): CodeRunResult {
  const statusId = data.status?.id;

  if (statusId === 3) {
    if (data.stdout?.trim()) {
      const sql = (language || "").toLowerCase();
      if (sql === "sqlite" || sql === "sql") return { logs: formatSqlTable(data.stdout) };
      return { logs: trimProgramOutput(data.stdout) };
    }
    if (data.stderr?.trim()) return { logs: trimProgramOutput(data.stderr) };
    return { logs: [emptyOutputHint(language)] };
  }

  if (statusId === 5) {
    return { logs: [TIME_LIMIT_MESSAGE] };
  }

  if (statusId === 6 || (statusId && statusId >= 7 && statusId <= 12)) {
    const friendly = friendlyRunError(failureText(data), language);
    return { logs: withRunDetails(friendly.summary, friendly.details) };
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
  const source = options?.setupSql?.trim()
    ? `${options.setupSql.trim()}\n${preparedCode}`
    : preparedCode;
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

    return annotate(parseJudge0Submission(data, language));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return annotate({
      logs: [],
      error: `Could not run code: ${message}`,
    });
  }
}

export { canExecuteCode };
