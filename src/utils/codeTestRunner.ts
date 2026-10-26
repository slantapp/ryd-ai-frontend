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
  learnerDiagnostic,
  outputsMatch,
  programStdout,
} from "./codeExecution/runFeedback";
import {
  normalizeRunLanguage,
  resolveGradedLanguage,
} from "./codeExecution/languages";
import {
  executeTurtleCode,
  isTurtlePythonCode,
} from "./codeExecution/turtle";
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
): { passed: boolean; testResults: CodeTestResult[] } {
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
): Promise<{ passed: boolean; testResults: CodeTestResult[] }> {
  const result = evaluateSubmissionCodeTest(
    submission,
    criteria,
    runLines,
    pageResults,
  );
  if (result.passed) return result;
  if (criteria?.expectedOutput || criteria?.expectedRows?.length || hasPageChecks(criteria)) {
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
  },
): Promise<string[]> {
  const graded = resolveGradedLanguage(submission.language);
  if (submission.language?.trim() && !graded) {
    return [`Error: Code execution is not supported for "${submission.language}".`];
  }
  const language = graded ?? normalizeRunLanguage(submission.language);
  if (resolveUseWebWorkspace(language, criteria, submission.runtime)) {
    return [];
  }

  if (isTurtlePythonCode(submission.code, language)) {
    if (!options?.turtleTargetId) {
      return ["Error: The Turtle canvas is not available."];
    }
    const result = await executeTurtleCode(
      submission.code,
      options.turtleTargetId,
    );
    return formatRunOutput(result, "✓ Turtle drawing complete.");
  }

  const result = await executeStudentCode(submission.code, language, {
    stdin: options?.stdin,
    version: options?.version ?? submission.version,
    files: options?.files ?? submission.files,
    setupSql: options?.setupSql ?? submission.setupSql,
  });
  return formatRunOutput(result);
}

export function submissionHasContent(
  submission: CodeTestSubmission,
  criteria: CodeTestCriteria | undefined,
): boolean {
  const language = normalizeRunLanguage(submission.language);
  if (resolveUseWebWorkspace(language, criteria, submission.runtime)) {
    return submission.webCode ? hasWebCodeContent(submission.webCode) : false;
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
