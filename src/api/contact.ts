import type { AxiosError } from "axios";
import axiosInstance from "@/lib/axios";

type ApiEnvelope<T> = {
  status: boolean;
  message?: string;
  data?: T;
};

type ApiErrorData = {
  message?: unknown;
  error?: unknown;
  data?: unknown;
};

export type CourseRequestPayload = {
  name: string;
  courseRequest: string;
  description?: string;
};

export type SendMessagePayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export function getContactApiErrorMessage(
  err: unknown,
  fallback = "Request failed. Please try again.",
) {
  const axiosError = err as AxiosError<ApiErrorData>;
  const responseData = axiosError.response?.data;
  const apiMessage =
    responseData?.message ?? responseData?.error ?? responseData?.data;

  if (typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage;
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  return fallback;
}

export async function requestCourse(payload: CourseRequestPayload) {
  const res = await axiosInstance.post<ApiEnvelope<unknown>>(
    "/common/contact/request-course",
    payload,
  );
  return res.data;
}

export async function sendContactMessage(payload: SendMessagePayload) {
  const res = await axiosInstance.post<ApiEnvelope<unknown>>(
    "/common/contact/send-message",
    payload,
  );
  return res.data;
}
