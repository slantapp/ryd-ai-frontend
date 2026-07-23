import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Split from "react-split";
import { Play } from "lucide-react";
import { usePreviewAvatar } from "@/features/curriculum-preview/components/PreviewAvatar";
import { LessonPlayer } from "@/features/curriculum-preview/v2/components/LessonPlayer";
import {
  countLessonsV2,
  findLessonV2ById,
  flattenLessonsV2,
  getFirstLessonV2,
  getNextLessonV2,
} from "@/features/curriculum-preview/v2/navigation";
import {
  extractCurriculumV2Data,
  isCurriculumV2,
} from "@/features/curriculum-preview/v2/detect";
import type { LessonV2 } from "@/features/curriculum-preview/v2/types";
import { prefetchMonacoEditor } from "@/components/courses/exercise/MonacoEditorLazy";
import { getCurriculumEntryBySlug } from "@/data/curriculumData";
import { useMediaQueryMinLg } from "@/hooks/useMediaQueryMinLg";
import { cn } from "@/lib/utils";
import { useCoursesStore } from "@/stores/coursesStore";

/**
 * Paid / enrolled learning environment for schema v2 (flow) curricula.
 * Same classic shell as sneak peek / CourseDetails: start screen, then
 * avatar left / board right via LessonPlayer.
 */
