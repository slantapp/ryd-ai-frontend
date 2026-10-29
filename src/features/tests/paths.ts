import { PRIVATE_PATHS } from "@/utils/routePaths";

export const testIntroPath = (testId: number | string) => PRIVATE_PATHS.TEST_INTRO.replace(":testId", String(testId));

export const testAttemptPath = (testId: number | string, attemptId: number | string) =>
  PRIVATE_PATHS.TEST_ATTEMPT.replace(":testId", String(testId)).replace(":attemptId", String(attemptId));

export const testResultPath = (attemptId: number | string) =>
  PRIVATE_PATHS.TEST_RESULT.replace(":attemptId", String(attemptId));

export const coursePath = (slug: string) => `${PRIVATE_PATHS.COURSES}/${slug}`;

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) return `${Math.floor(m / 60)} h ${m % 60} min`;
  return m ? `${m} min ${s.toString().padStart(2, "0")} s` : `${s} s`;
}
