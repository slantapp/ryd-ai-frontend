import {
  buildCallProbe,
  buildFunctionProbe,
  evaluateCodeTest,
  formatCodeTestResults,
  outputAgreesWithExpected,
  stdoutMatches,
  type CodeTestCriteria,
  type CodeTestResult,
} from "./codeTestValidation";
import { executeStudentCode, formatRunOutput } from "./runStudentCode";
import {
  formatOutputMiss,
  formatRowsMiss,
  interleaveAnswers,
  learnerDiagnostic,
  MORE_INPUT_MESSAGE,
  outputsMatch,
  programStdout,
  splitPendingLine,
  trimProgramOutput,
} from "./codeExecution/runFeedback";
import { canUseLiveInput } from "./programInput";
import type { CodeRunResult } from "./codeExecution/types";
import {
  normalizeRunLanguage,
  resolveGradedLanguage,
} from "./codeExecution/languages";
import {
  executeTurtleCode,
  isTurtlePythonCode,
  normalizeTurtleColor,
  TURTLE_STOPPED_MESSAGE,
} from "./codeExecution/turtle";
import {
  evaluateTurtleChecks,
  type TurtleRecord,
} from "./codeExecution/turtleChecks";
import {
  evaluateWebCodeTest,
  hasWebCodeContent,
  isWebWorkspaceLanguage,
  type WebCodeSources,
} from "./webCodeWorkspace";
import { hasPageChecks } from "./webPreviewBridge";

export type CodeTestSubmission = {
  /** Single-pane editor source (Python, Dart, legacy HTML-in-one-file, etc.). */
  code: string;
  /** HTML / CSS / JS panes when web workspace is active. */
  webCode?: WebCodeSources;
  language?: string;
  runtime?: string;
  version?: string;
  files?: Record<string, string>;
  setupSql?: string;
};

export function resolveUseWebWorkspace(
  language: string | undefined,
  criteria: CodeTestCriteria | undefined,
  runtime?: string,
): boolean {
  return isWebWorkspaceLanguage(language, criteria, runtime);
}

/**
 * Single entry point for code_test validation.
 * Web lessons check the matching pane; other languages use the unified code string.
 */
export function evaluateSubmissionCodeTest(
  submission: CodeTestSubmission,
  criteria: CodeTestCriteria | undefined,
  runLines?: string[],
  pageResults?: CodeTestResult[],
  turtle?: TurtleRecord,
): { passed: boolean; testResults: CodeTestResult[] } {
  if (criteria?.turtleChecks?.length) {
    const drawing = turtle
      ? evaluateTurtleChecks(turtle, criteria.turtleChecks, normalizeTurtleColor)
      : [{ test: "Run the drawing, then submit.", passed: false, plain: true as const }];
    const rest = { ...criteria, turtleChecks: undefined };
    const printed =
      typeof criteria.expectedOutput === "string" && criteria.expectedOutput.trim()
        ? evaluateSubmissionCodeTest(submission, rest, runLines, pageResults).testResults
        : [];
    const testResults = [...drawing, ...printed];
    return { passed: testResults.every((item) => item.passed), testResults };
  }

  const graded = resolveGradedLanguage(submission.language);
  if (submission.language?.trim() && !graded) {
    return {
      passed: false,
      testResults: [
        {
          test: `Cannot check answers for "${submission.language}".`,
          passed: false,
        },
      ],
    };
  }

  if (hasPageChecks(criteria)) {
    if (!pageResults?.length) {
      return {
        passed: false,
        testResults: [
          { test: "Run the preview, then submit.", passed: false, plain: true },
        ],
      };
    }
    return {
      passed: pageResults.every((result) => result.passed),
      testResults: pageResults.map((result) => ({ ...result, plain: true })),
    };
  }

  const language = graded ?? "javascript";
  const stdout = programStdout(runLines);

  if (typeof criteria?.expectedOutput === "string" && criteria.expectedOutput.trim()) {
    const passed = outputsMatch(stdout, criteria.expectedOutput);
    if (passed) {
      return {
        passed: true,
        testResults: [
          { test: "Your program printed the expected result", passed: true, plain: true },
        ],
      };
    }
    const diagnostic = learnerDiagnostic(runLines);
    const silent = !diagnostic || /didn't print anything/.test(diagnostic);
    return {
      passed: false,
      testResults: [
        {
          test:
            diagnostic && !stdout && !silent
              ? diagnostic
              : formatOutputMiss(stdout, criteria.expectedOutput),
          passed: false,
          plain: true,
        },
      ],
    };
  }

  if (criteria?.expectedRows?.length) {
    const actualRows = stdout
      .split("\n")
      .map((line) => line.split("|").map((cell) => cell.trim()).filter(Boolean))
      .filter((row) => row.length > 0);
    const passed = criteria.expectedRows.every((row, index) =>
      row.every((cell, cellIndex) => actualRows[index]?.[cellIndex] === cell.trim()),
    );
    return {
      passed,
      testResults: [
        {
          test: passed
            ? "The query returned the expected rows"
            : formatRowsMiss(stdout, criteria.expectedRows),
          passed,
          plain: true,
        },
      ],
    };
  }

  const useWeb = resolveUseWebWorkspace(language, criteria, submission.runtime);

  if (useWeb && submission.webCode) {
    return evaluateWebCodeTest(submission.webCode, criteria);
  }

  const result = evaluateCodeTest(submission.code, criteria, language);
  if (result.passed || !outputAgreesWithExpected(runLines, criteria)) {
    return result;
  }

  return {
    passed: true,
    testResults: [
      {
        test: "Your program printed the expected result",
        passed: true,
        actual: runLines?.filter((line) => line !== "(No output)").join("\n"),
        expected: criteria?.expectedCode ?? criteria?.expectedValue,
      },
    ],
  };
}

