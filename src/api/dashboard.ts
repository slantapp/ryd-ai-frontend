import axiosInstance from "@/lib/axios";
import type { ApiEnvelope } from "@/api/subscription";
import type { LearningStats } from "@/api/learningStats";

/** One ongoing course, with the lesson to resume (named from the course JSON on the server). */
export type DashboardResume = {
  slug: string;
  title: string;
  lessonNumber: number;
  lessonCount: number;
  lessonTitle: string | null;
  progress: number;
  lastActiveAt: string | null;
};

export type DashboardPath = {
  id: number;
  slug: string;
  title: string;
  icon: string | null;
  completedLessons: number;
  totalLessons: number;
  percent: number;
  currentUnit: string | null;
  nextCourse: { slug: string; title: string } | null;
  started: boolean;
  finished: boolean;
};

export type DashboardTestResult = {
  attemptId: number;
  testTitle: string | null;
  courseTitle: string | null;
  grade: string | null;
  percent: number;
  passed: boolean | null;
  submittedAt: string | null;
};

export type DashboardTestSuggestion = {
  testId: number;
  title: string;
  courseSlug: string | null;
  courseTitle: string | null;
  questionCount: number | null;
  timeLimitMinutes: number | null;
  openAttemptId: number | null;
  reason: "resume" | "finished_course" | "taking_course";
};

export type DashboardRecommendation = {
  slug: string;
  reason: "next_in_path" | "next_level" | "same_category" | "start_here";
  /** Path title, finished course title or category, depending on the reason. */
  detail: string | null;
};

export type DashboardData = {
  learner: { firstName: string | null };
  stats: LearningStats;
  counts: { ongoing: number; completed: number; courses: number };
  resume: DashboardResume[];
  paths: DashboardPath[];
  tests: {
    available: number;
    /** Finished attempts across all tests. */
    taken: number;
    best: DashboardTestResult | null;
    latest: DashboardTestResult | null;
    suggestions: DashboardTestSuggestion[];
  };
  recommended: DashboardRecommendation[];
};

/** Everything the learner dashboard shows, in one call (days follow the X-Timezone header). */
export async function fetchDashboard() {
  const res = await axiosInstance.get<ApiEnvelope<DashboardData>>("/parent/dashboard");
  return res.data;
}
