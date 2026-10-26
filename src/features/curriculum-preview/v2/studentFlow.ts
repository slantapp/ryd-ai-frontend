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

/**
 * Beginner code questions get a third try when the lesson does not set a max:
 * the first miss is the authored hint, the second is what the program printed,
 * and the third shows the answer.
 */
export const BEGINNER_CODE_QUESTION_RETRY = 3;

export function resolveQuestionRetry(
  beat: QuestionBeat,
  curriculum: CurriculumV2Data,
): { max: number; hint?: string; on_exhausted: "continue" } {
  const fromBeat = beat.retry;
  const fromDefaults = curriculum.defaults?.question_retry;
  const beginnerCode =
    beat.question.type === "code_test" && curriculum.level === "Beginner";
  const fallback = beginnerCode
    ? BEGINNER_CODE_QUESTION_RETRY
    : DEFAULT_STUDENT_QUESTION_RETRY.max;

  const max = Math.max(
    0,
    fromBeat?.max ?? fromDefaults?.max ?? fallback,
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

/**
 * First miss speaks the lesson hint. Later misses, while tries remain,
 * speak the actual problem: the print, the error, or the page check.
 */
export function codeAttemptHint(input: {
  attempt: number;
  authoredHint?: string;
  runLines?: string[];
  failure?: string;
}): string | undefined {
  if (input.attempt < 2) return input.authoredHint;
  const failure = input.failure?.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
  const detail = (input.runLines ?? []).find((line) => {
    const text = line.trim();
    if (!text || text.startsWith("@@details@@")) return false;
    if (/^[⏳✅❌✓✗⚠]/.test(text)) return false;
    if (text === "Example output") return false;
    return true;
  });
  if (failure && /printed|wanted|query|preview|should print/i.test(failure)) return failure;
  if (
    detail &&
    /IndentationError|semicolon|memory|format|took too long|didn't print|not a mistake|not available/i.test(
      detail,
    )
  ) {
    return detail;
  }
  return failure || detail || input.authoredHint;
}
