import axiosInstance from "@/lib/axios";
import type { Curriculum } from "@/data/curriculumData";
import type { ApiEnvelope } from "@/api/subscription";

export async function fetchVisibleCurriculums() {
  const res = await axiosInstance.get<ApiEnvelope<Curriculum[]>>(
    "/parent/curriculum/visible",
  );
  return res.data;
}
