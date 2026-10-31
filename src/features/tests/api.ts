import axiosInstance from "@/lib/axios";
import type { ApiEnvelope } from "@/api/subscription";
import type {
  AnswerResponse,
  AttemptResult,
  AttemptView,
  LearnerTestCard,
  LearnerTestDetail,
  ResultHistoryRow,
} from "./types";

export async function fetchVisibleTests() {
  const res = await axiosInstance.get<ApiEnvelope<LearnerTestCard[]>>("/parent/ai-test/visible");
  return res.data.data;
}

export async function fetchTest(testId: number | string) {
  const res = await axiosInstance.get<ApiEnvelope<LearnerTestDetail>>(`/parent/ai-test/${testId}`);
  return res.data.data;
}

/** Starts a new attempt, or returns the open one (`resumed: true`). */
export async function startAttempt(testId: number | string) {
  const res = await axiosInstance.post<ApiEnvelope<{ attemptId: number; resumed: boolean }>>(
    `/parent/ai-test/${testId}/attempt`,
  );
  return res.data.data;
}

export async function fetchAttempt(attemptId: number | string) {
  const res = await axiosInstance.get<ApiEnvelope<AttemptView>>(`/parent/ai-test/attempt/${attemptId}`);
  return res.data.data;
}

export async function answerQuestion(attemptId: number | string, questionId: number, value: unknown) {
  const res = await axiosInstance.post<ApiEnvelope<AnswerResponse>>(
    `/parent/ai-test/attempt/${attemptId}/answer`,
    { questionId, value },
  );
  return res.data.data;
}

export async function submitAttempt(attemptId: number | string) {
  const res = await axiosInstance.post<ApiEnvelope<AttemptResult>>(`/parent/ai-test/attempt/${attemptId}/submit`);
  return res.data.data;
}

export async function fetchResult(attemptId: number | string) {
  const res = await axiosInstance.get<ApiEnvelope<AttemptResult>>(`/parent/ai-test/attempt/${attemptId}/result`);
  return res.data.data;
}

export async function fetchResultHistory() {
  const res = await axiosInstance.get<ApiEnvelope<ResultHistoryRow[]>>("/parent/ai-test/results");
  return res.data.data;
}

/** Message from an API error envelope, or a fallback. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { message?: unknown } } };
  const msg = e?.response?.data?.message;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

export function apiErrorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}
