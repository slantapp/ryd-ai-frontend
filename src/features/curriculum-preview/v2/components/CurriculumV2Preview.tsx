import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Menu,
  Play,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { usePreviewAvatar } from "../../components/PreviewAvatar";
import { PageLoadWaitBanner } from "@/components/courses/exercise/PageLoadWaitBanner";
import { prefetchMonacoEditor } from "@/components/courses/exercise/MonacoEditorLazy";
import { MOBILE_INSTRUCTOR_AUDIO_BUTTON } from "@/constants/mobileInstructorAudio";
import { useMediaQueryMinLg } from "@/hooks/useMediaQueryMinLg";
import type { PublishStatus } from "../../types";
import {
  countLessonsV2,
  findLessonV2ById,
  getFirstLessonV2,
  getNextLessonV2,
} from "../navigation";
import type { CurriculumV2Data, LessonV2 } from "../types";
import { LessonPlayer } from "./LessonPlayer";
import { V2Sidebar } from "./V2Sidebar";
import {
  clearV2LessonDraft,
  loadV2LessonDraft,
  saveV2LessonDraft,
  type V2LessonDraft,
} from "../lessonPersist";

interface CurriculumV2PreviewProps {
  curriculum: CurriculumV2Data;
  sourceFile: File | null;
  isRemotePreview?: boolean;
  publishStatus?: PublishStatus;
  onPublish?: () => void;
  onBackToUpload?: () => void;
}

