import axiosInstance from "@/lib/axios";
import type { ApiEnvelope } from "@/api/subscription";

export type LearningBadgeIcon = "footprints" | "flame" | "calendar" | "trophy" | "target" | "graduation";

export type LearningBadge = {
  id: string;
  title: string;
  description: string;
  icon: LearningBadgeIcon;
  unlocked: boolean;
};

/** Server-calculated learning stats (days follow the X-Timezone header). */
export type LearningStats = {
  timezone: string;
  streak: number;
  longestStreak: number;
  activeToday: boolean;
  today: {
    day: string;
    lessonsCompleted: number;
    practiceCompleted: number;
    minutes: number;
    goal: number;
    goalReached: boolean;
  };
  last7Days: { date: string; active: boolean; lessons: number; minutes: number }[];
  totals: {
    lessonsCompleted: number;
    practiceCompleted: number;
    coursesCompleted: number;
    minutes: number;
    activeDays: number;
  };
  badges: LearningBadge[];
};

export async function fetchLearningStats() {
  const res = await axiosInstance.get<ApiEnvelope<LearningStats>>("/parent/learning/stats");
  return res.data;
}
