import axiosInstance from "@/lib/axios";
import type { CurriculumEntry, CurriculumSummary } from "@/data/curriculumData";
import type { ApiEnvelope } from "@/api/subscription";

/** Course cards only (no lessons). Load a full course with `fetchCurriculumBySlug`. */
export async function fetchVisibleCurriculums() {
  const res = await axiosInstance.get<ApiEnvelope<CurriculumSummary[]>>(
    "/parent/curriculum/visible",
    { params: { view: "summary" } },
  );
  return res.data;
}

/** One visible course with all modules and lessons. 404 when it is hidden or unknown. */
export async function fetchCurriculumBySlug(slug: string) {
  const res = await axiosInstance.get<ApiEnvelope<CurriculumEntry>>(
    `/parent/curriculum/slug/${encodeURIComponent(slug)}`,
  );
  return res.data;
}
