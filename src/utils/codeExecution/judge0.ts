import {
  canExecuteCode,
  resolveJudge0LanguageId,
} from "./judge0Languages";
import { prepareCodeForExecution, type CodeRunResult } from "./types";

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

function appendOutputLines(logs: string[], text: string | null | undefined) {
  if (!text?.trim()) return;
  logs.push(...text.trimEnd().split("\n"));
}

function parseJudge0Submission(data: Judge0Submission): CodeRunResult {
  const logs: string[] = [];
  const statusId = data.status?.id;

  appendOutputLines(logs, data.compile_output);
  appendOutputLines(logs, data.stdout);
  appendOutputLines(logs, data.stderr);

  if (statusId === 3) {
    return { logs };
  }

  if (statusId === 6) {
    return { logs, error: "Compilation failed." };
  }

  if (statusId === 5) {
    return { logs, error: "Time limit exceeded." };
  }

  if (statusId && statusId >= 7 && statusId <= 12) {
    return {
      logs,
      error: data.status?.description || "Runtime error.",
    };
  }

  if (data.message) {
    return { logs, error: data.message };
  }

  if (statusId && statusId !== 3) {
    return {
      logs,
      error: data.status?.description || `Execution failed (status ${statusId}).`,
    };
  }

  return { logs };
}

/**
 * Execute student code through Judge0.
 * Default instance: https://ce.judge0.com
 */
export async function executeStudentCode(
  code: string,
  language?: string,
): Promise<CodeRunResult> {
  const apiUrl = getJudge0ApiUrl();
  const headers = getJudge0Headers();
  const languageId = await resolveJudge0LanguageId(language, apiUrl, headers);

  if (!languageId) {
    return {
      logs: [],
      error: `Code execution is not supported for "${language || "unknown"}".`,
    };
  }

  const preparedCode = prepareCodeForExecution(code, language);

  try {
    const response = await fetch(
      `${apiUrl}/submissions?base64_encoded=false&wait=true&fields=stdout,stderr,compile_output,message,status`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          source_code: preparedCode,
          language_id: languageId,
        }),
      },
    );

    const data = (await response.json()) as Judge0Submission & {
      message?: string;
    };

    if (!response.ok) {
      const authHint =
        response.status === 401 || response.status === 403
          ? "Check VITE_JUDGE0_AUTH_TOKEN or use a backend proxy for production."
          : undefined;
      return {
        logs: [],
        error:
          authHint ||
          data.message ||
          `Judge0 request failed (${response.status}).`,
      };
    }

    return parseJudge0Submission(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      logs: [],
      error: `Could not run code: ${message}`,
    };
  }
}

export { canExecuteCode };
