import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  getCurriculumBySlug,
  getCurriculumEntryBySlug,
  getCourseTitleBySlug,
  getCurriculumIdBySlug,
  isDemoCourseSlug,
  isFullCurriculumFresh,
  type Curriculum,
} from "@/data/curriculumData";
import { isCurriculumV2 } from "@/features/curriculum-preview/v2/detect";
import { useCoursesStore, type EnsureCurriculumResult } from "@/stores/coursesStore";
import {
  useCourseCompletionFeedback,
  type CourseFeedbackVariant,
} from "@/hooks/useCourseCompletionFeedback";
import { useCourseLearningSession } from "@/hooks/useCourseLearningSession";
import { CourseCompletionFeedbackDialog } from "./CourseCompletionFeedbackDialog";
import { LearningStreakPopup } from "./LearningStreakPopup";
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

type LoadState = EnsureCurriculumResult | "loading";

const isReady = (slug: string | undefined) =>
  !slug || isDemoCourseSlug(slug) || isFullCurriculumFresh(slug);

/**
 * The course list has no lessons, so load this course by slug before mounting the player.
 * The player is keyed by slug and mounts only once the course is in memory.
 */
export default function CourseRunner() {
  const { exercise } = useParams<{ exercise: string }>();
  const ensureCurriculum = useCoursesStore((s) => s.ensureCurriculum);
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<{ slug?: string; state: LoadState }>(() => ({
    slug: exercise,
    state: isReady(exercise) ? "ok" : "loading",
  }));

  useEffect(() => {
    if (isReady(exercise)) {
      setLoad({ slug: exercise, state: "ok" });
      return;
    }
    let cancelled = false;
    setLoad({ slug: exercise, state: "loading" });
    void ensureCurriculum(exercise as string).then((state) => {
      if (!cancelled) setLoad({ slug: exercise, state });
    });
    return () => {
      cancelled = true;
    };
  }, [exercise, ensureCurriculum, attempt]);

  // Ignore a result left over from the previous slug while the effect catches up.
  const state: LoadState = load.slug === exercise ? load.state : "loading";

  if (state === "ok") return <CourseRunnerLoaded key={exercise} />;

  return (
    <div className="flex h-full min-h-80 w-full flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      {state === "loading" ? (
        <>
          <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-gray-500" role="status">Loading course…</p>
        </>
      ) : state === "not_found" ? (
        <p className="text-sm text-gray-500">Course could not be found.</p>
      ) : (
        <>
          <p className="text-sm text-gray-500" role="alert">The course could not be loaded. Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}

function CourseRunnerLoaded() {
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
      <div className="h-full min-h-0 w-full flex-1 overflow-hidden">
        {courseView}
      </div>
      <LearningStreakPopup />
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
