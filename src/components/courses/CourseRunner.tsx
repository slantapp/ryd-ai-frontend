import { useCallback, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import {
  getCurriculumBySlug,
  getCurriculumEntryBySlug,
  getCourseTitleBySlug,
  getCurriculumIdBySlug,
  type Curriculum,
} from "@/data/curriculumData";
import { isCurriculumV2 } from "@/features/curriculum-preview/v2/detect";
import { useCoursesStore } from "@/stores/coursesStore";
import {
  useCourseCompletionFeedback,
  type CourseFeedbackVariant,
} from "@/hooks/useCourseCompletionFeedback";
import { useCourseLearningSession } from "@/hooks/useCourseLearningSession";
import { CourseCompletionFeedbackDialog } from "./CourseCompletionFeedbackDialog";
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackVariant, setFeedbackVariant] =
    useState<CourseFeedbackVariant>("course_complete");
  useCoursesStore((s) => s.curriculaRevision);

  const openFeedback = useCallback((variant: CourseFeedbackVariant) => {
    setFeedbackVariant(variant);
    setFeedbackOpen(true);
  }, []);

  useCourseCompletionFeedback(exercise, openFeedback);
  useCourseLearningSession(exercise);

  const entry = exercise ? getCurriculumEntryBySlug(exercise) : null;

  let courseView: ReactNode;

  if (entry && isCurriculumV2(entry)) {
    courseView = (
      <CourseDetailsV2 key={`v2-${exercise}`} />
    );
  } else {
    const curriculum = exercise
      ? getCurriculumBySlug(exercise)?.curriculum
      : undefined;

    if (isMathematicsCurriculum(curriculum)) {
      courseView = (
        <MathCourseDetails key={`math-${exercise}`} />
      );
    } else {
      courseView = (
        <CourseDetails key={`v1-${exercise}`} />
      );
    }
  }

  return (
    <>
      {courseView}
      {exercise ? (
        <CourseCompletionFeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          variant={feedbackVariant}
          courseSlug={exercise}
          courseTitle={getCourseTitleBySlug(exercise)}
          curriculumId={getCurriculumIdBySlug(exercise)}
        />
      ) : null}
    </>
  );
}