export function CurriculumV2Preview({
  curriculum,
  sourceFile,
  isRemotePreview = false,
  publishStatus = "idle",
  onPublish,
  onBackToUpload,
}: CurriculumV2PreviewProps) {
  const isLgUp = useMediaQueryMinLg();
  const [currentLesson, setCurrentLesson] = useState<LessonV2 | null>(
    () => getFirstLessonV2(curriculum),
  );
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set(),
  );
  const [showSidebar, setShowSidebar] = useState(true);
  const [lessonKey, setLessonKey] = useState(0);
  const [lessonStarted, setLessonStarted] = useState(false);
  const [resumeDraft, setResumeDraft] = useState<V2LessonDraft | null>(null);

  const previewScope = useMemo(
    () => `preview:${curriculum.title}`,
    [curriculum.title],
  );

  const {
    renderAvatar,
    speak,
    stop,
    scheduleAfterSpeech,
    clearScheduledAfterSpeech,
    isSpeaking,
    isPaused,
    togglePause,
    currentSubtitle,
    isInstructorWaiting,
    showMobileAudioUnlock,
    unlockMobileAudio,
    selectedInstructor,
    setSelectedInstructor,
  } = usePreviewAvatar({ lessonActive: lessonStarted });

  const allLessons = useMemo(
    () => curriculum.modules.flatMap((m) => m.lessons),
    [curriculum.modules],
  );

  const lessonOrdinal = useMemo(() => {
    if (!currentLesson) return 1;
    const idx = allLessons.findIndex((l) => l.id === currentLesson.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [allLessons, currentLesson]);

  const lessonTotal = countLessonsV2(curriculum);

  useEffect(() => {
    const hasCode = curriculum.modules.some((m) =>
      m.lessons.some((l) =>
        l.flow.some(
          (b) =>
            b.type === "code_demo" ||
            (b.type === "question" && b.question.type === "code_test"),
        ),
      ),
    );
    if (hasCode) prefetchMonacoEditor();
  }, [curriculum]);

  const handleStartLesson = useCallback(() => {
    if (!currentLesson) return;
    unlockMobileAudio();
    clearScheduledAfterSpeech();
    const draft = loadV2LessonDraft(
      typeof window !== "undefined" ? window.sessionStorage : null,
      previewScope,
      currentLesson.id,
    );
    setResumeDraft(draft);
    setLessonStarted(true);
    setLessonKey((k) => k + 1);
  }, [
    clearScheduledAfterSpeech,
    currentLesson,
    previewScope,
    unlockMobileAudio,
  ]);

  const selectLesson = useCallback(
    (lesson: LessonV2) => {
      unlockMobileAudio();
      stop();
      clearScheduledAfterSpeech();
      const draft = loadV2LessonDraft(
        typeof window !== "undefined" ? window.sessionStorage : null,
        previewScope,
        lesson.id,
      );
      setResumeDraft(draft);
      setCurrentLesson(lesson);
      setLessonStarted(true);
      setLessonKey((k) => k + 1);
      setShowSidebar(false);
    },
    [clearScheduledAfterSpeech, previewScope, stop, unlockMobileAudio],
  );

  const handleBeatProgress = useCallback(
    (draft: V2LessonDraft) => {
      if (!currentLesson) return;
      saveV2LessonDraft(
        typeof window !== "undefined" ? window.sessionStorage : null,
        previewScope,
        currentLesson.id,
        draft,
      );
    },
    [currentLesson, previewScope],
  );

  const handleLessonComplete = useCallback(
    (lessonId: string) => {
      clearV2LessonDraft(
        typeof window !== "undefined" ? window.sessionStorage : null,
        previewScope,
        lessonId,
      );
      setCompletedLessons((prev) => {
        const next = new Set(prev);
        next.add(lessonId);
        return next;
      });
    },
    [previewScope],
  );

  const handleNextLesson = useCallback(
    (preferredNextId?: string | null) => {
      if (!currentLesson) return;
      let next: LessonV2 | null = null;
      if (preferredNextId) {
        next = findLessonV2ById(curriculum, preferredNextId);
      }
      if (!next) {
        next = getNextLessonV2(curriculum, currentLesson);
      }
      if (next) selectLesson(next);
      else toast.success("Course complete — great job!");
    },
    [curriculum, currentLesson, selectLesson],
  );

  if (!currentLesson) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f6f8]">
        <p className="text-gray-500">No lessons found in this curriculum.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 bg-[#f4f6f8]">
      <button
        type="button"
        onClick={() => setShowSidebar((s) => !s)}
        className="fixed left-4 top-4 z-50 rounded-xl bg-white p-2 shadow-lg lg:hidden"
        aria-label={showSidebar ? "Close course menu" : "Open course menu"}
      >
        {showSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {showSidebar && (
        <button
          type="button"
          aria-label="Close course menu"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-76 shrink-0 flex-col border-r border-gray-200 bg-white shadow-lg transition-transform lg:relative lg:translate-x-0 ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <V2Sidebar
          curriculum={curriculum}
          currentLesson={currentLesson}
          currentLessonOrdinal={lessonOrdinal}
          onSelectLesson={selectLesson}
          completedLessons={completedLessons}
          headerSlot={
            <div className="shrink-0 space-y-2 border-b border-gray-100 p-3">
              <div className="flex items-center justify-between gap-2">
                {!isRemotePreview && onBackToUpload ? (
                  <button
                    type="button"
                    onClick={onBackToUpload}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
                  >
                    <Upload className="h-4 w-4" />
                    Upload new
                  </button>
                ) : (
                  <p className="text-sm font-semibold text-gray-800">
                    Curriculum preview
                  </p>
                )}
                <select
                  value={selectedInstructor}
                  onChange={(e) =>
                    setSelectedInstructor(e.target.value as "woman" | "man")
                  }
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
                  aria-label="Choose instructor"
                >
                  <option value="woman">Instructor A</option>
                  <option value="man">Instructor B</option>
                </select>
              </div>
              {sourceFile && !isRemotePreview && onPublish && (
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={
                    publishStatus === "uploading" ||
                    publishStatus === "published"
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {publishStatus === "uploading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing…
                    </>
                  ) : publishStatus === "published" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Published
                    </>
                  ) : (
                    "Publish curriculum"
                  )}
                </button>
              )}
            </div>
          }
          footerSlot={
            <p className="text-center text-[0.7rem] text-gray-400">
              Flow curriculum · v2
              {curriculum.class ? ` · ${curriculum.class}` : ""}
            </p>
          }
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-white shadow-lg">
          <PageLoadWaitBanner
            isLoading={isInstructorWaiting && !showMobileAudioUnlock}
            mobileOnly={false}
          />

          {!lessonStarted ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden border-l-0 border-primary/20 bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white lg:border-l-2">
              {isLgUp ? (
                <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                  <div className="aspect-square h-full max-h-80 w-full max-w-sm overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-b from-primary/10 to-white shadow-inner">
                    {renderAvatar("h-full w-full", false)}
                  </div>
                </div>
              ) : (
                <div
                  className="pointer-events-none fixed bottom-0 right-0 z-0 h-[280px] w-[320px] translate-x-8 translate-y-12 opacity-0"
                  aria-hidden
                >
                  {renderAvatar("h-full w-full", false)}
                </div>
              )}
              <div className="flex min-h-[280px] flex-1 items-center justify-center px-4 py-8 sm:px-6">
                <div className="mx-auto max-w-md text-center">
                  <div className="relative mb-6 inline-flex items-center justify-center">
                    <div className="absolute h-20 w-20 animate-ping rounded-full bg-primary/10" />
                    <div className="absolute h-16 w-16 animate-pulse rounded-full bg-primary/20" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/80 shadow-lg shadow-primary/30">
                      <Play className="size-8 fill-white text-white" aria-hidden />
                    </div>
                  </div>
                  <h2 className="mb-2 font-solway text-2xl font-bold text-gray-800">
                    Ready to preview?
                  </h2>
                  <p className="mb-2 font-inter text-sm font-medium text-gray-700">
                    {curriculum.title}
                  </p>
                  <p className="mb-6 font-inter leading-relaxed text-gray-500">
                    This is the same learning experience your students will see.
                    Tap below to start the lesson.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartLesson}
                    className="group mx-auto flex w-full max-w-xs shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-linear-to-r from-primary via-primary to-primary/90 px-10 py-4 font-solway text-base font-bold tracking-tight text-white shadow-lg shadow-primary/35 ring-2 ring-primary/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98] sm:max-w-none sm:px-12"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                      <Play className="size-5 fill-white text-white" aria-hidden />
                    </span>
                    <span className="pr-1">{MOBILE_INSTRUCTOR_AUDIO_BUTTON}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
              avatarSlot={renderAvatar("h-full w-full", false)}
              onLessonComplete={handleLessonComplete}
              onNextLesson={handleNextLesson}
              classicLayout
              showMobileAudioUnlock={showMobileAudioUnlock}
              onMobileAudioUnlock={unlockMobileAudio}
              isInstructorWaiting={isInstructorWaiting}
              suppressMobileWaitBanner
              initialBeatIndex={resumeDraft?.beatIndex ?? 0}
              initialDraft={resumeDraft}
              onBeatProgress={handleBeatProgress}
            />
          )}
        </div>
      </div>
    </div>
  );
}
