import { IMAGE_LINE_PREFIX, WAITING_FOR_INPUT_MARKER } from "./instrument";

/** Marker so the console can hide the raw runner text behind “Show details”. */
export const RUN_DETAILS_PREFIX = "@@details@@";

export const TIME_LIMIT_MESSAGE =
  "Your program took too long. Check for a loop that never ends.";

export const MORE_INPUT_MESSAGE =
  "Your program is waiting for more input. Add another answer and run again.";

const PRINT_WORD: Record<string, string> = {
  javascript: "console.log",
  typescript: "console.log",
  python: "print",
  java: "System.out.println",
  kotlin: "println",
  c: "printf",
  cpp: "std::cout",
  csharp: "Console.WriteLine",
  go: "fmt.Println",
  rust: "println!",
  php: "echo",
  ruby: "puts",
  bash: "echo",
  lua: "print",
  perl: "print",
  swift: "print",
  dart: "print",
  sqlite: "a SELECT",
};

const NOISE =
  /node:internal|\/box\/|^\s+at\s|at Module\.|at Object\.|at async /i;

export function emptyOutputHint(language?: string): string {
  const word = PRINT_WORD[(language || "").toLowerCase()] ?? "a print statement";
  return `Your program ran, but didn't print anything. Add ${word} to show a result.`;
}

/** Trim each line end and drop one trailing blank line. */
export function normalizeProgramOutput(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n+$/, "").split("\n");
  return lines.map((line) => line.trimEnd()).join("\n");
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normalizeProgramOutput(actual) === normalizeProgramOutput(expected);
}

const LEARNER_DIAGNOSTIC =
  /didn't print anything|took too long|IndentationError|semicolon is missing|doesn.t own|format in scanf|not a mistake in your code|not available on this coding host|ReferenceError|TypeError|SyntaxError|NameError/i;

/** A console sentence about a run problem, not a line the program printed. */
export function learnerDiagnostic(lines: string[] | undefined): string | undefined {
  return (lines ?? []).find(
    (line) => !line.startsWith(RUN_DETAILS_PREFIX) && LEARNER_DIAGNOSTIC.test(line),
  );
}

/** Printed text only. Runner hints and status lines stay out of the comparison. */
export function programStdout(lines: string[] | undefined): string {
  return (lines ?? [])
    .filter((line) => {
      const text = line.trim();
      if (!text) return false;
      if (text === "(No output)" || text === "Example output") return false;
      if (text.startsWith(RUN_DETAILS_PREFIX) || text.startsWith("Error:")) return false;
      if (text.startsWith(IMAGE_LINE_PREFIX)) return false;
      if (/^[⏳✅❌✓✗⚠]/.test(text)) return false;
      if (learnerDiagnostic([text])) return false;
      return true;
    })
    .join("\n");
}

/** What the program printed, then what the lesson wanted. */
export function formatOutputMiss(actual: string, expected: string): string {
  const got = normalizeProgramOutput(actual);
  const want = normalizeProgramOutput(expected);
  const printed = got.length > 0 ? got : "(nothing)";
  const space =
    got.length > 0 && want.length > 0 && got.trim() === want.trim() && got !== want
      ? "\nThere is an extra space at the start of a line."
      : "";
  return `Your program printed:\n${printed}\nThe lesson wanted:\n${want}${space}`;
}

export function formatRowsMiss(actual: string, expectedRows: string[][]): string {
  const printed = normalizeProgramOutput(actual) || "(nothing)";
  const wanted = expectedRows.map((row) => row.join(" | ")).join("\n");
  return `Your query printed:\n${printed}\nThe lesson wanted:\n${wanted}`;
}

export const SQL_HOST_MESSAGE =
  "SQL is not available on this coding host yet. That is not a mistake in your code.";

export const HOST_FILES_MESSAGE =
  "This lesson needs extra files, and this coding host cannot run them yet. That is not a mistake in your code.";

