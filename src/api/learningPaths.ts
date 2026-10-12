import axiosInstance from "@/lib/axios";
import type { ApiEnvelope } from "@/api/subscription";

/** One step = one existing curriculum (course). */
export type ApiLearningPathStep = {
  id: number;
  title: string;
  curriculumId: number;
  slug: string;
  description: string | null;
  language: string | null;
  category: string | null;
  level: string | null;
  moduleCount: number;
  lessonCount: number;
};

export type ApiLearningPathUnit = {
  id: number;
  title: string;
  steps: ApiLearningPathStep[];
};

export type ApiLearningPath = {
  id: number;
  title: string;
  slug: string;
  /** Icon key; the app draws it with PATHWAY_ICONS (components/icons.ts). */
  icon: string;
  color: "plum" | "iris" | "royal" | "rose";
  units: ApiLearningPathUnit[];
};

/** Published learning paths (admin-built from existing curricula); hidden curricula are already left out. */
export async function fetchVisibleLearningPaths() {
  const res = await axiosInstance.get<ApiEnvelope<ApiLearningPath[]>>("/parent/learning-path/visible");
  return res.data;
}
