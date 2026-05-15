import { useState, useCallback, useEffect, useRef } from "react";
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
import {
  FileUploader,
  PreviewSidebar,
  PreviewQuestion,
  PreviewCodeEditor,
  PreviewTestResults,
  usePreviewAvatar,
} from "./components";
import { decodeHandoffSegment, uploadCurriculumFile } from "./handoff";
import type { CurriculumData, Lesson } from "./types";

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
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [lessonPhase, setLessonPhase] = useState<LessonPhase>("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [code, setCode] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentSubtitleText, setCurrentSubtitleText] = useState("");
  const [canStartQuestions, setCanStartQuestions] = useState(false);
  const lessonStartedRef = useRef(false);

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
      setCurrentLesson(data.modules[0].lessons[0]);
    }
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
      setCurrentLesson(lesson);
      setLessonPhase("intro");
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setCode("");
      setResults([]);
      setCurrentSubtitleText("");
      setCanStartQuestions(false);
      lessonStartedRef.current = false;
    },
    [stop]
  );

  // Enable "Start Questions" button when teaching speech finishes
  useEffect(() => {
    if (lessonPhase === "teaching" && !isSpeaking && currentLesson?.questions?.length) {
      setCanStartQuestions(true);
    }
  }, [lessonPhase, isSpeaking, currentLesson]);

  const speakLessonContent = useCallback(
    (lesson: Lesson) => {
      const parts: string[] = [];

      const intro = `Welcome! In this lesson, you will be learning about ${lesson.title}.`;
      parts.push(intro);

      if (lesson.body) parts.push(lesson.body);
      if (lesson.avatar_script) parts.push(lesson.avatar_script);

      let fullText = parts.join(" ");

      const hasQuestions = lesson.questions && lesson.questions.length > 0;
      if (hasQuestions) {
        fullText +=
          " Great! Now let's test your understanding with some questions. Click 'Start Questions' when you're ready.";
      } else if (lesson.next_lesson_id) {
        fullText +=
          " You've completed this lesson! Click 'Next Lesson' to continue.";
      } else {
        fullText +=
          " Congratulations! You've completed all lessons in this module.";
      }

      speak(fullText);
    },
    [speak]
  );

  const startLesson = useCallback(() => {
    if (!currentLesson || lessonStartedRef.current) return;
    lessonStartedRef.current = true;
    setLessonPhase("teaching");
    setCanStartQuestions(false);

    speakLessonContent(currentLesson);
  }, [currentLesson, speakLessonContent]);

  const startQuestions = useCallback(() => {
    if (!currentLesson || currentLesson.questions.length === 0 || !canStartQuestions) return;
    setLessonPhase("questions");
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setCode("");
    setResults([]);
    setCanStartQuestions(false);

    const question = currentLesson.questions[0];

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
  }, [currentLesson, canStartQuestions, speak]);

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
      setCode("");
      setResults([]);

      const question = currentLesson.questions[nextIndex];

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
    } else {
      setLessonPhase("complete");
      setCompletedLessons((prev) => new Set([...prev, currentLesson.id]));
      speak("Great job! You've completed this lesson.");
    }
  }, [currentLesson, currentQuestionIndex, speak]);

  const getNextLesson = useCallback((): Lesson | null => {
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
            return module.lessons[i + 1];
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
      setCode("");
      setResults([]);
      setCurrentSubtitleText("");
      setCanStartQuestions(false);
      lessonStartedRef.current = true;

      speakLessonContent(nextLesson);
    } else {
      speak("Congratulations! You've completed all lessons in this curriculum.");
    }
  }, [curriculum, currentLesson, stop, getNextLesson, speakLessonContent, speak]);

  const handleRunCode = useCallback(() => {
    try {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args.map((a) => String(a)).join(" "));
      };

      try {
        eval(code);
      } catch (err) {
        logs.push(`Error: ${(err as Error).message}`);
      }

      console.log = originalLog;
      setResults(logs.length > 0 ? logs : ["(No output)"]);
    } catch (err) {
      setResults([`Error: ${(err as Error).message}`]);
    }
  }, [code]);

  const handleCodeSubmit = useCallback(() => {
    if (!currentLesson) return;

    const question = currentLesson.questions[currentQuestionIndex];
    if (!question || question.type !== "code_test") return;

    handleRunCode();

    const criteria = question.testCriteria;
    let passed = false;

    if (criteria?.expectedHTML) {
      const normalizedCode = code.replace(/["']/g, "'").replace(/\s+/g, " ");
      const normalizedExpected = criteria.expectedHTML.replace(/["']/g, "'").replace(/\s+/g, " ");
      passed = normalizedCode.includes(normalizedExpected);
    } else if (criteria?.expectedCSS) {
      passed = code.replace(/\s+/g, " ").includes(criteria.expectedCSS.replace(/\s+/g, " "));
    } else if (criteria?.expectedJS) {
      passed = code.includes(criteria.expectedJS);
    } else if (criteria?.expectedCode) {
      const regex = new RegExp(criteria.expectedCode);
      passed = regex.test(code);
    } else {
      passed = code.trim().length > 0;
    }

    setIsAnswerSubmitted(true);

    if (passed) {
      setResults((prev) => [...prev, "✓ Test passed!"]);
      const feedbackText = `Correct! Well done. ${question.explanation || ""}`;
      speak(feedbackText);
    } else {
      setResults((prev) => [...prev, "✗ Test failed. Check your code and try again."]);
      speak("That's not quite right. Check your code and try again.");
    }
  }, [currentLesson, currentQuestionIndex, code, handleRunCode, speak]);

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
    <div className="flex h-screen bg-gray-100 -m-4">
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
        className={`fixed inset-y-0 left-0 z-40 w-80 transform border-r border-gray-200 bg-white shadow-lg transition-transform lg:relative lg:translate-x-0 ${showSidebar ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-full flex-col">
          <div className="space-y-3 border-b border-gray-200 p-4">
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
          <PreviewSidebar
            curriculum={curriculum}
            currentLesson={currentLesson}
            onSelectLesson={handleSelectLesson}
            completedLessons={completedLessons}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
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

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
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
            {lessonPhase === "intro" || lessonPhase === "teaching" ? (
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
                  </div>
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
                    <div className="flex flex-1 overflow-hidden">
                      <div className="flex-1 overflow-hidden">
                        <PreviewCodeEditor
                          code={code}
                          onCodeChange={setCode}
                          onRunCode={handleRunCode}
                          onSubmitCode={handleCodeSubmit}
                          canSubmit={code.trim().length > 0 && !isAnswerSubmitted}
                          language={currentQuestion.code_example?.language || "javascript"}
                        />
                      </div>
                      <div className="w-80 border-l border-gray-200">
                        <PreviewTestResults results={results} code={code} />
                      </div>
                    </div>
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
