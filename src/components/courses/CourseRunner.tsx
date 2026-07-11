import { useParams } from "react-router-dom";
import { getCurriculumBySlug, type Curriculum } from "@/data/curriculumData";
import CourseDetails from "./CourseDetails";
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
    mod.lessons.some(
      (lesson) =>
        !!lesson.formula_example ||
        lesson.questions.some((q) => q.type === "formula_test"),
    ),
  );
}

export default function CourseRunner() {
  const { exercise } = useParams<{ exercise: string }>();
  const curriculum = exercise
    ? getCurriculumBySlug(exercise)?.curriculum
    : undefined;

  if (isMathematicsCurriculum(curriculum)) {
    return <MathCourseDetails />;
  }

  return <CourseDetails />;
}
