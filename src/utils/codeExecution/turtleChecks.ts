/**
 * Lesson checks for a turtle drawing. A drawing prints nothing, so the runner
 * records what the turtle did and Submit compares that record with
 * `testCriteria.turtleChecks`, for example:
 *
 *   [{ "linesDrawn": 4 }, { "endsAt": [0, 0], "tolerance": 2 }, { "heading": 0 },
 *    { "colorUsed": "blue" }, { "filled": true }, { "textWritten": "Score: 3" }]
 *
 * A check can press keys first (on Submit, once the program reaches done()):
 *
 *   { "keys": ["Right", "Right"], "then": { "textWritten": "Score: 2" } }
 *
 * Keyed checks press their keys in list order, on one run, so later checks see earlier presses.
 * Checks without keys look at the drawing as it was before any key was pressed.
 */

export type TurtleCheck = TurtleDrawingCheck & {
  /** Keys to press first, in order ("Right", "space", "a"). */
  keys?: string[];
  /** What must be true after the keys. */
  then?: TurtleDrawingCheck;
};

export type TurtleDrawingCheck = {
  linesDrawn?: number;
  endsAt?: [number, number];
  heading?: number;
  colorUsed?: string;
  filled?: boolean;
  textWritten?: string;
  /** Distance for `endsAt`, degrees for `heading`. Defaults to 1. */
  tolerance?: number;
};

export type TurtleRecord = {
  /** Straight lines drawn with the pen down. Circles and dots are not lines. */
  linesDrawn: number;
  /** Colours of lines, circles, dots, fills, and text, already normalised. */
  colors: string[];
  filled: boolean;
  texts: string[];
  /** Where the turtle that moved last stopped. */
  end?: { x: number; y: number };
  heading?: number;
  /** When checks pressed keys: the drawing before the first key. */
  beforeKeys?: TurtleRecord;
  /** When checks pressed keys: the drawing after each keyed check's keys, in check order. */
  afterKeys?: TurtleRecord[];
};

/** The key list of each keyed check, in order (what the runner presses on Submit). */
export function turtleKeySteps(checks: TurtleCheck[] | undefined): string[][] {
  return (checks ?? [])
    .filter((check) => check && Array.isArray(check.keys) && check.keys.length > 0)
    .map((check) => check.keys!.map(String));
}

export type TurtleCheckResult = { test: string; passed: boolean; plain: true };

export function emptyTurtleRecord(): TurtleRecord {
  return { linesDrawn: 0, colors: [], filled: false, texts: [] };
}

const NAMED: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  lime: "#00ff00",
  blue: "#0000ff",
  yellow: "#ffff00",
  orange: "#ffa500",
  purple: "#800080",
  pink: "#ffc0cb",
  brown: "#a52a2a",
  gray: "#808080",
  grey: "#808080",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  gold: "#ffd700",
  navy: "#000080",
  violet: "#ee82ee",
  lightblue: "#add8e6",
  darkgreen: "#006400",
  skyblue: "#87ceeb",
};

function hex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}

/** Colour text as "#rrggbb" where it can be read without a browser. */
export function plainColor(value: string): string {
  const text = String(value ?? "").toLowerCase().replace(/\s+/g, "");
  if (NAMED[text]) return NAMED[text];
  const short = text.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  if (/^#[0-9a-f]{6}$/.test(text)) return text;
  const rgb = text.match(/^rgba?\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?:,[\d.]+)?\)$/);
  if (rgb) return `#${hex(Number(rgb[1]))}${hex(Number(rgb[2]))}${hex(Number(rgb[3]))}`;
  return text;
}

function round(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function angleGap(a: number, b: number): number {
  const gap = Math.abs((((a - b) % 360) + 360) % 360);
  return Math.min(gap, 360 - gap);
}

export function evaluateTurtleChecks(
  record: TurtleRecord,
  checks: TurtleCheck[],
  normalizeColor: (value: string) => string = plainColor,
): TurtleCheckResult[] {
  const results: TurtleCheckResult[] = [];
  let keyed = 0;
  for (const check of checks) {
    if (!check || typeof check !== "object") continue;
    if (Array.isArray(check.keys) && check.keys.length > 0) {
      const after = record.afterKeys?.[keyed];
      keyed += 1;
      if (!after) {
        results.push({ test: `Submit to check what pressing ${check.keys.join(", ")} does.`, passed: false, plain: true });
        continue;
      }
      results.push(...evaluateDrawingChecks(after, [check.then ?? {}], normalizeColor));
      continue;
    }
    results.push(...evaluateDrawingChecks(record.beforeKeys ?? record, [check], normalizeColor));
  }
  return results;
}

function evaluateDrawingChecks(
  record: TurtleRecord,
  checks: TurtleDrawingCheck[],
  normalizeColor: (value: string) => string,
): TurtleCheckResult[] {
  const results: TurtleCheckResult[] = [];
  const add = (passed: boolean, yes: string, no: string) =>
    results.push({ test: passed ? yes : no, passed, plain: true });

  for (const check of checks) {
    if (!check || typeof check !== "object") continue;
    const tolerance = typeof check.tolerance === "number" ? Math.abs(check.tolerance) : 1;

    if (typeof check.linesDrawn === "number") {
      const want = check.linesDrawn;
      const got = record.linesDrawn;
      add(
        got === want,
        `The turtle drew ${want} ${want === 1 ? "line" : "lines"}.`,
        `The turtle should draw ${want} ${want === 1 ? "line" : "lines"}. It drew ${got}.`,
      );
    }

    if (Array.isArray(check.endsAt) && check.endsAt.length >= 2) {
      const [x, y] = check.endsAt.map(Number);
      const end = record.end;
      const passed = Boolean(end) && Math.hypot(end!.x - x, end!.y - y) <= tolerance;
      add(
        passed,
        `The turtle ended at (${x}, ${y}).`,
        end
          ? `The turtle should end at (${x}, ${y}). It ended at (${round(end.x)}, ${round(end.y)}).`
          : `The turtle should end at (${x}, ${y}). It did not move.`,
      );
    }

    if (typeof check.heading === "number") {
      const want = check.heading;
      const got = record.heading ?? 0;
      add(
        angleGap(got, want) <= tolerance,
        `The turtle faces ${want} degrees at the end.`,
        `The turtle should face ${want} degrees at the end. It faces ${round(got)}.`,
      );
    }

    if (typeof check.colorUsed === "string" && check.colorUsed.trim()) {
      const want = normalizeColor(check.colorUsed.trim());
      const used = record.colors.some((color) => color === want);
      add(used, `The drawing uses ${check.colorUsed.trim()}.`, `The drawing should use ${check.colorUsed.trim()}.`);
    }

    if (typeof check.filled === "boolean") {
      add(
        record.filled === check.filled,
        check.filled ? "The drawing has a filled shape." : "The drawing has no filled shape.",
        check.filled
          ? "The drawing should have a filled shape. Use begin_fill() before the shape and end_fill() after it."
          : "The drawing should not fill a shape.",
      );
    }

    if (typeof check.textWritten === "string") {
      const want = check.textWritten.trim();
      add(
        record.texts.some((text) => text.trim() === want),
        `The turtle wrote “${want}”.`,
        record.texts.length
          ? `The turtle should write “${want}”. It wrote “${record.texts.at(-1)!.trim()}”.`
          : `The turtle should write “${want}”. Use write() to show it.`,
      );
    }
  }

  return results;
}
