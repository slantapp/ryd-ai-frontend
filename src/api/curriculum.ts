import axiosInstance from "@/lib/axios";
import type { CurriculumEntry } from "@/data/curriculumData";
import type { ApiEnvelope } from "@/api/subscription";

export async function fetchVisibleCurriculums() {
  const res = await axiosInstance.get<ApiEnvelope<CurriculumEntry[]>>(
    "/parent/curriculum/visible",
  );
  return res.data;
}