/** Source check, printed output, then a language probe for function test cases. */
export async function gradeSubmissionCodeTest(
  submission: CodeTestSubmission,
  criteria: CodeTestCriteria | undefined,
  runLines?: string[],
  pageResults?: CodeTestResult[],
  turtle?: TurtleRecord,
): Promise<{ passed: boolean; testResults: CodeTestResult[] }> {
  const result = evaluateSubmissionCodeTest(
    submission,
    criteria,
    runLines,
    pageResults,
    turtle,
  );
  if (result.passed) return result;
  if (
    criteria?.expectedOutput ||
    criteria?.expectedRows?.length ||
    criteria?.turtleChecks?.length ||
    hasPageChecks(criteria)
  ) {
    return result;
  }

  const language = resolveGradedLanguage(submission.language);
  if (!language) return result;
  const runOptions = {
    stdin: undefined as string | undefined,
    version: submission.version,
    files: submission.files,
    setupSql: submission.setupSql,
  };

  const callProbe = buildCallProbe(submission.code, criteria?.tests, language);
  if (callProbe && criteria?.tests?.length) {
    const executed = await executeStudentCode(callProbe, language, runOptions);
    const actual = executed.logs.filter((line) => !line.startsWith("@@details@@"));
    const tail = actual.slice(-criteria.tests.length);
    const passed =
      !executed.error &&
      criteria.tests.every((item, index) => outputsMatch(tail[index] ?? "", item.expect));
    if (passed) {
      return {
        passed: true,
        testResults: criteria.tests.map((item) => ({
          test: `${item.call} passed`,
          passed: true,
          plain: true,
        })),
      };
    }
    const diagnostic = learnerDiagnostic(actual);
    return {
      passed: false,
      testResults: [
        {
          test:
            executed.error || diagnostic
              ? diagnostic || executed.error || "The program stopped."
              : formatOutputMiss(
                  tail.join("\n"),
                  criteria.tests.map((item) => item.expect).join("\n"),
                ),
          passed: false,
          plain: true,
        },
      ],
    };
  }

  if (
    criteria?.tests?.length &&
    criteria.tests.every((item) => submission.code.includes(item.call))
  ) {
    const passed = criteria.tests.every((item) =>
      outputsMatch(
        (runLines ?? []).filter((line) => !line.startsWith("@@details@@")).join("\n"),
        item.expect,
      ) || (runLines ?? []).some((line) => outputsMatch(line, item.expect)),
    );
    if (passed) {
      return {
        passed: true,
        testResults: [{ test: "Your program printed the expected result", passed: true, plain: true }],
      };
    }
  }

  const probe = buildFunctionProbe(submission.code, criteria, language);
  if (!probe || !criteria?.testCases?.length) return result;

  const executed = await executeStudentCode(probe, language, runOptions);
  if (executed.error) return result;
  const actual = executed.logs.map((line) => line.trim()).filter(Boolean);
  const passed = criteria.testCases.every((testCase, index) =>
    stdoutMatches(actual[index] ?? "", testCase.expected, language),
  );
  if (!passed) return result;

  return {
    passed: true,
    testResults: criteria.testCases.map((testCase, index) => ({
      test: `Test case ${index + 1} passed`,
      passed: true,
      actual: actual[index],
      expected: testCase.expected,
    })),
  };
}

