import { useEffect, useRef } from "react";
import { isDemoCourseSlug } from "@/data/curriculumData";
import { hasSubmittedCourseFeedback } from "@/utils/courseFeedbackStorage";
import { useCoursesStore } from "@/stores/coursesStore";

/**
 * Opens feedback UI when the learner finishes a course during this session
 * (not when reopening an already-completed course).
 */
export function useCourseCompletionFeedback(
  courseSlug: string | undefined,
  onRequestFeedback: () => void,
) {
  const progressStatus = useCoursesStore((s) =>
    courseSlug ? s.courseProgress[courseSlug]?.status : undefined,
  );
  const mountedRef = useRef(false);
  const prevStatusRef = useRef(progressStatus);

  useEffect(() => {
    if (!courseSlug || isDemoCourseSlug(courseSlug)) return;

    if (!mountedRef.current) {
      mountedRef.current = true;
      prevStatusRef.current = progressStatus;
      return;
    }

    const becameCompleted =
      prevStatusRef.current !== "completed" && progressStatus === "completed";

    prevStatusRef.current = progressStatus;

    if (
      becameCompleted &&
      !hasSubmittedCourseFeedback(courseSlug)
    ) {
      onRequestFeedback();
    }
  }, [courseSlug, onRequestFeedback, progressStatus]);
}
