import type {
  CurriculumV2Data,
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