export default function CourseDetailsV2() {
  const { exercise } = useParams<{ exercise: string }>();
  const updateCourseProgress = useCoursesStore((s) => s.updateCourseProgress);
  const getCourseProgress = useCoursesStore((s) => s.getCourseProgress);
  const isLgUp = useMediaQueryMinLg();

  const entry = exercise ? getCurriculumEntryBySlug(exercise) : null;
  const curriculum = useMemo(() => {
    if (!entry || !isCurriculumV2(entry)) return null;
    return extractCurriculumV2Data(entry).data;
  }, [entry]);

  const allLessons = useMemo(
    () => (curriculum ? flattenLessonsV2(curriculum) : []),
    [curriculum],
  );

  const [currentLesson, setCurrentLesson] = useState<LessonV2 | null>(null);
  const [lessonStarted, setLessonStarted] = useState(false);
  const [lessonKey, setLessonKey] = useState(0);
  const [progressReady, setProgressReady] = useState(false);

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
    isAvatarReady,
    showMobileAudioUnlock,
    unlockMobileAudio,
  } = usePreviewAvatar({ instructorSource: "global" });

  const lessonOrdinal = useMemo(() => {
    if (!currentLesson) return 1;
    const idx = allLessons.findIndex((l) => l.lesson.id === currentLesson.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [allLessons, currentLesson]);

  const lessonTotal = curriculum ? countLessonsV2(curriculum) : 0;

  const avatarSlot = (
    <AvatarComponent className="h-full w-full" showUnlockOverlay={false} />
  );

  useEffect(() => {
    prefetchMonacoEditor();
  }, []);

  // Hydrate progress, then pick the lesson — do not auto-start teaching.
  useEffect(() => {
    if (!curriculum || !exercise) {
      setProgressReady(false);
      return;
    }

    let cancelled = false;
    setProgressReady(false);

    void (async () => {
      await useCoursesStore.getState().hydrateCourseProgressFromApi(exercise);
      if (cancelled) return;

      const stored = getCourseProgress(exercise);

      let lesson: LessonV2 | null = null;
      if (typeof stored?.lessonIndex === "number") {
        lesson = allLessons[stored.lessonIndex]?.lesson ?? null;
      }
      if (!lesson && stored?.currentLessonId) {
        lesson = findLessonV2ById(curriculum, stored.currentLessonId);
      }
      if (!lesson) {
        lesson = getFirstLessonV2(curriculum);
      }

      const started = !!stored?.lessonStarted && !!lesson;
      setCurrentLesson(lesson);
      setLessonStarted(started);
      if (started) {
        setLessonKey((k) => k + 1);
      }
      setProgressReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [allLessons, curriculum, exercise, getCourseProgress]);

  const persistLessonPosition = useCallback(
    (lesson: LessonV2, started: boolean) => {
      if (!exercise || !curriculum) return;
      const lessonIndex = allLessons.findIndex((l) => l.lesson.id === lesson.id);
      updateCourseProgress(exercise, {
        status: started ? "ongoing" : "not-started",
        currentLessonId: lesson.id,
        lessonIndex: lessonIndex >= 0 ? lessonIndex : undefined,
        questionIndex: 0,
        lessonStarted: started,
        canStartQuestions: false,
        lastUpdated: Date.now(),
      });
    },
    [allLessons, curriculum, exercise, updateCourseProgress],
  );

  const handleStartLesson = useCallback(() => {
    if (!curriculum) return;
    const lesson = currentLesson ?? getFirstLessonV2(curriculum);
    if (!lesson) return;

    stop();
    clearScheduledAfterSpeech();
    setCurrentLesson(lesson);
    setLessonStarted(true);
    setLessonKey((k) => k + 1);
    persistLessonPosition(lesson, true);
  }, [
    clearScheduledAfterSpeech,
    curriculum,
    currentLesson,
    persistLessonPosition,
    stop,
  ]);

  const selectLesson = useCallback(
    (lesson: LessonV2) => {
      stop();
      clearScheduledAfterSpeech();
      setCurrentLesson(lesson);
      setLessonStarted(true);
      setLessonKey((k) => k + 1);
      persistLessonPosition(lesson, true);
    },
    [clearScheduledAfterSpeech, persistLessonPosition, stop],
  );

  const handleLessonComplete = useCallback(
    (lessonId: string) => {
      if (!exercise) return;

      const stored = getCourseProgress(exercise);
      const completed = Array.from(
        new Set([...(stored?.completedLessons ?? []), lessonId]),
      );
      const progress =
        lessonTotal > 0
          ? Math.round((completed.length / lessonTotal) * 100)
          : 0;
      const done = completed.length >= lessonTotal;
      updateCourseProgress(exercise, {
        status: done ? "completed" : "ongoing",
        progress,
        completedLessons: completed,
        currentLessonId: lessonId,
        lessonStarted: true,
        canStartQuestions: true,
        lastUpdated: Date.now(),
      });
    },
    [exercise, getCourseProgress, lessonTotal, updateCourseProgress],
  );

  const handleNextLesson = useCallback(
    (preferredNextId?: string | null) => {
      if (!currentLesson || !curriculum) return;

      let next: LessonV2 | null = null;
      if (preferredNextId) {
        next = findLessonV2ById(curriculum, preferredNextId);
      }
      if (!next && preferredNextId !== null) {
        next = getNextLessonV2(curriculum, currentLesson);
      }

      if (next) {
        selectLesson(next);
      }
    },
    [curriculum, currentLesson, selectLesson],
  );

  if (!entry) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center p-6">
        <p className="text-sm text-gray-500">Course could not be found.</p>
      </div>
    );
  }

  if (!curriculum) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center p-6">
        <p className="text-sm text-gray-500">
          This course is not a flow (v2) curriculum.
        </p>
      </div>
    );
  }

  if (!progressReady || !currentLesson) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center p-6">
        <p className="text-sm text-gray-500">Loading lesson…</p>
      </div>
    );
  }

  // Same gate as classic CourseDetails: wait for "Start learning" before teaching.
  if (!lessonStarted) {
    return (
      <div className="relative h-full min-h-0 overflow-hidden rounded-[20px] bg-white shadow-lg">
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
              <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex h-full min-h-0 min-w-0 w-full items-center justify-start">
                  {avatarSlot}
                </div>
              </div>
            ) : (
              <div
                className="pointer-events-none fixed bottom-0 right-0 z-0 h-[280px] w-[320px] translate-x-8 translate-y-12 opacity-0"
                aria-hidden
              >
                {avatarSlot}
              </div>
            )}
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l-0 border-primary/20 bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white lg:border-l-2">
            <div className="flex h-full min-h-[300px] items-center justify-center">
              <div className="mx-auto max-w-md px-6 text-center">
                <div className="relative mb-6 inline-flex items-center justify-center">
                  <div className="absolute h-20 w-20 animate-ping rounded-full bg-primary/10" />
                  <div className="absolute h-16 w-16 animate-pulse rounded-full bg-primary/20" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/80 shadow-lg shadow-primary/30">
                    <svg
                      className="h-8 w-8 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>

                <h2 className="mb-2 text-2xl font-bold text-gray-800">
                  Ready to Learn?
                </h2>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  {curriculum.title}
                </p>
                <p className="mb-6 leading-relaxed text-gray-500">
                  Your learning adventure awaits! Click the button below to begin
                  your lesson and start building amazing things.
                </p>

                <button
                  type="button"
                  onClick={handleStartLesson}
                  className="group mx-auto flex w-full max-w-xs shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-linear-to-r from-primary via-primary to-primary/90 px-10 py-4 text-base font-bold tracking-tight text-white shadow-lg shadow-primary/35 ring-2 ring-primary/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98] sm:max-w-none sm:px-12"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                    <Play
                      className="size-5 fill-white text-white"
                      aria-hidden
                    />
                  </span>
                  <span className="pr-1">Start learning</span>
                </button>

                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span className="h-1 w-1 rounded-full bg-primary/40" />
                  <span>Interactive lessons</span>
                  <span className="h-1 w-1 rounded-full bg-primary/40" />
                  <span>Fun quizzes</span>
                  <span className="h-1 w-1 rounded-full bg-primary/40" />
                  <span>Hands-on coding</span>
                </div>
              </div>
            </div>
          </div>
        </Split>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-[20px] bg-white shadow-lg">
      <LessonPlayer
        key={`${currentLesson.id}-${lessonKey}`}
        curriculum={curriculum}
        lesson={currentLesson}
        lessonOrdinal={lessonOrdinal}
        lessonTotal={lessonTotal}
        speak={speak}
        stop={stop}
        scheduleAfterSpeech={scheduleAfterSpeech}
        clearScheduledAfterSpeech={clearScheduledAfterSpeech}
        isSpeaking={isSpeaking}
        isPaused={isPaused}
        onTogglePause={togglePause}
        currentSubtitle={currentSubtitle}
        avatarSlot={avatarSlot}
        onLessonComplete={handleLessonComplete}
        onNextLesson={handleNextLesson}
        hideFlowChrome
        classicLayout
        showMobileAudioUnlock={showMobileAudioUnlock}
        onMobileAudioUnlock={unlockMobileAudio}
        isAvatarLoading={!isAvatarReady}
      />
    </div>
  );
}
