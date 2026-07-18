import {
  evaluateCodeTest,
  formatCodeTestResults,
  type CodeTestCriteria,
  type CodeTestResult,
} from "./codeTestValidation";
import { executeStudentCode, formatRunOutput } from "./runStudentCode";
import { normalizeRunLanguage } from "./codeExecution/languages";
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
): { passed: boolean; testResults: CodeTestResult[] } {
  const language = normalizeRunLanguage(submission.language);
  const useWeb = resolveUseWebWorkspace(language, criteria);

  if (useWeb && submission.webCode) {
    return evaluateWebCodeTest(submission.webCode, criteria);
  }

  return evaluateCodeTest(submission.code, criteria);
}

/** Judge0 execution for runnable languages; web previews run in-browser instead. */
export async function runSubmissionCodeOutput(
  submission: CodeTestSubmission,
  criteria: CodeTestCriteria | undefined,
  options?: { turtleTargetId?: string },
): Promise<string[]> {
  const language = normalizeRunLanguage(submission.language);
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
