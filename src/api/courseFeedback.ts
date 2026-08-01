import type { AxiosError } from "axios";
import axiosInstance from "@/lib/axios";
import type { ApiEnvelope } from "@/api/subscription";

export type CourseFeedbackPayload = {
  curriculumId: number;
  comment: string;
  rating: number;
  courseSlug: string;
};

type ApiErrorData = {
  message?: unknown;
  error?: unknown;
};

export function getCourseFeedbackApiErrorMessage(
  err: unknown,
  fallback = "Could not send feedback. Please try again.",
) {
  const axiosError = err as AxiosError<ApiErrorData>;
  const responseData = axiosError.response?.data;
  const apiMessage = responseData?.message ?? responseData?.error;

  if (typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage;
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  return fallback;
}

export async function submitCourseFeedback(payload: CourseFeedbackPayload) {
  const res = await axiosInstance.post<ApiEnvelope<unknown>>(
    "/parent/courses/feedback",
    payload,
  );
  return res.data;
}
