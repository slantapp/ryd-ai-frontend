import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Split from "react-split";
import { BookOpen, Lock, Play, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePreviewAvatar } from "@/features/curriculum-preview/components/PreviewAvatar";
import { LessonPlayer } from "@/features/curriculum-preview/v2/components/LessonPlayer";
import {
  findLessonV2ById,
  getFirstLessonV2,
  getNextLessonV2,
} from "@/features/curriculum-preview/v2/navigation";
import type { LessonV2 } from "@/features/curriculum-preview/v2/types";
import { PageLoadWaitBanner } from "@/components/courses/exercise/PageLoadWaitBanner";
import { prefetchMonacoEditor } from "@/components/courses/exercise/MonacoEditorLazy";
import { MOBILE_INSTRUCTOR_AUDIO_BUTTON } from "@/constants/mobileInstructorAudio";
import {
  DEMO_COURSE_SLUG,
  getDemoCurriculumV2,
} from "@/data/curriculumData";
import { useMediaQueryMinLg } from "@/hooks/useMediaQueryMinLg";
import { cn } from "@/lib/utils";
import { useCoursesStore } from "@/stores/coursesStore";
import { PRIVATE_PATHS } from "@/utils/routePaths";

/** Free sneak peek stops after this many lessons — then subscribe to continue. */
const FREE_LESSON_LIMIT = 1;

/**
 * Free sneak-peek: same shell as CourseDetails (avatar left / board right),
 * driven by the v2 curriculum beat flow.
 */
