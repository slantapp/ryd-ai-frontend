import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Play,
  SkipForward,
  ChevronRight,
  Menu,
  X,
  Upload,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Split from "react-split";
import {
  FileUploader,
  PreviewSidebar,
  PreviewSkipPanel,
  PreviewQuestion,
  usePreviewAvatar,
  MathCurriculumPreview,
} from "./components";
import CodeEditor from "@/components/courses/exercise/CodeEditor";
import WebCodeWorkspace from "@/components/courses/exercise/WebCodeWorkspace";
import TestResults from "@/components/courses/exercise/TestResults";
import FullscreenModal from "@/components/courses/exercise/FullscreenModal";
import { decodeHandoffSegment, uploadCurriculumFile } from "./handoff";
import type { CodingLesson, CurriculumData, Lesson, Question, CodeExample } from "./types";
import { isMathematicsPreview } from "./types";
import {
  buildSubmitCodeResultLines,
  buildTryCodeResultLines,
  evaluateSubmissionCodeTest,
  runSubmissionCodeOutput,
  submissionHasContent,
} from "@/utils/codeTestRunner";
import { normalizeRunLanguage } from "@/utils/codeExecution/languages";
import { prefetchMonacoEditor } from "@/components/courses/exercise/MonacoEditorLazy";
import {
  defaultWebEditorTab,
  EMPTY_WEB_CODE,
  isWebWorkspaceLanguage,
  seedWebCodeFromExample,
  type WebCodeSources,
} from "@/utils/webCodeWorkspace";
import {
  getTeachingSegments,
  type LessonJumpTarget,
  type TeachingSegmentKind,
} from "./lessonSegments";

type PreviewState = "upload" | "preview";
type LessonPhase = "intro" | "teaching" | "questions" | "complete";
type PublishStatus = "idle" | "uploading" | "published";

