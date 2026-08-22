import { useEffect, useMemo, useRef } from "react";
import { getCurriculumEntryBySlug, isDemoCourseSlug } from "@/data/curriculumData";
import {
  hasSkippedFirstModuleFeedback,
  hasSubmittedCourseFeedback,
} from "@/utils/courseFeedbackStorage";
import {
  isFirstModuleComplete,
  isSingleModuleCourse,
} from "@/utils/courseProgress";
import { useCoursesStore } from "@/stores/coursesStore";

export type CourseFeedbackVariant = "first_module" | "course_complete";

/**
 * Opens feedback after module 1 (multi-module courses) or at course completion.
 * If the learner skips the module-1 prompt, they get another chance at the end.
 */
export function useCourseCompletionFeedback(
  courseSlug: string | undefined,
  onRequestFeedback: (variant: CourseFeedbackVariant) => void,
) {
  const progressStatus = useCoursesStore((s) =>
    courseSlug ? s.courseProgress[courseSlug]?.status : undefined,
  );
  const completedLessons = useCoursesStore((s) =>
    courseSlug ? (s.courseProgress[courseSlug]?.completedLessons ?? []) : [],
  );

  const entry = useMemo(
    () => (courseSlug ? getCurriculumEntryBySlug(courseSlug) : null),
    [courseSlug],
  );

  const mountedRef = useRef(false);
  const prevStatusRef = useRef(progressStatus);
  const prevFirstModuleCompleteRef = useRef(false);

  useEffect(() => {
    if (!courseSlug || isDemoCourseSlug(courseSlug)) return;
    if (hasSubmittedCourseFeedback(courseSlug)) return;

    const firstModuleComplete = isFirstModuleComplete(entry, completedLessons);
    const singleModule = isSingleModuleCourse(entry);

    if (!mountedRef.current) {
      mountedRef.current = true;
      prevStatusRef.current = progressStatus;
      prevFirstModuleCompleteRef.current = firstModuleComplete;
      return;
    }

    const becameCompleted =
      prevStatusRef.current !== "completed" && progressStatus === "completed";
    const firstModuleJustCompleted =
      !prevFirstModuleCompleteRef.current && firstModuleComplete;

    prevStatusRef.current = progressStatus;
    prevFirstModuleCompleteRef.current = firstModuleComplete;

    if (firstModuleJustCompleted && !singleModule) {
      onRequestFeedback("first_module");
      return;
    }

    if (
      becameCompleted &&
      (singleModule || hasSkippedFirstModuleFeedback(courseSlug))
    ) {
      onRequestFeedback("course_complete");
    }
  }, [
    completedLessons,
    courseSlug,
    entry,
    onRequestFeedback,
    progressStatus,
  ]);
}
