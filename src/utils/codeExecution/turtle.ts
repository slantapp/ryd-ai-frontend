import type { CodeRunResult } from "./types";

type SkulptApi = {
  builtinFiles?: { files?: Record<string, string> };
  builtin?: { none?: { none$: unknown } };
  configure: (options: Record<string, unknown>) => void;
  importMainWithBody: (
    name: string,
    dumpJs: boolean,
    code: string,
    canSuspend: boolean,
  ) => unknown;
  misceval: {
    asyncToPromise: (fn: () => unknown) => Promise<unknown>;
  };
  python3?: unknown;
  TurtleGraphics?: {
    target?: string;
    width?: number;
    height?: number;
  };
  execLimit?: number;
};

let skulptPromise: Promise<SkulptApi> | null = null;

function loadSkulpt(): Promise<SkulptApi> {
  if (!skulptPromise) {
    skulptPromise = import("skulpt").then((module) => {
      const loaded = ("default" in module ? module.default : module) as unknown;
      return loaded as SkulptApi;
    });
  }
  return skulptPromise;
}

/** Python source that needs the in-browser Turtle canvas rather than Judge0. */
export function isTurtlePythonCode(
  code: string,
  language?: string,
): boolean {
  const normalizedLanguage = (language ?? "").trim().toLowerCase();
  const isPython =
    normalizedLanguage === "python" ||
    normalizedLanguage === "python3" ||
    normalizedLanguage === "py";
  if (!isPython) return false;

  return (
    /(?:^|\n)\s*import\s+turtle(?:\s|$)/m.test(code) ||
    /(?:^|\n)\s*from\s+turtle\s+import(?:\s|$)/m.test(code)
  );
}

function readBuiltinFile(Sk: SkulptApi, path: string): string {
  const file = Sk.builtinFiles?.files?.[path];
  if (file === undefined) {
    throw new Error(`Skulpt module not found: ${path}`);
  }
  return file;
}

function appendOutput(logs: string[], pending: { value: string }, text: string) {
  pending.value += text;
  const lines = pending.value.split(/\r?\n/);
  pending.value = lines.pop() ?? "";
  for (const line of lines) {
    if (line.length > 0) logs.push(line);
  }
}

/**
 * Run Python turtle code in the browser and draw into an existing target.
 * Skulpt is deliberately limited to ten seconds to stop accidental endless loops.
 */
export async function executeTurtleCode(
  code: string,
  targetId: string,
): Promise<CodeRunResult> {
  const target = document.getElementById(targetId);
  if (!target) {
    return {
      logs: [],
      error: "The Turtle canvas is not ready. Please try running the code again.",
    };
  }

  target.replaceChildren();
  const logs: string[] = [];
  const pendingOutput = { value: "" };

  try {
    const Sk = await loadSkulpt();
    Sk.TurtleGraphics = {
      ...(Sk.TurtleGraphics ?? {}),
      target: targetId,
      width: Math.max(320, Math.min(target.clientWidth || 640, 900)),
      height: Math.max(260, Math.min(target.clientHeight || 420, 620)),
    };
    Sk.execLimit = 10_000;
    Sk.configure({
      output: (text: string) => appendOutput(logs, pendingOutput, text),
      read: (path: string) => readBuiltinFile(Sk, path),
      __future__: Sk.python3,
      execLimit: 10_000,
      inputfunTakesPrompt: true,
    });

    await Sk.misceval.asyncToPromise(() =>
      Sk.importMainWithBody("<stdin>", false, code, true),
    );

    if (pendingOutput.value) logs.push(pendingOutput.value);
    return { logs };
  } catch (error) {
    if (pendingOutput.value) logs.push(pendingOutput.value);
    const message =
      error instanceof Error ? error.message : String(error);
    return { logs, error: message };
  }
}
