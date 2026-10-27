import type { CodeRunResult } from "./types";
import { TIME_LIMIT_MESSAGE } from "./runFeedback";
import {
  emptyTurtleRecord,
  plainColor,
  type TurtleRecord,
} from "./turtleChecks";

type SkulptApi = {
  builtinFiles?: { files?: Record<string, string> };
  builtin?: { TimeLimitError?: new (...args: unknown[]) => unknown };
  configure: (options: Record<string, unknown>) => void;
  importMainWithBody: (
    name: string,
    dumpJs: boolean,
    code: string,
    canSuspend: boolean,
  ) => unknown;
  misceval: {
    asyncToPromise: (
      fn: () => unknown,
      handlers?: Record<string, (suspension: SkulptSuspension) => Promise<unknown> | undefined>,
    ) => Promise<unknown>;
  };
  python3?: unknown;
  TurtleGraphics?: TurtleGraphicsConfig;
  execLimit?: number;
  /** Skulpt stores a Date here when the program starts. */
  execStart?: number | Date;
  uncaughtException?: (error: unknown) => void;
};

type SkulptSuspension = {
  data: { type: string; promise?: Promise<unknown>; result?: unknown; error?: unknown };
  resume: () => unknown;
};

type TurtleHooks = {
  move?: (event: { down: boolean; circle: boolean; length: number; color: string }) => void;
  fill?: (color: string) => void;
  dot?: (color: string) => void;
  text?: (event: { message: string; color: string }) => void;
  mainloop?: () => Promise<void>;
  idle?: () => void;
  exit?: () => void;
};

type TurtleGraphicsConfig = {
  target?: string;
  width?: number;
  height?: number;
  ryd?: TurtleHooks;
  stop?: () => void;
  pending?: () => boolean;
  final?: () => { x: number; y: number; heading: number } | undefined;
};

export type TurtleRunResult = CodeRunResult & {
  turtle?: TurtleRecord;
  /** The learner pressed Stop. */
  stopped?: boolean;
};

/** Size of the drawing in turtle steps. The panel scales it to fit and keeps its shape. */
export const TURTLE_CANVAS_SIZE = { width: 800, height: 600 } as const;
/** Computing time for the program before done(). Waiting for animation does not count. */
const PROGRAM_TIME_LIMIT_MS = 5_000;
/** How long done() keeps timers, keys, and clicks working before the run ends. */
export const TURTLE_WAIT_LIMIT_MS = 60_000;

export const TURTLE_WAIT_LIMIT_MESSAGE =
  "The turtle program stopped after 60 seconds.";
export const TURTLE_STOPPED_MESSAGE = "Stopped.";

let skulptPromise: Promise<SkulptApi> | null = null;
let turtleSourcePromise: Promise<string> | null = null;

function loadSkulpt(): Promise<SkulptApi> {
  if (!skulptPromise) {
    skulptPromise = import("skulpt").then((module) => {
      const loaded = ("default" in module ? module.default : module) as unknown;
      return loaded as SkulptApi;
    });
  }
  return skulptPromise;
}

