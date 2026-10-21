import {
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

export type CodeTestSubmission = {
  /** Single-pane editor source (Python, Dart, legacy HTML-in-one-file, etc.). */
  code: string;
  /** HTML / CSS / JS panes when web workspace is active. */
  webCode?: WebCodeSources;
  language?: string;
};

export function resolveUseWebWorkspace(
  language: string | undefined,
  criteria: CodeTestCriteria | undefined,
): boolean {
  return isWebWorkspaceLanguage(language, criteria);
}

/**
 * Single entry point for code_test validation.
 * Web lessons check the matching pane; other languages use the unified code string.
 */
export function evaluateSubmissionCodeTest(
  submission: CodeTestSubmission,
  criteria: CodeTestCriteria | undefined,
  runLines?: string[],
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

  const language = graded ?? "javascript";
  const useWeb = resolveUseWebWorkspace(language, criteria);

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
): Promise<{ passed: boolean; testResults: CodeTestResult[] }> {
  const result = evaluateSubmissionCodeTest(submission, criteria, runLines);
  if (result.passed) return result;

  const language = resolveGradedLanguage(submission.language);
  if (!language) return result;
  const probe = buildFunctionProbe(submission.code, criteria, language);
  if (!probe || !criteria?.testCases?.length) return result;

  const executed = await executeStudentCode(probe, language);
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
  options?: { turtleTargetId?: string },
): Promise<string[]> {
  const graded = resolveGradedLanguage(submission.language);
  if (submission.language?.trim() && !graded) {
    return [`Error: Code execution is not supported for "${submission.language}".`];
  }
  const language = graded ?? normalizeRunLanguage(submission.language);
  if (resolveUseWebWorkspace(language, criteria)) {
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

  const result = await executeStudentCode(submission.code, language);
  return formatRunOutput(result);
}

export function submissionHasContent(
  submission: CodeTestSubmission,
  criteria: CodeTestCriteria | undefined,
): boolean {
  const language = normalizeRunLanguage(submission.language);
  if (resolveUseWebWorkspace(language, criteria)) {
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