/** 422 from Judge0: stop when extra files were rejected, otherwise retry without the rejected limits. */
export function judge0RejectionPlan(
  body: string,
  hadFiles: boolean,
): { limits: boolean; files: boolean; hostMessage?: string } {
  const filesRejected = /additional_files/.test(body);
  const limitsRejected = /cpu_time_limit|wall_time_limit|memory_limit/.test(body);
  if (filesRejected && hadFiles) {
    return { limits: false, files: false, hostMessage: HOST_FILES_MESSAGE };
  }
  return { limits: !limitsRejected, files: !filesRejected };
}

/** Shown when the lesson asked for a version the host list does not contain. */
export function versionHostNote(
  version: string | undefined,
  chosenName: string | undefined,
): string | undefined {
  const needle = version?.trim();
  if (!needle || !chosenName) return undefined;
  if (chosenName.toLowerCase().includes(needle.toLowerCase())) return undefined;
  return `This coding host does not list version ${needle}, so the lesson ran on ${chosenName}. That is not a mistake in your code.`;
}

/**
 * Keep the example's console lines when practice starts.
 * A web example that only posted "preview updated" stays as a short note,
 * because the page itself is still the example until Run.
 */
export function keepExampleOutput(
  lines: string[],
  options?: { holdPreview?: boolean },
): string[] {
  const body = lines.filter(
    (line) => line !== "Running the example…" && line !== "⏳ Running…",
  );
  if (body.length === 0) return [];
  if (body.length === 1 && body[0] === "✓ Preview updated.") {
    if (!options?.holdPreview) return [];
    return ["Example preview is still on the page. Tap Run to see your own page."];
  }
  if (body[0] === "Example output") return body;
  return ["Example output", ...body];
}

/** Turn a pipe table into one plain row per line. Other SQL text is left as printed. */
export function formatSqlTable(stdout: string): string[] {
  const lines = stdout
    .replace(/\r\n/g, "\n")
    .trimEnd()
    .split("\n")
    .filter((line) => !/^[\s|+-]+$/.test(line));
  if (!lines.some((line) => line.includes("|"))) return trimProgramOutput(stdout);
  return lines.map((line) =>
    line
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell, index, all) => {
        if (index === 0 && cell === "") return false;
        if (index === all.length - 1 && cell === "") return false;
        return true;
      })
      .join(" | "),
  );
}

export function trimProgramOutput(text: string, limit = 10000): string[] {
  const lines = text.replace(/\r\n/g, "\n").trimEnd().split("\n");
  const kept: string[] = [];
  let used = 0;
  for (const line of lines) {
    if (used + line.length > limit) {
      kept.push("output trimmed");
      break;
    }
    kept.push(line);
    used += line.length + 1;
  }
  return kept;
}

export function withRunDetails(summary: string, details: string): string[] {
  const clean = details.trim();
  if (!clean || clean === summary.trim()) return [summary];
  return [summary, `${RUN_DETAILS_PREFIX}${clean}`];
}

function firstLineNumber(raw: string): string | undefined {
  return (
    raw.match(/script\.js:(\d+)/)?.[1] ||
    raw.match(/\.java:(\d+)/i)?.[1] ||
    raw.match(/line (\d+)/i)?.[1] ||
    raw.match(/:(\d+):\d+/)?.[1]
  );
}

/**
 * One learner sentence from a compiler or runtime dump.
 * The raw text stays available behind the details marker.
 */
