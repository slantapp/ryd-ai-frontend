/** Languages we can execute in the browser (sandboxed). */
export function canRunCodeLive(language?: string): boolean {
  const lang = (language || "javascript").toLowerCase();
  return (
    lang === "javascript" ||
    lang === "js" ||
    lang === "typescript" ||
    lang === "ts"
  );
}

/**
 * Run learner JavaScript without calling the browser's window.print().
 * In browsers, bare `print()` is an alias for window.print() — so eval("print('x')")
 * opens the system print dialog. We inject a safe `print` that logs instead.
 */
export function runStudentJavaScript(code: string): {
  logs: string[];
  error?: string;
} {
  const logs: string[] = [];
  const console = {
    log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
    error: (...args: unknown[]) =>
      logs.push(`Error: ${args.map(String).join(" ")}`),
    warn: (...args: unknown[]) =>
      logs.push(`Warning: ${args.map(String).join(" ")}`),
  };
  const print = (...args: unknown[]) => logs.push(args.map(String).join(" "));

  try {
    const runner = new Function("console", "print", code);
    runner(console, print);
    return { logs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { logs, error: message };
  }
}

export function formatRunOutput(
  result: { logs: string[]; error?: string },
  emptyLabel = "(No output)"
): string[] {
  if (result.error) {
    return result.logs.length > 0
      ? [...result.logs, `Error: ${result.error}`]
      : [`Error: ${result.error}`];
  }
  return result.logs.length > 0 ? result.logs : [emptyLabel];
}