export default function CurriculumPreviewPage() {
  const [searchParams] = useSearchParams();
  const handoffCode = searchParams.get("code");
  const [state, setState] = useState<PreviewState>("upload");
  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [currentLesson, setCurrentLesson] = useState<CodingLesson | null>(null);
  const [lessonPhase, setLessonPhase] = useState<LessonPhase>("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [code, setCode] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  const [isTypingLessonCode, setIsTypingLessonCode] = useState(false);
  const [runLanguage, setRunLanguage] = useState("javascript");
  const [webCode, setWebCode] = useState<WebCodeSources>(EMPTY_WEB_CODE);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentSubtitleText, setCurrentSubtitleText] = useState("");
  const [canStartQuestions, setCanStartQuestions] = useState(false);
  const [isLessonCodeDemo, setIsLessonCodeDemo] = useState(false);
  const [teachingSegmentIndex, setTeachingSegmentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState<"editor" | "results" | null>(
    null,
  );
  const lessonStartedRef = useRef(false);
  const codeTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isTypingCodeRef = useRef(false);
  const playTeachingSegmentRef = useRef<
    (lesson: CodingLesson, segment: TeachingSegmentKind) => void
  >(() => {});

  const inferredRunLanguage = useMemo(() => {
    if (lessonPhase === "teaching" && isLessonCodeDemo && currentLesson?.code_example) {
      return normalizeRunLanguage(currentLesson.code_example.language);
    }
    if (lessonPhase === "questions" && currentLesson) {
      const question = currentLesson.questions[currentQuestionIndex];
      if (question?.type === "code_test") {
        return normalizeRunLanguage(question.code_example?.language);
      }
    }
    return "javascript";
  }, [
    currentLesson,
    currentQuestionIndex,
    isLessonCodeDemo,
    lessonPhase,
  ]);

  useEffect(() => {
    setRunLanguage(inferredRunLanguage);
  }, [inferredRunLanguage]);

  const useWebWorkspace = useMemo(() => {
    if (lessonPhase === "teaching" && isLessonCodeDemo && currentLesson?.code_example) {
      return isWebWorkspaceLanguage(currentLesson.code_example.language);
    }
    if (lessonPhase === "questions" && currentLesson) {
      const question = currentLesson.questions[currentQuestionIndex];
      if (question?.type === "code_test") {
        return isWebWorkspaceLanguage(
          question.code_example?.language,
          question.testCriteria,
        );
      }
    }
    return false;
  }, [
    currentLesson,
    currentQuestionIndex,
    isLessonCodeDemo,
    lessonPhase,
  ]);

  const webEditorTab = useMemo(
    () => defaultWebEditorTab(inferredRunLanguage),
    [inferredRunLanguage],
  );

  const resetCodeState = useCallback(() => {
    setCode("");
    setWebCode(EMPTY_WEB_CODE);
    setResults([]);
    setPreviewRefreshKey(0);
  }, []);

  const runCodeOutput = useCallback(
    async (submission: { code: string; webCode?: WebCodeSources; language: string }, criteria?: Question["testCriteria"]) => {
      return runSubmissionCodeOutput(
        { code: submission.code, webCode: submission.webCode, language: submission.language },
        criteria,
      );
    },
    [],
  );

  const runLessonExampleCode = useCallback(
    async (
      submission: { code: string; webCode?: WebCodeSources; language: string },
      criteria?: Question["testCriteria"],
    ) => {
      setIsExecutingCode(true);
      setResults(["⏳ Running code..."]);
      try {
        const runOutput = await runCodeOutput(submission, criteria);
        setResults(runOutput);
      } finally {
        setIsExecutingCode(false);
      }
    },
    [runCodeOutput],
  );

  const getCodeSubmission = useCallback(
    () => ({
      code,
      webCode: useWebWorkspace ? webCode : undefined,
      language: runLanguage,
    }),
    [code, runLanguage, useWebWorkspace, webCode],
  );

  const handoff = (() => {
    if (!handoffCode) {
      return {
        data: null,
        error: "No curriculum preview code found in the URL.",
      };
    }

    try {
      return { data: decodeHandoffSegment(handoffCode), error: null };
    } catch {
      return {
        data: null,
        error: "Invalid curriculum preview code.",
      };
    }
  })();

  const {
    AvatarComponent,
    speak,
    stop,
    scheduleAfterSpeech,
    clearScheduledAfterSpeech,
    isSpeaking,
    currentSubtitle,
    selectedInstructor,
    setSelectedInstructor,
  } = usePreviewAvatar();

  useEffect(() => {
    if (currentSubtitle) {
      setCurrentSubtitleText(currentSubtitle);
    }
  }, [currentSubtitle]);

  const handleCurriculumLoaded = useCallback((data: CurriculumData, file: File) => {
    setCurriculum(data);
    setSourceFile(file);
    setPublishStatus("idle");
    setState("preview");
    if (data.modules.length > 0 && data.modules[0].lessons.length > 0) {
      setCurrentLesson(data.modules[0].lessons[0] as CodingLesson);
    }
    const hasCodeExamples = data.modules.some((mod) =>
      mod.lessons.some(
        (les) =>
          !!(les as CodingLesson).code_example ||
          les.questions.some((q) => q.type === "code_test"),
      ),
    );
    if (hasCodeExamples) prefetchMonacoEditor();
  }, []);

  const handlePublishCurriculum = useCallback(async () => {
    if (!handoff.data || !sourceFile || publishStatus === "uploading") return;

    try {
      setPublishStatus("uploading");
      await uploadCurriculumFile(sourceFile, handoff.data.token);
      setPublishStatus("published");
      toast.success("Curriculum published successfully.");
    } catch (err) {
      setPublishStatus("idle");
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not publish your curriculum. Please try again.",
      );
    }
  }, [handoff.data, publishStatus, sourceFile]);

  const handleSelectLesson = useCallback(
    (lesson: Lesson) => {
      stop();
      setCurrentLesson(lesson as CodingLesson);
      setLessonPhase("intro");
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      resetCodeState();
      setCurrentSubtitleText("");
      setCanStartQuestions(false);
      setIsLessonCodeDemo(false);
      setIsTypingLessonCode(false);
      setIsExecutingCode(false);
      setTeachingSegmentIndex(0);
      lessonStartedRef.current = false;
      clearScheduledAfterSpeech();
      if (codeTypingTimeoutRef.current) {
        clearTimeout(codeTypingTimeoutRef.current);
        codeTypingTimeoutRef.current = null;
      }
      isTypingCodeRef.current = false;
    },
    [resetCodeState, stop, clearScheduledAfterSpeech]
  );

  const stopCodeTyping = useCallback(() => {
    isTypingCodeRef.current = false;
    if (codeTypingTimeoutRef.current) {
      clearTimeout(codeTypingTimeoutRef.current);
      codeTypingTimeoutRef.current = null;
    }
  }, []);

  const speakLessonCodeOutro = useCallback(
    (hasQuestions: boolean) => {
      setIsLessonCodeDemo(false);
      resetCodeState();

      if (hasQuestions) {
        speak(
          "Great! Now let's test your understanding with some questions. Click 'Start Questions' when you're ready.",
        );
        setCanStartQuestions(true);
      } else if (currentLesson?.next_lesson_id) {
        speak("You've completed this lesson! Click 'Next Lesson' to continue.");
      } else {
        speak("Congratulations! You've completed all lessons in this module.");
      }
    },
    [currentLesson?.next_lesson_id, resetCodeState, speak],
  );

  const runLessonCodeExample = useCallback(
    (example: CodeExample, lesson: CodingLesson) => {
      stopCodeTyping();
      setIsLessonCodeDemo(true);
      setIsTypingLessonCode(true);
      setCanStartQuestions(false);
      resetCodeState();

      const isWeb = isWebWorkspaceLanguage(example.language);
      const webTab = defaultWebEditorTab(example.language);
      const hasQuestions = (lesson.questions?.length ?? 0) > 0;
      const typingSpeed = example.typingSpeed ?? 30;
      let currentIndex = 0;

      const proceedAfterExample = () => {
        if (example.explanation) {
          speak(example.explanation);
          scheduleAfterSpeech(() => speakLessonCodeOutro(hasQuestions));
        } else {
          speakLessonCodeOutro(hasQuestions);
        }
      };

      const finishTyping = () => {
        isTypingCodeRef.current = false;
        setIsTypingLessonCode(false);

        if (example.autoRun) {
          if (isWeb) {
            setPreviewRefreshKey((key) => key + 1);
            setResults(["✓ Preview updated."]);
            proceedAfterExample();
          } else {
            void runLessonExampleCode({
              code: example.code,
              webCode: isWeb
                ? seedWebCodeFromExample(example.code, example.language)
                : undefined,
              language: normalizeRunLanguage(example.language),
            }).then(proceedAfterExample);
          }
        } else {
          proceedAfterExample();
        }
      };

      const startTyping = () => {
        isTypingCodeRef.current = true;
        const typeNextChar = () => {
          if (!isTypingCodeRef.current) return;
          if (currentIndex < example.code.length) {
            const partial = example.code.substring(0, currentIndex + 1);
            if (isWeb) {
              setWebCode((prev) => ({ ...prev, [webTab]: partial }));
            } else {
              setCode(partial);
            }
            currentIndex++;
            codeTypingTimeoutRef.current = setTimeout(
              typeNextChar,
              typingSpeed,
            );
          } else {
            finishTyping();
          }
        };
        codeTypingTimeoutRef.current = setTimeout(typeNextChar, 500);
      };

      if (example.description) {
        speak(example.description);
        scheduleAfterSpeech(startTyping);
      } else {
        setTimeout(startTyping, 500);
      }
    },
    [
      resetCodeState,
      runLessonExampleCode,
      scheduleAfterSpeech,
      speak,
      speakLessonCodeOutro,
      stopCodeTyping,
    ],
  );

  const presentQuestion = useCallback(
    (question: Question) => {
      if (question.type === "code_test" && question.code_example) {
        const desc = question.code_example.description || "";
        const explanation = question.code_example.explanation || "";
        const questionText = question.question;
        const fullSpeech = [desc, explanation, questionText]
          .filter(Boolean)
          .join(" ");
        speak(fullSpeech || questionText);
      } else {
        speak(question.question);
      }
    },
    [speak],
  );

  const playTeachingSegment = useCallback(
    (lesson: CodingLesson, segment: TeachingSegmentKind) => {
      const segments = getTeachingSegments(lesson);
      const segmentIndex = segments.indexOf(segment);
      if (segmentIndex >= 0) {
        setTeachingSegmentIndex(segmentIndex);
      }

      const advance = () => {
        const next = segments[segments.indexOf(segment) + 1];
        if (next) {
          playTeachingSegmentRef.current(lesson, next);
        } else {
          speakLessonCodeOutro((lesson.questions?.length ?? 0) > 0);
        }
      };

      switch (segment) {
        case "intro":
          speak(
            `Welcome! In this lesson, you will be learning about ${lesson.title}.`,
          );
          scheduleAfterSpeech(advance);
          break;
        case "body":
          speak(lesson.body!);
          scheduleAfterSpeech(advance);
          break;
        case "avatar_script":
          speak(lesson.avatar_script!);
          scheduleAfterSpeech(advance);
          break;
        case "code_example":
          if (lesson.code_example) {
            runLessonCodeExample(lesson.code_example, lesson);
          } else {
            advance();
          }
          break;
      }
    },
    [runLessonCodeExample, scheduleAfterSpeech, speak, speakLessonCodeOutro],
  );

  useEffect(() => {
    playTeachingSegmentRef.current = playTeachingSegment;
  }, [playTeachingSegment]);

  const jumpToTarget = useCallback(
    (target: LessonJumpTarget) => {
      if (!currentLesson) return;

      stop();
      stopCodeTyping();
      clearScheduledAfterSpeech();
      setCurrentSubtitleText("");
      setCanStartQuestions(false);
      setIsLessonCodeDemo(false);
      setIsTypingLessonCode(false);
      setIsExecutingCode(false);
      resetCodeState();
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      lessonStartedRef.current = true;

      if (target.type === "teaching") {
        setLessonPhase("teaching");
        playTeachingSegment(currentLesson, target.segment);
        return;
      }

      setLessonPhase("questions");
      setCurrentQuestionIndex(target.index);
      presentQuestion(currentLesson.questions[target.index]);
    },
    [clearScheduledAfterSpeech, currentLesson, playTeachingSegment, presentQuestion, resetCodeState, stop, stopCodeTyping],
  );

  const startLesson = useCallback(() => {
    if (!currentLesson || lessonStartedRef.current) return;
    lessonStartedRef.current = true;
    setLessonPhase("teaching");
    setCanStartQuestions(false);
    setTeachingSegmentIndex(0);

    const segments = getTeachingSegments(currentLesson);
    playTeachingSegment(currentLesson, segments[0]);
  }, [currentLesson, playTeachingSegment]);

  const startQuestions = useCallback(() => {
    if (!currentLesson || currentLesson.questions.length === 0 || !canStartQuestions) return;
    stopCodeTyping();
    setIsLessonCodeDemo(false);
    setLessonPhase("questions");
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    resetCodeState();
    setCanStartQuestions(false);

    const question = currentLesson.questions[0];
    presentQuestion(question);
  }, [currentLesson, canStartQuestions, presentQuestion, resetCodeState, stopCodeTyping]);

  const handleSubmitAnswer = useCallback(() => {
    if (!currentLesson || selectedAnswer === null) return;

    const question = currentLesson.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.answer;

    setIsAnswerSubmitted(true);

    let feedbackText = "";
    if (question.type === "multiple_choice") {
      feedbackText = isCorrect
        ? `Correct! Well done. ${question.explanation || ""}`
        : `Incorrect. The correct answer is ${question.answer}. ${question.explanation || ""}`;
    } else if (question.type === "true_false") {
      feedbackText = isCorrect
        ? `Correct! Well done. ${question.explanation || ""}`
        : `Incorrect. The correct answer is ${question.answer ? "True" : "False"}. ${question.explanation || ""}`;
    }

    speak(feedbackText);
  }, [currentLesson, currentQuestionIndex, selectedAnswer, speak]);

  const handleNextQuestion = useCallback(() => {
    if (!currentLesson) return;

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < currentLesson.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      resetCodeState();

      const question = currentLesson.questions[nextIndex];
      presentQuestion(question);
    } else {
      setLessonPhase("complete");
      setCompletedLessons((prev) => new Set([...prev, currentLesson.id]));
      speak("Great job! You've completed this lesson.");
    }
  }, [currentLesson, currentQuestionIndex, presentQuestion, resetCodeState, speak]);

  const getNextLesson = useCallback((): CodingLesson | null => {
    if (!curriculum || !currentLesson) return null;

    let foundCurrent = false;
    for (const module of curriculum.modules) {
      for (let i = 0; i < module.lessons.length; i++) {
        if (foundCurrent) {
          return module.lessons[i];
        }
        if (module.lessons[i].id === currentLesson.id) {
          foundCurrent = true;
          if (i + 1 < module.lessons.length) {
            return module.lessons[i + 1] as CodingLesson;
          }
        }
      }
    }
    return null;
  }, [curriculum, currentLesson]);

  const handleNextLesson = useCallback(() => {
    if (!curriculum || !currentLesson) return;

    stop();
    const nextLesson = getNextLesson();

    if (nextLesson) {
      setCurrentLesson(nextLesson);
      setLessonPhase("teaching");
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      resetCodeState();
      setCurrentSubtitleText("");
      setCanStartQuestions(false);
      setIsLessonCodeDemo(false);
      setIsTypingLessonCode(false);
      setIsExecutingCode(false);
      setTeachingSegmentIndex(0);
      lessonStartedRef.current = true;

      const segments = getTeachingSegments(nextLesson);
      playTeachingSegment(nextLesson, segments[0]);
    } else {
      speak("Congratulations! You've completed all lessons in this curriculum.");
    }
  }, [curriculum, currentLesson, getNextLesson, playTeachingSegment, resetCodeState, speak, stop]);

  const handleRunLessonCode = useCallback(() => {
    if (!currentLesson?.code_example || isTypingLessonCode || isExecutingCode) return;

    if (useWebWorkspace) {
      setPreviewRefreshKey((key) => key + 1);
      setResults(["✓ Preview updated."]);
      return;
    }

    void runLessonExampleCode(getCodeSubmission());
  }, [
    currentLesson?.code_example,
    getCodeSubmission,
    isExecutingCode,
    isTypingLessonCode,
    runLessonExampleCode,
    useWebWorkspace,
  ]);

  /** Validate code against criteria without submitting the final answer. */
  const handleCodeTest = useCallback(async () => {
    if (!currentLesson || isAnswerSubmitted || isExecutingCode) return;

    const question = currentLesson.questions[currentQuestionIndex];
    if (!question || question.type !== "code_test") return;

    const submission = getCodeSubmission();

    if (useWebWorkspace) {
      setPreviewRefreshKey((key) => key + 1);
    } else {
      setIsExecutingCode(true);
      setResults(["⏳ Running code..."]);
    }

    try {
      const runOutput = useWebWorkspace
        ? []
        : await runCodeOutput(submission, question.testCriteria);
      const { passed, testResults } = evaluateSubmissionCodeTest(
        submission,
        question.testCriteria,
      );
      setResults(
        buildTryCodeResultLines(runOutput, passed, testResults, {
          web: useWebWorkspace,
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setResults([`⚠️ Error: ${errorMessage}`]);
    } finally {
      if (!useWebWorkspace) {
        setIsExecutingCode(false);
      }
    }
  }, [
    currentLesson,
    currentQuestionIndex,
    getCodeSubmission,
    isAnswerSubmitted,
    isExecutingCode,
    runCodeOutput,
    useWebWorkspace,
  ]);

  const handleCodeSubmit = useCallback(async () => {
    if (!currentLesson || isAnswerSubmitted || isExecutingCode) return;

    const question = currentLesson.questions[currentQuestionIndex];
    if (!question || question.type !== "code_test") return;

    const submission = getCodeSubmission();

    if (useWebWorkspace) {
      setPreviewRefreshKey((key) => key + 1);
    } else {
      setIsExecutingCode(true);
      setResults(["⏳ Running code..."]);
    }

    try {
      const runOutput = useWebWorkspace
        ? []
        : await runCodeOutput(submission, question.testCriteria);
      const { passed, testResults } = evaluateSubmissionCodeTest(
        submission,
        question.testCriteria,
      );
      setResults(buildSubmitCodeResultLines(runOutput, passed, testResults));
      setIsAnswerSubmitted(true);

      if (passed) {
        speak(`Correct! Well done. ${question.explanation || ""}`);
      } else {
        speak(
          useWebWorkspace
            ? "That's not quite right. Check your HTML, CSS, and JavaScript."
            : "That's not quite right. Check your code and try again.",
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setResults([`⚠️ Error: ${errorMessage}`]);
      setIsAnswerSubmitted(true);
      speak(`There was an error running your code: ${errorMessage}`);
    } finally {
      if (!useWebWorkspace) {
        setIsExecutingCode(false);
      }
    }
  }, [
    currentLesson,
    currentQuestionIndex,
    getCodeSubmission,
    isAnswerSubmitted,
    isExecutingCode,
    runCodeOutput,
    speak,
    useWebWorkspace,
  ]);

  const handleBackToUpload = useCallback(() => {
    stop();
    setState("upload");
    setCurriculum(null);
    setSourceFile(null);
    setPublishStatus("idle");
    setCurrentLesson(null);
    setLessonPhase("intro");
    setCompletedLessons(new Set());
    lessonStartedRef.current = false;
  }, [stop]);

  const activeSkipItemId = useMemo(() => {
    if (!currentLesson) return null;
    if (lessonPhase === "questions") {
      return `question-${currentQuestionIndex}`;
    }
    if (lessonPhase === "teaching") {
      if (isLessonCodeDemo) return "teaching-code_example";
      const segment = getTeachingSegments(currentLesson)[teachingSegmentIndex];
      return segment ? `teaching-${segment}` : null;
    }
    return null;
  }, [
    currentLesson,
    currentQuestionIndex,
    isLessonCodeDemo,
    lessonPhase,
    teachingSegmentIndex,
  ]);

  if (handoff.error || !handoff.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-primary/10 via-white to-primary/5 p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <X className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Curriculum Preview Unavailable
          </h1>
          <p className="mt-2 text-sm text-gray-600">{handoff.error}</p>
        </div>
      </div>
    );
  }

  if (state === "upload") {
    return (
      <FileUploader
        handoffName={handoff.data.name}
        onCurriculumLoaded={handleCurriculumLoaded}
      />
    );
  }

  if (curriculum && isMathematicsPreview(curriculum)) {
    return (
      <MathCurriculumPreview
        curriculum={curriculum}
        sourceFile={sourceFile}
        publishStatus={publishStatus}
        onPublish={() => void handlePublishCurriculum()}
        onBackToUpload={handleBackToUpload}
      />
    );
  }

  if (!curriculum || !currentLesson) {
    return (
      <div className="flex h-screen items-center justify-center ">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const currentQuestion = currentLesson.questions[currentQuestionIndex];
  const isCodeQuestion = currentQuestion?.type === "code_test";

  return (
    <div className="flex h-screen min-h-0 bg-gray-100">
      {/* Mobile sidebar toggle */}
      <button
        type="button"
        onClick={() => setShowSidebar(!showSidebar)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-lg lg:hidden"
      >
        {showSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex h-full min-h-0 w-80 shrink-0 flex-col transform border-r border-gray-200 bg-white shadow-lg transition-transform lg:relative lg:translate-x-0 ${showSidebar ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 space-y-3 border-b border-gray-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleBackToUpload}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
              >
                <Upload className="h-4 w-4" />
                Upload New
              </button>
              <select
                value={selectedInstructor}
                onChange={(e) =>
                  setSelectedInstructor(e.target.value as "woman" | "man")
                }
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
              >
                <option value="woman">Female Instructor</option>
                <option value="man">Male Instructor</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handlePublishCurriculum()}
              disabled={
                !sourceFile ||
                publishStatus === "uploading" ||
                publishStatus === "published"
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {publishStatus === "uploading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
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
            {publishStatus === "idle" && (
              <p className="text-xs leading-relaxed text-gray-500">
                Preview your lessons first. When you are satisfied, publish to
                save this curriculum.
              </p>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <PreviewSidebar
              curriculum={curriculum}
              currentLesson={currentLesson}
              onSelectLesson={handleSelectLesson}
              completedLessons={completedLessons}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900">{currentLesson.title}</h1>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
              {lessonPhase === "intro"
                ? "Ready to start"
                : lessonPhase === "teaching"
                  ? "Learning"
                  : lessonPhase === "questions"
                    ? `Question ${currentQuestionIndex + 1}/${currentLesson.questions.length}`
                    : "Complete"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lessonPhase === "intro" && (
              <button
                type="button"
                onClick={startLesson}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary/90"
              >
                <Play className="h-4 w-4" />
                Start Lesson
              </button>
            )}

            {lessonPhase === "teaching" && (
              <button
                type="button"
                onClick={startQuestions}
                disabled={!canStartQuestions || currentLesson.questions.length === 0}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${canStartQuestions && currentLesson.questions.length > 0
                  ? "bg-primary text-white shadow-md shadow-primary/25 hover:bg-primary/90"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
              >
                <SkipForward className="h-4 w-4" />
                {currentLesson.questions.length === 0
                  ? "No Questions"
                  : canStartQuestions
                    ? "Start Questions"
                    : "Listening..."}
              </button>
            )}

            {lessonPhase === "questions" && isAnswerSubmitted && !isCodeQuestion && (
              <button
                type="button"
                onClick={handleNextQuestion}
                disabled={isSpeaking}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
                {currentQuestionIndex + 1 < currentLesson.questions.length
                  ? "Next Question"
                  : "Complete Lesson"}
              </button>
            )}

            {lessonPhase === "complete" && (
              <button
                type="button"
                onClick={handleNextLesson}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-green-500/25 transition-all hover:bg-green-700"
              >
                <ChevronRight className="h-4 w-4" />
                Next Lesson
              </button>
            )}
          </div>
        </div>

        <PreviewSkipPanel
          lesson={currentLesson}
          activeItemId={activeSkipItemId}
          onJump={jumpToTarget}
        />

        {/* Content area */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Avatar panel */}
          <div className="flex w-80 flex-col border-r border-gray-200 bg-linear-to-b from-primary/10 to-white">
            <div className="flex-1 p-4">
              <div className="h-64 overflow-hidden rounded-xl border border-primary/20 bg-white shadow-inner">
                <AvatarComponent className="h-full w-full" />
              </div>

              {/* Subtitle display */}
              {isSpeaking && currentSubtitleText && (
                <div className="mt-4 rounded-xl bg-white p-4 shadow-sm border border-primary/15">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-primary">Speaking...</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{currentSubtitleText}</p>
                </div>
              )}
            </div>

          </div>

          {/* Main panel */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {lessonPhase === "intro" || (lessonPhase === "teaching" && !isLessonCodeDemo) ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-2xl">
                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900">{currentLesson.title}</h2>
                    <div className="mt-4 prose max-w-none">
                      <p className="text-gray-700 leading-relaxed">{currentLesson.body}</p>
                    </div>
                    {currentLesson.avatar_script && currentLesson.avatar_script !== currentLesson.body && (
                      <div className="mt-6 rounded-lg bg-primary/10 p-4 border-l-4 border-primary">
                        <h3 className="font-semibold text-primary mb-2">What the instructor will say:</h3>
                        <p className="text-gray-700 text-sm leading-relaxed">{currentLesson.avatar_script}</p>
                      </div>
                    )}
                    {currentLesson.code_example && lessonPhase === "intro" && (
                      <div className="mt-6 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
                        <p className="text-sm text-gray-600">
                          This lesson includes a live code example after the instructor finishes the lesson script.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : lessonPhase === "teaching" && isLessonCodeDemo ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
                <div className="mb-3 rounded-xl border border-primary/15 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                    Code example
                  </p>
                  <h3 className="font-semibold text-gray-900">{currentLesson.title}</h3>
                  {currentLesson.code_example?.description && (
                    <p className="mt-1 text-sm text-gray-600">
                      {currentLesson.code_example.description}
                    </p>
                  )}
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {useWebWorkspace ? (
                    <WebCodeWorkspace
                      sources={webCode}
                      onSourcesChange={setWebCode}
                      onTestCode={handleRunLessonCode}
                      onToggleFullscreen={() =>
                        setFullscreen(
                          fullscreen === "editor" ? null : "editor",
                        )
                      }
                      isFullscreen={fullscreen === "editor"}
                      canTest={
                        !isTypingLessonCode &&
                        submissionHasContent(getCodeSubmission(), undefined)
                      }
                      results={results}
                      previewRefreshKey={previewRefreshKey}
                      initialTab={webEditorTab}
                    />
                  ) : (
                    <Split
                      direction="vertical"
                      className="flex h-full min-h-[320px] w-full flex-col"
                      sizes={[55, 45]}
                      minSize={120}
                      gutterSize={8}
                    >
                      <CodeEditor
                        code={code}
                        onCodeChange={setCode}
                        onTestCode={handleRunLessonCode}
                        language={runLanguage}
                        onLanguageChange={setRunLanguage}
                        onToggleFullscreen={() =>
                          setFullscreen(
                            fullscreen === "editor" ? null : "editor",
                          )
                        }
                        isFullscreen={fullscreen === "editor"}
                        canTest={
                          !isTypingLessonCode &&
                          !isExecutingCode &&
                          code.trim().length > 0
                        }
                        isRunning={isExecutingCode}
                        canSubmit={false}
                      />
                      <TestResults
                        results={results}
                        code={code}
                        onToggleFullscreen={() =>
                          setFullscreen(
                            fullscreen === "results" ? null : "results",
                          )
                        }
                        isFullscreen={fullscreen === "results"}
                      />
                    </Split>
                  )}
                </div>
              </div>
            ) : lessonPhase === "questions" && currentQuestion ? (
              isCodeQuestion ? (
                <div className="flex flex-1 overflow-hidden">
                  <div className="flex flex-1 flex-col">
                    <div className="border-b border-gray-200 bg-white p-4">
                      <h3 className="font-semibold text-gray-900">{currentQuestion.question}</h3>
                      {currentQuestion.code_example && (
                        <div className="mt-3 rounded-lg bg-gray-100 p-3">
                          <p className="text-sm text-gray-600 mb-2">{currentQuestion.code_example.description}</p>
                          <pre className="text-xs text-gray-800 overflow-x-auto">
                            {currentQuestion.code_example.code}
                          </pre>
                        </div>
                      )}
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
                      {useWebWorkspace ? (
                        <WebCodeWorkspace
                          sources={webCode}
                          onSourcesChange={setWebCode}
                          onTestCode={() => void handleCodeSubmit()}
                          onTryOut={() => void handleCodeTest()}
                          onToggleFullscreen={() =>
                            setFullscreen(
                              fullscreen === "editor" ? null : "editor",
                            )
                          }
                          isFullscreen={fullscreen === "editor"}
                          canTest={
                            !isAnswerSubmitted &&
                            submissionHasContent(
                              getCodeSubmission(),
                              currentQuestion.testCriteria,
                            )
                          }
                          canSubmit={
                            submissionHasContent(
                              getCodeSubmission(),
                              currentQuestion.testCriteria,
                            ) && !isAnswerSubmitted
                          }
                          results={results}
                          previewRefreshKey={previewRefreshKey}
                          initialTab={webEditorTab}
                        />
                      ) : (
                        <Split
                          direction="vertical"
                          className="flex h-full min-h-[320px] w-full flex-col"
                          sizes={[55, 45]}
                          minSize={120}
                          gutterSize={8}
                        >
                          <CodeEditor
                            code={code}
                            onCodeChange={setCode}
                            onTestCode={() => void handleCodeSubmit()}
                            onTryOut={() => void handleCodeTest()}
                            language={runLanguage}
                            onLanguageChange={setRunLanguage}
                            onToggleFullscreen={() =>
                              setFullscreen(
                                fullscreen === "editor" ? null : "editor",
                              )
                            }
                            isFullscreen={fullscreen === "editor"}
                            canTest={
                              !isAnswerSubmitted &&
                              !isExecutingCode &&
                              submissionHasContent(
                                getCodeSubmission(),
                                currentQuestion.testCriteria,
                              )
                            }
                            canSubmit={
                              submissionHasContent(
                                getCodeSubmission(),
                                currentQuestion.testCriteria,
                              ) &&
                              !isAnswerSubmitted &&
                              !isExecutingCode
                            }
                            isRunning={isExecutingCode}
                          />
                          <TestResults
                            results={results}
                            code={code}
                            onToggleFullscreen={() =>
                              setFullscreen(
                                fullscreen === "results" ? null : "results",
                              )
                            }
                            isFullscreen={fullscreen === "results"}
                          />
                        </Split>
                      )}
                    </div>
                    {fullscreen && !useWebWorkspace && (
                      <FullscreenModal
                        type={fullscreen}
                        code={code}
                        results={results}
                        onClose={() => setFullscreen(null)}
                        onCodeChange={setCode}
                      />
                    )}
                    {isAnswerSubmitted && (
                      <div className="border-t border-gray-200 bg-white p-4">
                        <button
                          type="button"
                          onClick={handleNextQuestion}
                          disabled={isSpeaking}
                          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 font-semibold text-white transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                          <ChevronRight className="h-5 w-5" />
                          {currentQuestionIndex + 1 < currentLesson.questions.length
                            ? "Next Question"
                            : "Complete Lesson"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="mx-auto max-w-2xl">
                    <div className="rounded-xl bg-white p-6 shadow-sm">
                      <PreviewQuestion
                        question={currentQuestion}
                        selectedAnswer={selectedAnswer}
                        onSelectAnswer={setSelectedAnswer}
                        isSubmitted={isAnswerSubmitted}
                        onSubmit={handleSubmitAnswer}
                        disabled={isSpeaking}
                      />
                    </div>
                  </div>
                </div>
              )
            ) : lessonPhase === "complete" ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Lesson Complete!</h2>
                  <p className="mt-2 text-gray-600">
                    You've finished "{currentLesson.title}"
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Answered {currentLesson.questions.length} questions
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
