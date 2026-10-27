export type CodeRunResult = {
  logs: string[];
  error?: string;
  /** The program asked for a line that was not in the input. */
  waiting?: boolean;
  /** Everything the program printed, exactly as written, without picture lines. */
  stdout?: string;
};

function javaIdentChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9_]/.test(ch);
}

/**
 * Rename the public class to Main in the copy sent to the runner.
 * Strings, character quotes, and comments keep the original word.
 */
export function renameJavaPublicClass(code: string): string {
  const match = code.match(/\bpublic\s+class\s+([A-Za-z_]\w*)\b/);
  if (!match || match[1] === "Main") return code;
  const name = match[1];
  let out = "";
  let i = 0;
  while (i < code.length) {
    const rest = code.slice(i);
    if (rest.startsWith("//")) {
      const end = code.indexOf("\n", i);
      const stop = end === -1 ? code.length : end;
      out += code.slice(i, stop);
      i = stop;
      continue;
    }
    if (rest.startsWith("/*")) {
      const end = code.indexOf("*/", i + 2);
      const stop = end === -1 ? code.length : end + 2;
      out += code.slice(i, stop);
      i = stop;
      continue;
    }
    const quote = rest[0];
    if (quote === '"' || quote === "'") {
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === "\\") {
          j += 2;
          continue;
        }
        if (code[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      out += code.slice(i, j);
      i = j;
      continue;
    }
    if (
      rest.startsWith(name) &&
      !javaIdentChar(code[i - 1]) &&
      !javaIdentChar(code[i + name.length])
    ) {
      out += "Main";
      i += name.length;
      continue;
    }
    out += code[i];
    i += 1;
  }
  return out;
}

export function prepareCodeForExecution(code: string, language?: string): string {
  const lang = (language || "javascript").toLowerCase();
  if (lang === "java") return renameJavaPublicClass(code);
  if (lang !== "javascript" && lang !== "js") return code;

  const definesPrint = /(?:const|let|var|function)\s+print\b/.test(code);
  const usesPrint = /\bprint\s*\(/.test(code);
  if (usesPrint && !definesPrint) {
    // A function declaration is hoisted, so it can go last and error lines stay the learner's.
    return `${code}\nfunction print(...args) { console.log(...args); }\n`;
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
