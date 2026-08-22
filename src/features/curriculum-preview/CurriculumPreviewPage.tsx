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
  Mic,
  Volume2,
  Pause,
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
import { PageLoadWaitBanner } from "@/components/courses/exercise/PageLoadWaitBanner";
import { MobileCollapsible } from "@/components/courses/exercise/MobileCollapsible";
import {
  editorConsoleMinSizes,
  editorConsoleSplitSizes,
} from "@/components/courses/exercise/codeWorkspaceLayout";
import { MOBILE_INSTRUCTOR_AUDIO_BUTTON, MOBILE_INSTRUCTOR_AUDIO_HINT } from "@/constants/mobileInstructorAudio";
import { useMediaQueryMinLg } from "@/hooks/useMediaQueryMinLg";
import { cn } from "@/lib/utils";
import {
  decodeCurriculumCode,
  decodeHandoffSegment,
  fetchCurriculumPreview,
  uploadCurriculumFile,
} from "./handoff";
import type { CodingLesson, CurriculumData, Lesson, Question, CodeExample } from "./types";
import { isMathematicsPreview } from "./types";
import {
  CurriculumV2Preview,
  isCurriculumV2,
  extractCurriculumV2Data,
  type CurriculumV2Data,
  type PreviewLoadResult,
} from "./v2";
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
  buildWebCodeFromExample,
  defaultWebEditorTab,
  EMPTY_WEB_CODE,
  isWebWorkspaceLanguage,
  webCodeForExampleDemoStart,
  webCodeForExamplePractice,
  webCodeForExampleTyping,
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

type RemoteLoadStatus = "idle" | "loading" | "success" | "error";

