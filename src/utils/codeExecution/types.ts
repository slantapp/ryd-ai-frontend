export type CodeRunResult = {
  logs: string[];
  error?: string;
};

export function prepareCodeForExecution(code: string, language?: string): string {
  const lang = (language || "javascript").toLowerCase();
  if (lang !== "javascript" && lang !== "js") return code;

  const definesPrint = /(?:const|let|var|function)\s+print\b/.test(code);
  const usesPrint = /\bprint\s*\(/.test(code);
  if (usesPrint && !definesPrint) {
    return `const print = (...args) => console.log(...args);\n${code}`;
  }
  return code;
}

export function formatRunOutput(
  result: CodeRunResult,
  emptyLabel = "(No output)",
): string[] {
  if (result.error) {
    return result.logs.length > 0
      ? [...result.logs, `Error: ${result.error}`]
      : [`Error: ${result.error}`];
  }
  return result.logs.length > 0 ? result.logs : [emptyLabel];
}