export function friendlyRunError(
  raw: string,
  language?: string,
): { summary: string; details: string } {
  const text = raw.replace(/\r\n/g, "\n").trim();
  const line = firstLineNumber(text);
  let summary = "";

  if (/IndentationError/i.test(text)) {
    summary = `IndentationError${line ? ` on line ${line}` : ""}: the lines inside an if must be indented by the same amount.`;
  } else if (/';'\s*expected/i.test(text)) {
    summary = `Line ${line ?? "?"}: a semicolon is missing at the end of the line.`;
  } else if (/Segmentation fault|SIGSEGV/i.test(text)) {
    summary = "Your program tried to use memory it doesn’t own.";
  } else if (
    /scanf|printf/i.test(text) &&
    /format|expects argument|too few arguments|too many arguments/i.test(text)
  ) {
    summary =
      "Check the % format in scanf or printf. It has to match the type of the value.";
  } else {
    const named = lastProgramError(text);
    if (named) {
      if (/^EOFError\b/.test(named.message)) {
        summary = MORE_INPUT_MESSAGE;
      } else {
        const at = named.line ?? line;
        summary = /line \d+/i.test(named.message) || !at
          ? named.message
          : `${named.message} (line ${at})`;
      }
    }
  }

  if (!summary) {
    const useful = text
      .split("\n")
      .map((item) => item.trim())
      .filter(
        (item) =>
          item &&
          !NOISE.test(item) &&
          !item.startsWith("^") &&
          !/^Traceback\b/i.test(item) &&
          !/^Runtime Error \([A-Z]+\)$/i.test(item),
      );
    // A compiler names the problem on its first "error" line. A runtime dump ends with it.
    summary =
      useful.find((item) => /\berror\b/i.test(item)) ||
      useful.at(-1) ||
      "The program stopped.";
    if (line && !summary.includes(line) && summary !== "The program stopped.") {
      summary = `${summary} (line ${line})`;
    }
  }

  summary = summary
    .replace(/\/box\/\S+/g, "")
    .replace(/Runtime Error \([A-Z]+\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if ((language || "").toLowerCase() === "python" && /TabError/i.test(text)) {
    summary = `TabError${line ? ` on line ${line}` : ""}: use spaces for the indent, and use the same number on each line.`;
  }

  return { summary: summary || "The program stopped.", details: text };
}

/** The last real error in a traceback, with the line number closest above it. */
export function lastProgramError(
  raw: string,
): { message: string; line?: string } | undefined {
  const text = raw.replace(/\r\n/g, "\n");
  const matches = [...text.matchAll(/^([A-Za-z_][\w.]*(?:Error|Exception):.*)$/gm)];
  const found = matches.at(-1);
  if (!found || found.index == null) return undefined;
  const before = text.slice(0, found.index);
  const line = [...before.matchAll(/line (\d+)/gi)].at(-1)?.[1];
  return { message: found[1].trim(), line };
}

export function isWaitingForInput(text: string): boolean {
  return (
    text.includes(WAITING_FOR_INPUT_MARKER) ||
    /EOFError|EOF when reading|NoSuchElementException|No line found/i.test(text)
  );
}

/** Keep whatever was printed, then the time-limit sentence. */
export function logsAfterTimeLimit(
  stdout?: string | null,
  stderr?: string | null,
  pictures: string[] = [],
): string[] {
  const printed = [
    ...(stdout?.trim() ? trimProgramOutput(stdout) : []),
    ...pictures,
    ...(stderr?.trim() ? trimProgramOutput(stderr) : []),
  ];
  return [...printed, TIME_LIMIT_MESSAGE];
}

/**
 * Put each typed answer on its question line.
 *
 * `cuts[i]` is how much the program had printed when it stopped to wait for
 * `answers[i]`. A program that prints the same text on every run puts each
 * answer right after its question. When a later run printed something else
 * first, for example a new random number, the text is returned as printed.
 */
export function interleaveAnswers(
  stdout: string,
  answers: string[],
  cuts: number[],
): string {
  let out = "";
  let from = 0;
  for (let index = 0; index < answers.length; index += 1) {
    const cut = cuts[index];
    if (cut == null || cut < from || cut > stdout.length) return stdout;
    out += `${stdout.slice(from, cut)}${answers[index]}\n`;
    from = cut;
  }
  return out + stdout.slice(from);
}

/** The text after the last line break: a question that is waiting for its answer. */
export function splitPendingLine(text: string): { lines: string[]; pending: string } {
  const normalized = text.replace(/\r\n/g, "\n");
  const end = normalized.lastIndexOf("\n");
  const pending = normalized.slice(end + 1);
  const body = end < 0 ? "" : normalized.slice(0, end);
  return {
    lines: end < 0 ? [] : body.split("\n"),
    pending,
  };
}