/** Skulpt's turtle module with RYD fixes (see skulptTurtle.js). */
function loadTurtleSource(): Promise<string> {
  if (!turtleSourcePromise) {
    turtleSourcePromise = import("./skulptTurtle.js?raw").then((module) => module.default);
  }
  return turtleSourcePromise;
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

let colorContext: CanvasRenderingContext2D | null | undefined;

/** One spelling per colour, so "red", "#f00", and (255, 0, 0) compare equal. */
export function normalizeTurtleColor(value: string): string {
  if (typeof document === "undefined") return plainColor(value);
  if (colorContext === undefined) {
    colorContext = document.createElement("canvas").getContext("2d");
  }
  if (!colorContext) return plainColor(value);
  const text = String(value ?? "").replace(/\s+/g, "");
  const sentinel = "#010203";
  colorContext.fillStyle = sentinel;
  colorContext.fillStyle = text;
  const read = String(colorContext.fillStyle);
  if (read === sentinel && plainColor(text) !== sentinel) return plainColor(text);
  return plainColor(read);
}

type ActiveRun = { stop: () => void };
let active: ActiveRun | null = null;
const runListeners = new Set<() => void>();

function setActive(run: ActiveRun | null) {
  active = run;
  runListeners.forEach((listener) => listener());
}

/** For a Stop button: true while a turtle program runs or waits in done(). */
export function isTurtleRunning(): boolean {
  return active !== null;
}

export function subscribeTurtleRunning(listener: () => void): () => void {
  runListeners.add(listener);
  return () => {
    runListeners.delete(listener);
  };
}

export function stopTurtleProgram(): void {
  active?.stop();
}

function appendOutput(logs: string[], pending: { value: string }, text: string) {
  pending.value += text;
  const lines = pending.value.split(/\r?\n/);
  pending.value = lines.pop() ?? "";
  for (const line of lines) logs.push(line);
}

function isTimeLimit(error: unknown): boolean {
  return /TimeLimitError|exceeded run time limit/i.test(String(error));
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Run Python turtle code in the browser and draw into an existing target.
 *
 * The program body has five seconds of computing time; waiting for the turtle
 * to animate does not count. At turtle.done(), or at the end of the program,
 * the run stays alive while a timer is pending or a key or click handler is
 * set, until Stop or sixty seconds. Printed lines reach `onOutput` as they
 * appear, including lines printed by timer callbacks.
 */
export async function executeTurtleCode(
  code: string,
  targetId: string,
  options?: { onOutput?: (lines: string[]) => void },
): Promise<TurtleRunResult> {
  active?.stop();

  const target = document.getElementById(targetId);
  if (!target) {
    return {
      logs: [],
      error: "The Turtle canvas is not ready. Please try running the code again.",
    };
  }

  const logs: string[] = [];
  const pendingOutput = { value: "" };
  const record = emptyTurtleRecord();
  const colors = new Set<string>();
  const addColor = (value: string | undefined) => {
    if (value) colors.add(normalizeTurtleColor(value));
  };

  let finished = false;
  let stopped = false;
  let waitTimedOut = false;
  let callbackError: unknown;
  let waiting: { resolve: () => void; timer: number } | null = null;
  let settle: (result: TurtleRunResult) => void = () => undefined;
  const outcome = new Promise<TurtleRunResult>((resolve) => {
    settle = resolve;
  });

  const shownLines = () =>
    pendingOutput.value ? [...logs, pendingOutput.value] : [...logs];

  let Sk: SkulptApi | undefined;

  const endWait = () => {
    if (!waiting) return;
    window.clearTimeout(waiting.timer);
    const { resolve } = waiting;
    waiting = null;
    if (Sk && !stopped) {
      Sk.execStart = Date.now();
      Sk.execLimit = PROGRAM_TIME_LIMIT_MS;
    }
    resolve();
  };

  const finish = (error?: unknown) => {
    if (finished) return;
    finished = true;
    endWait();
    if (active === run) setActive(null);
    try {
      Sk?.TurtleGraphics?.stop?.();
    } catch {
      // The canvas may already be gone.
    }
    const final = Sk?.TurtleGraphics?.final?.();
    if (final) {
      record.end = { x: final.x, y: final.y };
      record.heading = final.heading;
    }
    record.colors = [...colors];

    const lines = shownLines();
    const problem = error ?? callbackError;
    if (stopped) {
      settle({ logs: [...lines, TURTLE_STOPPED_MESSAGE], turtle: record, stopped: true });
    } else if (problem && isTimeLimit(problem)) {
      settle({ logs: [...lines, TIME_LIMIT_MESSAGE], turtle: record });
    } else if (problem) {
      settle({ logs: lines, error: errorText(problem), turtle: record });
    } else if (waitTimedOut) {
      settle({ logs: [...lines, TURTLE_WAIT_LIMIT_MESSAGE], turtle: record });
    } else {
      settle({ logs: lines, turtle: record });
    }
  };

  const run: ActiveRun = {
    stop: () => {
      if (finished) return;
      stopped = true;
      // Any Python code still running stops at its next time check.
      if (Sk) Sk.execLimit = 0;
      finish();
    },
  };
  setActive(run);

  /** Wait while a timer, key, or click can still change the drawing. */
  let waited = false;
  const waitForEvents = (): Promise<void> => {
    if (finished || !Sk || waiting || waited) return Promise.resolve();
    if (!Sk.TurtleGraphics?.pending?.()) return Promise.resolve();
    waited = true;
    Sk.execStart = Date.now();
    Sk.execLimit = TURTLE_WAIT_LIMIT_MS;
    return new Promise<void>((resolve) => {
      waiting = {
        resolve,
        timer: window.setTimeout(() => {
          waitTimedOut = true;
          endWait();
        }, TURTLE_WAIT_LIMIT_MS),
      };
    });
  };

  const hooks: TurtleHooks = {
    move: (event) => {
      if (!event.down || event.length < 1e-9) return;
      if (!event.circle) record.linesDrawn += 1;
      addColor(event.color);
    },
    fill: (color) => {
      record.filled = true;
      addColor(color);
    },
    dot: (color) => addColor(color),
    text: (event) => {
      record.texts.push(event.message);
      addColor(event.color);
    },
    mainloop: waitForEvents,
    idle: () => {
      if (waiting && !Sk?.TurtleGraphics?.pending?.()) endWait();
    },
    exit: () => endWait(),
  };

  try {
    const [skulpt, turtleSource] = await Promise.all([loadSkulpt(), loadTurtleSource()]);
    Sk = skulpt;
    if (finished) return outcome;
    target.replaceChildren();

    // Keep one config object: the turtle module holds on to it between runs.
    Sk.TurtleGraphics = Object.assign(Sk.TurtleGraphics ?? {}, {
      target: targetId,
      width: TURTLE_CANVAS_SIZE.width,
      height: TURTLE_CANVAS_SIZE.height,
      ryd: hooks,
    });
    Sk.configure({
      output: (text: string) => {
        if (finished) return;
        appendOutput(logs, pendingOutput, text);
        options?.onOutput?.(shownLines());
      },
      read: (path: string) => {
        if (path === "src/lib/turtle.js") return turtleSource;
        const file = Sk?.builtinFiles?.files?.[path];
        if (file === undefined) throw new Error(`Skulpt module not found: ${path}`);
        return file;
      },
      __future__: Sk.python3,
      execLimit: PROGRAM_TIME_LIMIT_MS,
      yieldLimit: 100,
      inputfunTakesPrompt: true,
    });
    Sk.execLimit = PROGRAM_TIME_LIMIT_MS;
    Sk.uncaughtException = (error: unknown) => {
      if (finished) return;
      callbackError = error;
      endWait();
    };

    // Time spent waiting for the turtle to animate, sleep, or done() is not computing time.
    const skulptApi = Sk;
    const waitWithoutTheClock = (suspension: SkulptSuspension) => {
      const promise = suspension.data.promise;
      if (!promise) return undefined;
      const started = Date.now();
      const resume = () => {
        if (skulptApi.execStart !== undefined) {
          skulptApi.execStart = Number(skulptApi.execStart) + (Date.now() - started);
        }
        return suspension.resume();
      };
      return promise.then(
        (value) => {
          suspension.data.result = value;
          return resume();
        },
        (error) => {
          suspension.data.error = error;
          return resume();
        },
      );
    };

    const program = Sk.misceval.asyncToPromise(
      () => skulptApi.importMainWithBody("<stdin>", false, code, true),
      { "Sk.promise": waitWithoutTheClock },
    );
    program.then(
      async () => {
        if (finished) return;
        // A program that sets a timer and ends without done() still runs its timer.
        await waitForEvents();
        if (pendingOutput.value) {
          logs.push(pendingOutput.value);
          pendingOutput.value = "";
        }
        finish();
      },
      (error) => {
        if (pendingOutput.value) {
          logs.push(pendingOutput.value);
          pendingOutput.value = "";
        }
        finish(error);
      },
    );
  } catch (error) {
    finish(error);
  }

  return outcome;
}