export type ProgramRun = {
  /** Console text, with each typed answer shown on its question line. */
  lines: string[];
  /** What the program printed, without those typed answers folded in. */
  raw: string[];
  /** What a turtle program drew, for `turtleChecks`. */
  turtle?: TurtleRecord;
};

/** A question the program printed, waiting for one typed answer in the console. */
export type ConsoleQuestion = {
  /** Text after the last line break, such as "Guess 1 to 10: ". */
  prompt: string;
  /** The lesson's answer for this read, when it gave one. */
  defaultValue: string;
};

const LIVE_ANSWER_LIMIT = 30;

export const TOO_MANY_ANSWERS_MESSAGE =
  "Your program asked for an answer 30 times, so it was stopped. Check the loop that asks for input.";

function programLines(result: CodeRunResult): string[] {
  if (result.waiting) return [...result.logs, MORE_INPUT_MESSAGE];
  return formatRunOutput(result);
}

/** Lines around the printed block: a host note before it, pictures and errors after it. */
function aroundPrinted(result: CodeRunResult): { before: string[]; after: string[] } {
  const printed = result.stdout?.trim() ? trimProgramOutput(result.stdout) : [];
  const start = printed.length ? result.logs.indexOf(printed[0]) : -1;
  if (start < 0) {
    const note = result.logs.filter((line) => /^This coding host /.test(line));
    return { before: note, after: result.logs.filter((line) => !note.includes(line)) };
  }
  return {
    before: result.logs.slice(0, start),
    after: result.logs.slice(start + printed.length),
  };
}

/** Console lines with typed answers placed after their questions. */
function linesWithAnswers(result: CodeRunResult, shown: string): string[] {
  const { before, after } = aroundPrinted(result);
  const body = shown.trim() ? trimProgramOutput(shown) : [];
  const tail = result.error ? [...after, `Error: ${result.error}`] : after;
  return [...before, ...body, ...tail];
}

