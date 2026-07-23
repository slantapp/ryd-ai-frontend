import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Menu,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { usePreviewAvatar } from "../../components/PreviewAvatar";
import { prefetchMonacoEditor } from "@/components/courses/exercise/MonacoEditorLazy";
import type { PublishStatus } from "../../types";
import {
  findLessonV2ById,
  getFirstLessonV2,
  getNextLessonV2,
} from "../navigation";
import type { CurriculumV2Data, LessonV2 } from "../types";
import { LessonPlayer } from "./LessonPlayer";
import { V2Sidebar } from "./V2Sidebar";

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
  const [currentLesson, setCurrentLesson] = useState<LessonV2 | null>(
    () => getFirstLessonV2(curriculum),
  );
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set(),
  );
  const [showSidebar, setShowSidebar] = useState(true);
  const [lessonKey, setLessonKey] = useState(0);

  const {
    AvatarComponent,
    speak,
    stop,
    scheduleAfterSpeech,
    clearScheduledAfterSpeech,
    isSpeaking,
    currentSubtitle,
    isInstructorWaiting,
    selectedInstructor,
    setSelectedInstructor,
  } = usePreviewAvatar();

  const allLessons = useMemo(
    () => curriculum.modules.flatMap((m) => m.lessons),
    [curriculum.modules],
  );

  const lessonOrdinal = useMemo(() => {
    if (!currentLesson) return 1;
    const idx = allLessons.findIndex((l) => l.id === currentLesson.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [allLessons, currentLesson]);

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

  const selectLesson = useCallback(
    (lesson: LessonV2) => {
      stop();
      clearScheduledAfterSpeech();
      setCurrentLesson(lesson);
      setLessonKey((k) => k + 1);
      setShowSidebar(false);
    },
    [clearScheduledAfterSpeech, stop],
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

      {/* Course outline — CodeKids-style sidebar */}
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

      {/* Main stage — full height learning space */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
          currentSubtitle={currentSubtitle}
          avatarSlot={<AvatarComponent className="h-full w-full" />}
          onLessonComplete={handleLessonComplete}
          onNextLesson={handleNextLesson}
          isInstructorWaiting={isInstructorWaiting}
        />
      </div>
    </div>
  );
}
