import axiosInstance from "@/lib/axios";
import type { ApiEnvelope } from "@/api/subscription";

export type CourseProgressStatus = "not-started" | "ongoing" | "completed";

export type CourseProgressRecord = {
  courseSlug: string;
  status: CourseProgressStatus;
  progressPercent: number;
  currentLessonId: string | null;
  completedLessonIds: string[];
  lessonIndex: number | null;
  questionIndex: number | null;
  lessonStarted: boolean;
  canStartQuestions: boolean;
  clientUpdatedAt: number | null;
  updatedAt: string | null;
};

export type CourseProgressMap = Record<string, CourseProgressRecord>;

export type CourseProgressPutBody = {
  status?: CourseProgressStatus;
  progressPercent?: number;
  currentLessonId?: string | null;
  completedLessonIds?: string[];
  lessonIndex?: number | null;
  questionIndex?: number | null;
  lessonStarted?: boolean;
  canStartQuestions?: boolean;
  clientUpdatedAt: number;
};

export async function fetchAllCourseProgress() {
  const res = await axiosInstance.get<ApiEnvelope<CourseProgressMap>>(
    "/parent/courses/progress"
  );
  return res.data;
}

export async function fetchCourseProgress(courseSlug: string) {
  const res = await axiosInstance.get<ApiEnvelope<CourseProgressRecord>>(
    `/parent/courses/${encodeURIComponent(courseSlug)}/progress`
  );
  return res.data;
}

export async function upsertCourseProgress(
  courseSlug: string,
  body: CourseProgressPutBody
) {
  const res = await axiosInstance.put<ApiEnvelope<CourseProgressRecord>>(
    `/parent/courses/${encodeURIComponent(courseSlug)}/progress`,
    body
  );
  return res.data;
}