/** Judge0 execution for runnable languages; web previews run in-browser instead. */
export async function runSubmissionCodeOutput(
  submission: CodeTestSubmission,
  criteria: CodeTestCriteria | undefined,
  options?: {
    turtleTargetId?: string;
    stdin?: string;
    version?: string;
    files?: Record<string, string>;
    setupSql?: string;
    /** Ask for one answer in the console. Null means the learner stopped. */
    askLine?: (question: ConsoleQuestion) => Promise<string | null>;
    /** Console lines while the program is still running or waiting. */
    onProgress?: (lines: string[]) => void;
  },
): Promise<ProgramRun | null> {
  const graded = resolveGradedLanguage(submission.language);
  if (submission.language?.trim() && !graded) {
    const message = `Error: Code execution is not supported for "${submission.language}".`;
    return { lines: [message], raw: [message] };
  }
  const language = graded ?? normalizeRunLanguage(submission.language);
  if (resolveUseWebWorkspace(language, criteria, submission.runtime)) {
    return { lines: [], raw: [] };
  }

  if (isTurtlePythonCode(submission.code, language)) {
    if (!options?.turtleTargetId) {
      const message = "Error: The Turtle canvas is not available.";
      return { lines: [message], raw: [message] };
    }
    const result = await executeTurtleCode(submission.code, options.turtleTargetId, {
      onOutput: options.onProgress,
    });
    const lines = formatRunOutput(result, "✓ Turtle drawing complete.");
    return { lines, raw: lines, turtle: result.turtle };
  }

  const execute = (stdin: string | undefined, live: boolean, seed?: number) =>
    executeStudentCode(submission.code, language, {
      stdin,
      version: options?.version ?? submission.version,
      files: options?.files ?? submission.files,
      setupSql: options?.setupSql ?? submission.setupSql,
      live,
      seed,
    });

  const askLine = options?.askLine;
  if (!askLine || !canUseLiveInput(submission.code, language)) {
    const result = await execute(options?.stdin, false);
    const lines = programLines(result);
    return { lines, raw: lines };
  }

  // Live input: run, and each time the program waits, ask in the console and
  // run again with every answer so far. The seed keeps random numbers the same.
  const seed = Math.floor(Math.random() * 2_000_000_000) + 1;
  const defaults = (options?.stdin ?? "").replace(/\r\n/g, "\n").split("\n");
  const answers: string[] = [];
  const cuts: number[] = [];
  for (;;) {
    const stdin = answers.length ? `${answers.join("\n")}\n` : "";
    const result = await execute(stdin, true, seed);
    const stdout = result.stdout ?? "";
    const shown = interleaveAnswers(stdout, answers, cuts);

    if (!result.waiting) {
      const lines = answers.length ? linesWithAnswers(result, shown) : programLines(result);
      return { lines, raw: programLines(result) };
    }
    if (answers.length >= LIVE_ANSWER_LIMIT) {
      const lines = [...linesWithAnswers({ ...result, waiting: false }, shown), TOO_MANY_ANSWERS_MESSAGE];
      return { lines, raw: [...formatRunOutput({ ...result, waiting: false }), TOO_MANY_ANSWERS_MESSAGE] };
    }

    const { lines: done, pending } = splitPendingLine(shown);
    const notes = aroundPrinted(result).before;
    options?.onProgress?.([...notes, ...done]);
    const value = await askLine({
      prompt: pending,
      defaultValue: defaults[answers.length] ?? "",
    });
    if (value === null) {
      options?.onProgress?.([...notes, ...done, ...(pending ? [pending] : []), TURTLE_STOPPED_MESSAGE]);
      return null;
    }
    const answer = value.replace(/\r?\n/g, " ");
    cuts.push(stdout.length);
    answers.push(answer);
    options?.onProgress?.([...notes, ...done, `${pending}${answer}`, "⏳ Running…"]);
  }
}

export function submissionHasContent(
  submission: CodeTestSubmission,
  criteria: CodeTestCriteria | undefined,
): boolean {
  const language = normalizeRunLanguage(submission.language);
  if (resolveUseWebWorkspace(language, criteria, submission.runtime)) {
    return submission.webCode ? hasWebCodeContent(submission.webCode) : false;
  }
  if (submission.webCode && !submission.code.trim()) {
    return hasWebCodeContent(submission.webCode);
  }
  return submission.code.trim().length > 0;
}
export function buildTryCodeResultLines(
  runOutput: string[],
  passed: boolean,
  testResults: CodeTestResult[],
  options?: { web?: boolean },
): string[] {
  const webHint = options?.web
    ? passed
      ? "✓ Tests passed — submit when you are ready."
      : "✗ Tests failed — check your HTML, CSS, and JavaScript."
    : passed
      ? "✓ Tests passed — submit when you are ready."
      : "✗ Tests failed — adjust your code and try again.";

  return [...runOutput, ...formatCodeTestResults(testResults), webHint];
}

export function buildSubmitCodeResultLines(
  runOutput: string[],
  passed: boolean,
  testResults: CodeTestResult[],
): string[] {
  return [
    ...runOutput,
    ...formatCodeTestResults(testResults),
    passed ? "✓ Test passed!" : "✗ Test failed. Check your code and try again.",
  ];
}
