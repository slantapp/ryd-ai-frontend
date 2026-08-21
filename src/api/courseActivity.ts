import axiosInstance from "@/lib/axios";
import type { ApiEnvelope } from "@/api/subscription";

export type CourseActivityBody = {
  /** Seconds spent since the previous activity report (0 when opening a new session). */
  deltaSeconds: number;
  /** True when starting (or restarting) a learning session for this course. */
  newSession: boolean;
};

/**
 * Report time spent on a parent course (`POST /parent/courses/:courseSlug/activity`).
 */
export async function reportCourseActivity(
  courseSlug: string,
  body: CourseActivityBody,
) {
  const res = await axiosInstance.post<ApiEnvelope<unknown>>(
    `/parent/courses/${encodeURIComponent(courseSlug)}/activity`,
    body,
  );
  return res.data;
}
