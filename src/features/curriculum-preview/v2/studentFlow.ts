import type {
  CurriculumV2Data,
  Question,
  QuestionBeat,
  QuestionRetry,
} from "./types";

/** Student simulation default: 2 wrong tries, then continue. */
export const DEFAULT_STUDENT_QUESTION_RETRY: Required<
  Pick<QuestionRetry, "max" | "on_exhausted">
> &
  QuestionRetry = {
  max: 2,
  on_exhausted: "continue",
};

export function resolveQuestionRetry(
  beat: QuestionBeat,
  curriculum: CurriculumV2Data,
): { max: number; hint?: string; on_exhausted: "continue" } {
  const fromBeat = beat.retry;
  const fromDefaults = curriculum.defaults?.question_retry;

  const max = Math.max(
    0,
    fromBeat?.max ??
      fromDefaults?.max ??
      DEFAULT_STUDENT_QUESTION_RETRY.max,
  );

  return {
    max,
    hint: fromBeat?.hint ?? fromDefaults?.hint,
    on_exhausted:
      fromBeat?.on_exhausted ??
      fromDefaults?.on_exhausted ??
      DEFAULT_STUDENT_QUESTION_RETRY.on_exhausted,
  };
}

/**
 * Teaching lines after wrong attempts are exhausted.
 * Prefer instructional demo/example explanations over question.explanation,
 * which authors sometimes write as success celebrations ("You built…").
 */
export function resolveExhaustedWrongTeachingLines(
  question: Question,
): string[] {
  if (question.type === "code_test") {
    const demoTeach = question.code_example?.explanation?.trim();
    if (demoTeach) {
      return [`Here's how it should work. ${demoTeach}`];
    }
  }

  if (question.type === "formula_test") {
    const formulaTeach = question.formula_example?.explanation?.trim();
    if (formulaTeach) {
      return [`Here's how it should work. ${formulaTeach}`];
    }
  }

  const explanation = question.explanation?.trim();
  if (!explanation) return [];

  // Avoid speaking success-phrased copy after a failed attempt.
  if (/^\s*you (made|built|did|put|finished|added)\b/i.test(explanation)) {
    return [
      "Let's look at the correct approach together, then keep learning.",
    ];
  }

  return [`Here's the idea. ${explanation}`];
}