export default function CurriculumPreviewPage() {
  const [searchParams] = useSearchParams();
  const isLgUp = useMediaQueryMinLg();
  const curriculumCodeParam = searchParams.get("curriculumCode");
  const handoffCode = searchParams.get("code");
  const isRemotePreview = Boolean(curriculumCodeParam?.trim());

  const remotePreviewMeta = useMemo(() => {
    if (!curriculumCodeParam?.trim()) {
      return { data: null as ReturnType<typeof decodeCurriculumCode> | null, error: null as string | null };
    }
    try {
      return { data: decodeCurriculumCode(curriculumCodeParam.trim()), error: null };
    } catch {
      return {
        data: null,
        error: "Invalid curriculum preview code.",
      };
    }
  }, [curriculumCodeParam]);

  const handoff = useMemo(() => {
    if (isRemotePreview) {
      return { data: remotePreviewMeta.data, error: remotePreviewMeta.error };
    }
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
  }, [handoffCode, isRemotePreview, remotePreviewMeta.data, remotePreviewMeta.error]);

  const [state, setState] = useState<PreviewState>(() =>
    isRemotePreview ? "preview" : "upload",
  );
  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
  const [v2Curriculum, setV2Curriculum] = useState<CurriculumV2Data | null>(null);
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
  const [remoteLoadStatus, setRemoteLoadStatus] =
    useState<RemoteLoadStatus>("idle");
  const [remoteLoadError, setRemoteLoadError] = useState<string | null>(null);
  const lessonStartedRef = useRef(false);
  const codeTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isTypingCodeRef = useRef(false);
  const playTeachingSegmentRef = useRef<
    (lesson: CodingLesson, segment: TeachingSegmentKind) => void
  >(() => { });

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

  const applyCurriculumData = useCallback((data: CurriculumData) => {
    setV2Curriculum(null);
    setCurriculum(data);
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

  const applyV2CurriculumData = useCallback((data: CurriculumV2Data) => {
    setCurriculum(null);
    setCurrentLesson(null);
    setV2Curriculum(data);
    setPublishStatus("idle");
    setState("preview");
  }, []);

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
    setDefaultShow,
  } = usePreviewAvatar({ lessonActive: lessonPhase !== "intro" });

  useEffect(() => {
    setDefaultShow(currentLesson?.avatar_show);
  }, [currentLesson, setDefaultShow]);

  useEffect(() => {
    if (currentSubtitle) {
      setCurrentSubtitleText(currentSubtitle);
    }
  }, [currentSubtitle]);

  const handleCurriculumLoaded = useCallback(
    (result: PreviewLoadResult) => {
      setSourceFile(result.file);
      if (result.version === 2) {
        applyV2CurriculumData(result.data);
      } else {
        applyCurriculumData(result.data);
      }
    },
    [applyCurriculumData, applyV2CurriculumData],
  );

  useEffect(() => {
    if (!isRemotePreview || !remotePreviewMeta.data) return;

    let cancelled = false;
    setRemoteLoadStatus("loading");
    setRemoteLoadError(null);

    void (async () => {
      try {
        const data = await fetchCurriculumPreview(
          remotePreviewMeta.data!.curriculumId,
        );
        if (cancelled) return;
        if (isCurriculumV2(data) || isCurriculumV2({ curriculum: data })) {
          const extracted = extractCurriculumV2Data(
            isCurriculumV2(data) ? data : { curriculum: data, schema_version: 2 },
          );
          applyV2CurriculumData(extracted.data);
        } else {
          applyCurriculumData(data);
        }
        setRemoteLoadStatus("success");
      } catch (error) {
        if (cancelled) return;
        setRemoteLoadStatus("error");
        setRemoteLoadError(
          error instanceof Error
            ? error.message
            : "Could not load curriculum preview.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    applyCurriculumData,
    applyV2CurriculumData,
    isRemotePreview,
    remotePreviewMeta.data,
  ]);

  const handlePublishCurriculum = useCallback(async () => {
    if (
      !handoff.data ||
      !sourceFile ||
      publishStatus === "uploading" ||
      isRemotePreview ||
      !("token" in handoff.data)
    ) {
      return;
    }

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
  }, [handoff.data, isRemotePreview, publishStatus, sourceFile]);

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
      const hasQuestions = (lesson.questions?.length ?? 0) > 0;
      const typingSpeed = example.typingSpeed ?? 30;
      let currentIndex = 0;

      if (isWeb) {
        setWebCode(webCodeForExampleDemoStart(example));
      }

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
                ? buildWebCodeFromExample(example, "demo")
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
              setWebCode(webCodeForExampleTyping(example, partial));
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

  const applyQuestionPracticeEditor = useCallback((question: Question) => {
    const example = question.code_example;
    setResults([]);
    setPreviewRefreshKey(0);
    if (
      example &&
      isWebWorkspaceLanguage(example.language, question.testCriteria)
    ) {
      setWebCode(webCodeForExamplePractice(example));
      setCode("");
    } else {
      setWebCode(EMPTY_WEB_CODE);
      setCode(example?.starterCode?.trim() ?? "");
    }
  }, []);

  const runQuestionCodeExample = useCallback(
    (example: CodeExample, question: Question) => {
      stopCodeTyping();
      setIsLessonCodeDemo(false);
      resetCodeState();

      const isWeb = isWebWorkspaceLanguage(
        example.language,
        question.testCriteria,
      );
      const typingSpeed = example.typingSpeed ?? 30;
      let currentIndex = 0;

      if (isWeb) {
        setWebCode(webCodeForExampleDemoStart(example));
      }

      const handoffToStudent = () => {
        applyQuestionPracticeEditor(question);
        speak(question.question);
      };

      const finishTyping = () => {
        isTypingCodeRef.current = false;
        setIsTypingLessonCode(false);
        if (example.explanation) {
          speak(example.explanation);
          scheduleAfterSpeech(handoffToStudent);
        } else {
          handoffToStudent();
        }
      };

      const startTyping = () => {
        isTypingCodeRef.current = true;
        setIsTypingLessonCode(true);
        const typeNextChar = () => {
          if (!isTypingCodeRef.current) return;
          if (currentIndex < example.code.length) {
            const partial = example.code.substring(0, currentIndex + 1);
            if (isWeb) {
              setWebCode(webCodeForExampleTyping(example, partial));
            } else {
              setCode(partial);
            }
            currentIndex++;
            codeTypingTimeoutRef.current = setTimeout(typeNextChar, typingSpeed);
          } else {
            finishTyping();
          }
        };
        codeTypingTimeoutRef.current = setTimeout(typeNextChar, 500);
      };

      const desc = example.description || "";
      if (desc) {
        speak(desc);
        scheduleAfterSpeech(startTyping);
      } else {
        setTimeout(startTyping, 500);
      }
    },
    [
      applyQuestionPracticeEditor,
      resetCodeState,
      scheduleAfterSpeech,
      speak,
      stopCodeTyping,
    ],
  );

  const presentQuestion = useCallback(
    (question: Question) => {
      if (question.type === "code_test" && question.code_example) {
        runQuestionCodeExample(question.code_example, question);
        return;
      }
      speak(question.question);
    },
    [runQuestionCodeExample, speak],
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
    unlockMobileAudio();
    lessonStartedRef.current = true;
    setLessonPhase("teaching");
    setCanStartQuestions(false);
    setTeachingSegmentIndex(0);

    const segments = getTeachingSegments(currentLesson);
    playTeachingSegment(currentLesson, segments[0]);
  }, [currentLesson, playTeachingSegment, unlockMobileAudio]);

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
    setV2Curriculum(null);
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

  if (isRemotePreview && remoteLoadStatus === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-primary/10 via-white to-primary/5 p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <X className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Could Not Load Curriculum
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {remoteLoadError || "The curriculum preview could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  if (
    isRemotePreview &&
    (remoteLoadStatus === "loading" || remoteLoadStatus === "idle") &&
    !curriculum &&
    !v2Curriculum
  ) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-gray-600">Loading curriculum preview…</p>
      </div>
    );
  }

  if (!isRemotePreview && state === "upload") {
    return (
      <FileUploader
        handoffName={
          handoff.data && "name" in handoff.data ? handoff.data.name : undefined
        }
        onCurriculumLoaded={handleCurriculumLoaded}
      />
    );
  }

  if (v2Curriculum) {
    return (
      <CurriculumV2Preview
        curriculum={v2Curriculum}
        sourceFile={sourceFile}
        isRemotePreview={isRemotePreview}
        publishStatus={publishStatus}
        onPublish={() => void handlePublishCurriculum()}
        onBackToUpload={isRemotePreview ? undefined : handleBackToUpload}
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
  const isCodeTestQuestionActive =
    lessonPhase === "questions" && isCodeQuestion;

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
              {!isRemotePreview ? (
                <button
                  type="button"
                  onClick={handleBackToUpload}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                >
                  <Upload className="h-4 w-4" />
                  Upload New
                </button>
              ) : (
                <p className="text-sm font-medium text-gray-700">
                  Curriculum preview
                </p>
              )}
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
            {!isRemotePreview && (
              <>
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
              </>
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-white shadow-lg">
          <PageLoadWaitBanner
            isLoading={isInstructorWaiting && !showMobileAudioUnlock}
            mobileOnly={false}
          />

          {lessonPhase === "intro" ? (
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
                    {currentLesson.title}
                  </p>
                  <p className="mb-6 font-inter leading-relaxed text-gray-500">
                    This matches what students see. Tap below to start the lesson.
                  </p>
                  <button
                    type="button"
                    onClick={startLesson}
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
            <>
              <PreviewSkipPanel
                lesson={currentLesson}
                activeItemId={activeSkipItemId}
                onJump={jumpToTarget}
              />

              <div className="relative min-h-0 flex-1 overflow-hidden">
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
                      "relative box-border flex h-full min-h-0 flex-col overflow-y-auto scrollbar-hide",
                      isLgUp ? "px-5 py-4 sm:px-6 sm:py-5" : "min-w-0",
                    )}
                  >
                    {isLgUp ? (
                      <>
                        {!isCodeTestQuestionActive ? (
                          <div className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden sm:mt-4">
                            <div className="flex h-full min-h-0 min-w-0 w-full items-center justify-center sm:justify-start">
                              {renderAvatar("h-full w-full", false)}
                            </div>
                          </div>
                        ) : (
                          <div className="pointer-events-none invisible absolute inset-0">
                            {renderAvatar("h-full w-full", false)}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>

                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    {!isLgUp && (
                      <div className="shrink-0 border-b border-primary/10 bg-white/95 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-white/80">
                        <div className="flex items-center gap-3 px-3 py-2">
                          <div className="relative flex size-11 shrink-0 items-center justify-center">
                            {isSpeaking && !isPaused ? (
                              <>
                                <span className="absolute inline-flex size-[120%] animate-ping rounded-full bg-primary/30" />
                                <span className="absolute inline-flex size-full rounded-full bg-primary/20" />
                              </>
                            ) : null}
                            <div
                              className={cn(
                                "relative flex size-9 items-center justify-center rounded-xl border-2 bg-white shadow-md",
                                isSpeaking && !isPaused
                                  ? "border-primary shadow-primary/25"
                                  : "border-primary/25",
                              )}
                            >
                              <Mic className="size-[1.15rem] text-primary" aria-hidden />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary/80">
                              Instructor audio
                            </p>
                            <p className="truncate text-xs text-gray-600">
                              {isSpeaking && !isPaused
                                ? currentSubtitleText || "Speaking…"
                                : isPaused
                                  ? currentSubtitleText || "Paused"
                                  : "Ready when you are"}
                            </p>
                          </div>
                          {(isSpeaking || isPaused) && (
                            <button
                              type="button"
                              onClick={togglePause}
                              className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
                            >
                              {isPaused ? (
                                <Play className="size-3.5" aria-hidden />
                              ) : (
                                <Pause className="size-3.5" aria-hidden />
                              )}
                              {isPaused ? "Resume" : "Pause"}
                            </button>
                          )}
                        </div>
                        {showMobileAudioUnlock ? (
                          <div className="border-t border-primary/15 bg-linear-to-b from-primary/10 to-primary/5 px-3 py-3">
                            <p className="mb-2.5 text-center text-[0.7rem] leading-snug text-gray-600">
                              {MOBILE_INSTRUCTOR_AUDIO_HINT}
                            </p>
                            <button
                              type="button"
                              onClick={unlockMobileAudio}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
                            >
                              <Volume2 className="h-5 w-5 shrink-0" aria-hidden />
                              <span>{MOBILE_INSTRUCTOR_AUDIO_BUTTON}</span>
                            </button>
                          </div>
                        ) : null}
                        {lessonPhase === "teaching" && (
                          <div className="border-t border-primary/10 px-3 py-2">
                            <button
                              type="button"
                              onClick={startQuestions}
                              disabled={
                                !canStartQuestions ||
                                currentLesson.questions.length === 0
                              }
                              className={cn(
                                "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
                                canStartQuestions &&
                                  currentLesson.questions.length > 0
                                  ? "bg-primary text-white"
                                  : "cursor-not-allowed bg-gray-200 text-gray-500",
                              )}
                            >
                              <SkipForward className="h-4 w-4" />
                              {currentLesson.questions.length === 0
                                ? "No questions"
                                : canStartQuestions
                                  ? "Start questions"
                                  : "Listening…"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {lessonPhase === "teaching" && !isLessonCodeDemo ? (
              <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto border-l-0 border-primary/20 bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white p-4 sm:p-6 lg:border-l-2">
                <div className="mx-auto w-full max-w-2xl">
                  <div className="rounded-xl bg-white/80 p-6 shadow-sm backdrop-blur-sm">
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
                    {currentLesson.code_example && (
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
                      className="flex h-full min-h-0 w-full flex-col"
                      sizes={editorConsoleSplitSizes(!isLgUp)}
                      minSize={editorConsoleMinSizes(!isLgUp)}
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
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {!isLgUp ? (
                    <div className="shrink-0 px-3 pt-2">
                      <MobileCollapsible label="question">
                        <h3 className="text-base font-bold leading-snug text-gray-900">
                          {currentQuestion.question}
                        </h3>
                        {currentQuestion.code_example ? (
                          <div className="mt-2 rounded-lg bg-gray-100 p-3">
                            <p className="mb-2 text-sm text-gray-600">
                              {currentQuestion.code_example.description}
                            </p>
                            <pre className="overflow-x-auto text-xs text-gray-800">
                              {currentQuestion.code_example.code}
                            </pre>
                          </div>
                        ) : null}
                      </MobileCollapsible>
                    </div>
                  ) : (
                    <div className="shrink-0 border-b border-gray-200 bg-white p-4">
                      <h3 className="font-semibold text-gray-900">
                        {currentQuestion.question}
                      </h3>
                      {currentQuestion.code_example && (
                        <div className="mt-3 rounded-lg bg-gray-100 p-3">
                          <p className="mb-2 text-sm text-gray-600">
                            {currentQuestion.code_example.description}
                          </p>
                          <pre className="overflow-x-auto text-xs text-gray-800">
                            {currentQuestion.code_example.code}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-4">
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
                          className="flex h-full min-h-0 w-full flex-col"
                          sizes={editorConsoleSplitSizes(!isLgUp)}
                          minSize={editorConsoleMinSizes(!isLgUp)}
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
              ) : (
                <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto border-l-0 border-primary/20 bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white p-4 sm:p-6 lg:border-l-2">
                  <div className="mx-auto w-full max-w-2xl">
                    <div className="rounded-xl bg-white/80 p-6 shadow-sm backdrop-blur-sm">
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
                  {getNextLesson() ? (
                    <button
                      type="button"
                      onClick={handleNextLesson}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-all hover:bg-primary/90"
                    >
                      <ChevronRight className="h-5 w-5" />
                      Next Lesson
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
                      </div>
                    </div>

                    {!isLgUp ? (
                      <div
                        className="pointer-events-none fixed bottom-0 right-0 z-0 h-[280px] w-[320px] translate-x-8 translate-y-12 opacity-0"
                        aria-hidden
                      >
                        {renderAvatar("h-full w-full", false)}
                      </div>
                    ) : null}
                  </div>
                </Split>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