export default function DemoSneakPeekPage() {
  const navigate = useNavigate();
  const updateCourseProgress = useCoursesStore((s) => s.updateCourseProgress);
  const [showSubscribePrompt, setShowSubscribePrompt] = useState(false);
  const [showLessonsMenu, setShowLessonsMenu] = useState(false);
  const completionFiredRef = useRef(false);

  const curriculumV2 = useMemo(() => getDemoCurriculumV2(), []);
  const curriculum = curriculumV2.curriculum;

  const [currentLesson, setCurrentLesson] = useState<LessonV2 | null>(() =>
    getFirstLessonV2(curriculum),
  );
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    () => new Set(),
  );
  const [lessonStarted, setLessonStarted] = useState(false);
  const [lessonKey, setLessonKey] = useState(0);
  const isLgUp = useMediaQueryMinLg();

  const {
    AvatarComponent,
    speak,
    stop,
    scheduleAfterSpeech,
    clearScheduledAfterSpeech,
    isSpeaking,
    isPaused,
    togglePause,
    currentSubtitle,
    isInstructorWaiting,
    isAvatarReady,
    showMobileAudioUnlock,
    unlockMobileAudio,
  } = usePreviewAvatar({
    instructorSource: "global",
    lessonActive: lessonStarted,
  });

  const allLessons = useMemo(
    () => curriculum.modules.flatMap((m) => m.lessons),
    [curriculum.modules],
  );

  const lessonOrdinal = useMemo(() => {
    if (!currentLesson) return 1;
    const idx = allLessons.findIndex((l) => l.id === currentLesson.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [allLessons, currentLesson]);

  const isFreeLesson = lessonOrdinal <= FREE_LESSON_LIMIT;

  const avatarSlot = (
    <AvatarComponent className="h-full w-full" showUnlockOverlay={false} />
  );

  const handleStartLesson = useCallback(() => {
    if (!currentLesson) return;
    // Unlock audio inside the user tap; do not stop() — that clears speech queued for the new lesson.
    unlockMobileAudio();
    clearScheduledAfterSpeech();
    setLessonStarted(true);
    setLessonKey((k) => k + 1);
  }, [clearScheduledAfterSpeech, currentLesson, unlockMobileAudio]);

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

  useEffect(() => {
    prefetchMonacoEditor();
  }, []);

  const goToSubscribe = useCallback(() => {
    stop();
    navigate(`${PRIVATE_PATHS.DASHBOARD}?sneakPeek=done`, { replace: true });
  }, [navigate, stop]);

  const openSubscribePrompt = useCallback(() => {
    if (completionFiredRef.current) {
      setShowSubscribePrompt(true);
      return;
    }
    completionFiredRef.current = true;
    stop();
    clearScheduledAfterSpeech();
    setShowSubscribePrompt(true);
  }, [clearScheduledAfterSpeech, stop]);

  const selectLesson = useCallback(
    (lesson: LessonV2) => {
      stop();
      clearScheduledAfterSpeech();
      unlockMobileAudio();
      setCurrentLesson(lesson);
      setLessonStarted(true);
      setLessonKey((k) => k + 1);
      setShowLessonsMenu(false);
    },
    [clearScheduledAfterSpeech, stop, unlockMobileAudio],
  );

  const handleLessonComplete = useCallback((lessonId: string) => {
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      next.add(lessonId);
      return next;
    });
  }, []);

  const handleNextLesson = useCallback(
    (preferredNextId?: string | null) => {
      if (!currentLesson) return;

      // Cliffhanger: after the free lesson, stop and ask them to subscribe.
      if (lessonOrdinal <= FREE_LESSON_LIMIT) {
        openSubscribePrompt();
        return;
      }

      let next: LessonV2 | null = null;
      if (preferredNextId) {
        next = findLessonV2ById(curriculum, preferredNextId);
      }
      if (!next && preferredNextId !== null) {
        next = getNextLessonV2(curriculum, currentLesson);
      }

      if (next) {
        selectLesson(next);
        return;
      }

      openSubscribePrompt();
    },
    [
      curriculum,
      currentLesson,
      lessonOrdinal,
      openSubscribePrompt,
      selectLesson,
    ],
  );

  if (!currentLesson) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center p-6">
        <p className="font-inter text-sm text-gray-500">
          Demo lesson could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 px-1 pb-[env(safe-area-inset-bottom)] sm:px-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 truncate font-inter text-xs font-semibold uppercase tracking-wide text-primary sm:text-sm">
          <Sparkles className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">Free sneak peek · Lesson {lessonOrdinal}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-8 gap-1.5 rounded-xl font-inter"
            onClick={() => setShowLessonsMenu(true)}
          >
            <BookOpen className="size-3.5" aria-hidden />
            Lessons
          </Button>
          <Button
            type="button"
            size="sm"
            className="min-h-8 rounded-xl bg-[#DDB5D2] font-solway font-semibold text-primary hover:bg-[#DDA5D2]"
            onClick={goToSubscribe}
          >
            Plans
          </Button>
        </div>
      </div>

      <PageLoadWaitBanner
        isLoading={lessonStarted && isInstructorWaiting}
        mobileOnly={false}
      />

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[20px] bg-white shadow-lg">
        {!isLgUp ? (
          <div
            className="pointer-events-none fixed bottom-0 right-0 z-0 h-[280px] w-[320px] translate-x-8 translate-y-12 opacity-0"
            aria-hidden
          >
            {avatarSlot}
          </div>
        ) : null}

        <Split
          className="flex h-full min-h-0"
          sizes={isLgUp ? [35, 65] : [0, 100]}
          minSize={isLgUp ? 200 : 0}
          gutterSize={isLgUp ? 8 : 0}
          gutterStyle={(dimension, gutterSize) =>
            dimension === "width" && gutterSize > 0
              ? {
                  width: `${gutterSize}px`,
                  cursor: "col-resize",
                  pointerEvents: "auto",
                }
              : { width: "0px", pointerEvents: "none" }
          }
        >
          <div
            className={cn(
              "relative flex min-h-0 flex-col overflow-y-auto scrollbar-hide",
              isLgUp ? "pr-4" : "min-w-0 overflow-hidden",
            )}
          >
            {isLgUp ? (
              <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4">
                <div className="aspect-square h-full max-h-80 w-full overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-b from-primary/10 to-white shadow-inner">
                  {avatarSlot}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l-0 border-primary/20 bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white lg:border-l-2">
            {!lessonStarted ? (
              <div className="flex min-h-[280px] flex-1 items-center justify-center px-4 py-8 sm:px-6">
              <div className="mx-auto max-w-md text-center">
                <div className="relative mb-6 inline-flex items-center justify-center">
                  <div className="absolute h-20 w-20 animate-ping rounded-full bg-primary/10" />
                  <div className="absolute h-16 w-16 animate-pulse rounded-full bg-primary/20" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/80 shadow-lg shadow-primary/30">
                    <Play
                      className="size-8 fill-white text-white"
                      aria-hidden
                    />
                  </div>
                </div>
                <h2 className="mb-2 font-solway text-2xl font-bold text-gray-800">
                  Try a free lesson
                </h2>
                <p className="mb-2 font-inter text-sm font-medium text-gray-700">
                  {curriculum.title}
                </p>
                <p className="mb-6 font-inter leading-relaxed text-gray-500">
                  Meet your AI instructor and write real code with{" "}
                  <span className="font-semibold">p</span> and{" "}
                  <span className="font-semibold">h1</span> tags. No subscription
                  needed for this peek.
                </p>
                <button
                  type="button"
                  onClick={handleStartLesson}
                  className="group mx-auto flex w-full max-w-xs shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-linear-to-r from-primary via-primary to-primary/90 px-10 py-4 font-solway text-base font-bold tracking-tight text-white shadow-lg shadow-primary/35 ring-2 ring-primary/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98] sm:max-w-none sm:px-12"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                    <Play
                      className="size-5 fill-white text-white"
                      aria-hidden
                    />
                  </span>
                  <span className="pr-1">{MOBILE_INSTRUCTOR_AUDIO_BUTTON}</span>
                </button>
              </div>
            </div>
            ) : (
              <LessonPlayer
                key={`${currentLesson.id}-${lessonKey}`}
                curriculum={curriculum}
                lesson={currentLesson}
                lessonOrdinal={lessonOrdinal}
                lessonTotal={allLessons.length}
                speak={speak}
                stop={stop}
                scheduleAfterSpeech={scheduleAfterSpeech}
                clearScheduledAfterSpeech={clearScheduledAfterSpeech}
                isSpeaking={isSpeaking}
                isPaused={isPaused}
                onTogglePause={togglePause}
                currentSubtitle={currentSubtitle}
                avatarSlot={undefined}
                isAvatarReady={isAvatarReady}
                onLessonComplete={handleLessonComplete}
                onNextLesson={handleNextLesson}
                hideFlowChrome
                classicLayout
                embedInParentSplit
                subscribeGateAfterLesson={isFreeLesson}
                showMobileAudioUnlock={showMobileAudioUnlock}
                onMobileAudioUnlock={unlockMobileAudio}
                isInstructorWaiting={isInstructorWaiting}
                suppressMobileWaitBanner
              />
            )}
          </div>
        </Split>
      </div>

      {/* Lessons menu — only on demand (brief: outline not always open) */}
      <Dialog open={showLessonsMenu} onOpenChange={setShowLessonsMenu}>
        <DialogContent className="max-h-[min(90dvh,36rem)] max-w-md overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-solway text-lg">Lessons</DialogTitle>
            <DialogDescription className="font-inter text-sm text-gray-600">
              This sneak peek covers the p and h1 tags. Subscribe to unlock the
              button lesson and keep building with your AI instructor.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {allLessons.map((lesson, index) => {
              const done = completedLessons.has(lesson.id);
              const unlocked = index < FREE_LESSON_LIMIT;
              const active = lesson.id === currentLesson.id;
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      if (unlocked) {
                        selectLesson(lesson);
                        return;
                      }
                      setShowLessonsMenu(false);
                      openSubscribePrompt();
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-gray-100 bg-white",
                      unlocked
                        ? "hover:border-primary/40"
                        : "opacity-80",
                    )}
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 font-solway text-xs font-bold text-primary">
                      {unlocked ? (
                        index + 1
                      ) : (
                        <Lock className="size-3.5" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-solway text-sm font-semibold text-gray-900">
                        {lesson.title}
                      </span>
                      {lesson.goal ? (
                        <span className="mt-0.5 block font-inter text-xs text-gray-500">
                          {lesson.goal}
                        </span>
                      ) : null}
                      {done ? (
                        <span className="mt-1 inline-block font-inter text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-700">
                          Done
                        </span>
                      ) : !unlocked ? (
                        <span className="mt-1 inline-block font-inter text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
                          Subscribe to unlock
                        </span>
                      ) : (
                        <span className="mt-1 inline-block font-inter text-[0.65rem] font-semibold uppercase tracking-wide text-amber-700">
                          Free peek
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Button
            type="button"
            variant="ghost"
            className="w-full gap-2 font-inter"
            onClick={() => setShowLessonsMenu(false)}
          >
            <X className="size-4" aria-hidden />
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSubscribePrompt}
        onOpenChange={setShowSubscribePrompt}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-solway text-xl">
              Ready to add your button?
            </DialogTitle>
            <DialogDescription className="font-inter text-sm text-gray-600">
              You wrote real code with <span className="font-semibold">p</span> and{" "}
              <span className="font-semibold">h1</span> tags. Subscribe to unlock
              the next step: building a clickable{" "}
              <span className="font-semibold">button</span>, and the rest of
              every course with your AI instructor.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="font-inter"
              onClick={() => setShowSubscribePrompt(false)}
            >
              Replay this lesson
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-[#DDB5D2] font-solway font-semibold text-primary hover:bg-[#DDA5D2]"
              onClick={goToSubscribe}
            >
              Subscribe to continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
