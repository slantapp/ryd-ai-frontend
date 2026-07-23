import { useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  getCurriculumBySlug,
  getCurriculumEntryBySlug,
  type Curriculum,
} from "@/data/curriculumData";
import { isCurriculumV2 } from "@/features/curriculum-preview/v2/detect";
import { useCoursesStore } from "@/stores/coursesStore";
import { prefetchAvatar } from "@/utils/prefetchAvatar";
import CourseDetails from "./CourseDetails";
import CourseDetailsV2 from "./CourseDetailsV2";
import MathCourseDetails from "./math/MathCourseDetails";

/** True when this curriculum should use the math classroom (formula demos / formula_test). */
function isMathematicsCurriculum(
  curriculum: Curriculum["curriculum"] | undefined,
): boolean {
  if (!curriculum) return false;

  const category = String(curriculum.category ?? "")
    .trim()
    .toLowerCase();
  if (category === "mathematics" || category === "math") return true;

  // Defensive: some API payloads may omit/mis-tag category but still ship formula questions.
  return curriculum.modules.some((mod) =>
    mod.lessons.some((lesson) => {
      if (!Array.isArray(lesson.questions)) return !!lesson.formula_example;
      return (
        !!lesson.formula_example ||
        lesson.questions.some((q) => q.type === "formula_test")
      );
    }),
  );
}

export default function CourseRunner() {
  const { exercise } = useParams<{ exercise: string }>();
  // Re-resolve when visible curricula finish loading / refresh.
  const curriculaRevision = useCoursesStore((s) => s.curriculaRevision);

  useEffect(() => {
    prefetchAvatar();
  }, [exercise]);

  const entry = exercise ? getCurriculumEntryBySlug(exercise) : null;

  // Flow curricula use the classic LessonPlayer shell (avatar left / board right).
  if (entry && isCurriculumV2(entry)) {
    return <CourseDetailsV2 key={`v2-${exercise}-${curriculaRevision}`} />;
  }

  const curriculum = exercise
    ? getCurriculumBySlug(exercise)?.curriculum
    : undefined;

  if (isMathematicsCurriculum(curriculum)) {
    return <MathCourseDetails key={`math-${exercise}-${curriculaRevision}`} />;
  }

  return <CourseDetails key={`v1-${exercise}-${curriculaRevision}`} />;
}
