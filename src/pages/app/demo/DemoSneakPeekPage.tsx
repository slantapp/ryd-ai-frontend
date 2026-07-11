import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import CourseDetails from "@/components/courses/CourseDetails";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEMO_COURSE_SLUG,
  getDemoCurriculum,
} from "@/data/curriculumData";
import { useCoursesStore } from "@/stores/coursesStore";
import { PRIVATE_PATHS } from "@/utils/routePaths";

/**
 * Free sneak-peek lesson for unsubscribed users.
 * Uses the real CourseDetails learning environment with a bundled demo curriculum.
 */
export default function DemoSneakPeekPage() {
  const navigate = useNavigate();
  const updateCourseProgress = useCoursesStore((s) => s.updateCourseProgress);
  const [showSubscribePrompt, setShowSubscribePrompt] = useState(false);
  const completionFiredRef = useRef(false);

  const demoTitle = getDemoCurriculum().curriculum.title;

  // Fresh demo each visit (local progress only — not synced to API).
  useEffect(() => {
    completionFiredRef.current = false;
    updateCourseProgress(
      DEMO_COURSE_SLUG,
      {
        status: "not-started",
        progress: 0,
        currentLessonId: null,
        completedLessons: [],
        lessonIndex: undefined,
        questionIndex: 0,
        lessonStarted: false,
        canStartQuestions: false,
        lastUpdated: Date.now(),
      },
      { immediate: true },
    );
  }, [updateCourseProgress]);

  const goToSubscribe = useCallback(() => {
    navigate(`${PRIVATE_PATHS.DASHBOARD}?sneakPeek=done`, { replace: true });
  }, [navigate]);

  const handleCourseCompleted = useCallback(() => {
    if (completionFiredRef.current) return;
    completionFiredRef.current = true;
    setShowSubscribePrompt(true);
  }, []);

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[32rem] flex-col gap-3 sm:h-[calc(100dvh-10rem)]">
      <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-primary/15 bg-linear-to-r from-primary/10 via-primary/5 to-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3.5 shrink-0" aria-hidden />
            Free sneak peek
          </p>
          <h1 className="font-solway text-base font-bold text-gray-900 sm:text-lg">
            {demoTitle}
          </h1>
          <p className="mt-0.5 font-inter text-xs text-gray-600 sm:text-sm">
            Try a real lesson with your AI instructor — then unlock the full
            library with a plan.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-inter"
            onClick={goToSubscribe}
          >
            Back to subscribe
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-xl bg-[#DDB5D2] font-solway text-primary hover:bg-[#DDA5D2]"
            onClick={goToSubscribe}
          >
            Choose a plan
          </Button>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <CourseDetails
          slugOverride={DEMO_COURSE_SLUG}
          onCourseCompleted={handleCourseCompleted}
        />
      </div>

      <Dialog open={showSubscribePrompt} onOpenChange={setShowSubscribePrompt}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-solway text-xl">
              Nice work — ready for more?
            </DialogTitle>
            <DialogDescription className="font-inter text-sm text-gray-600">
              You just finished the sneak peek. Subscribe to unlock every course,
              keep progress, and keep learning with your AI instructor.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="font-inter"
              onClick={() => setShowSubscribePrompt(false)}
            >
              Keep exploring
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-[#DDB5D2] font-solway text-primary hover:bg-[#DDA5D2]"
              onClick={goToSubscribe}
            >
              View subscription plans
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
