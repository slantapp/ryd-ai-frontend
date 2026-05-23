import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  SkipForward,
  ChevronRight,
  Menu,
  X,
  Upload,
  CheckCircle2,
  Loader2,
  Calculator,
} from "lucide-react";
import type { PublishStatus } from "../types";
import type { CurriculumData, FormulaExample, Lesson, Question } from "../types";
import { PreviewSidebar } from "./PreviewSidebar";
import { PreviewQuestion } from "./PreviewQuestion";
import { usePreviewAvatar } from "./PreviewAvatar";
import MathFormulaBoard from "@/components/courses/math/MathFormulaBoard";
import MathAnswerWorkspace from "@/components/courses/math/MathAnswerWorkspace";
import { compareFormulaAnswer } from "@/utils/formulaAnswer";

type LessonPhase = "intro" | "teaching" | "questions" | "complete";

interface MathCurriculumPreviewProps {
  curriculum: CurriculumData;
  sourceFile: File | null;
  publishStatus: PublishStatus;
  onPublish: () => void;
  onBackToUpload: () => void;
}

export function MathCurriculumPreview({
  curriculum,
  sourceFile,
  publishStatus,
  onPublish,
  onBackToUpload,
}: MathCurriculumPreviewProps) {
  const [currentLesson, setCurrentLesson] = useState<Lesson>(
    curriculum.modules[0]?.lessons[0] ?? null!,
  );
  const [lessonPhase, setLessonPhase] = useState<LessonPhase>("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(
    null,
  );
  const [studentAnswer, setStudentAnswer] = useState("");
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(
    null,
  );
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set(),
  );
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentSubtitleText, setCurrentSubtitleText] = useState("");
  const [canStartQuestions, setCanStartQuestions] = useState(false);
  const [displayedFormula, setDisplayedFormula] = useState("");
  const [isFormulaTyping, setIsFormulaTyping] = useState(false);
  const [activeFormulaExample, setActiveFormulaExample] =
    useState<FormulaExample | null>(null);

  const lessonStartedRef = useRef(false);
  const formulaTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isTypingFormulaRef = useRef(false);
  const pendingAfterSpeechRef = useRef<(() => void) | null>(null);

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
    if (currentSubtitle) setCurrentSubtitleText(currentSubtitle);
  }, [currentSubtitle]);

  const stopFormulaTyping = useCallback(() => {
    isTypingFormulaRef.current = false;
    setIsFormulaTyping(false);
    if (formulaTypingTimeoutRef.current) {
      clearTimeout(formulaTypingTimeoutRef.current);
      formulaTypingTimeoutRef.current = null;
    }
  }, []);

  const speakWithCallback = useCallback(
    (text: string, onComplete?: () => void) => {
      pendingAfterSpeechRef.current = onComplete ?? null;
      speak(text);
    },
    [speak],
  );

  useEffect(() => {
    if (!isSpeaking && pendingAfterSpeechRef.current) {
      const cb = pendingAfterSpeechRef.current;
      pendingAfterSpeechRef.current = null;
      cb();
    }
  }, [isSpeaking]);

  const speakLessonOutro = useCallback(
    (lesson: Lesson) => {
      const hasQuestions = (lesson.questions?.length ?? 0) > 0;
      if (hasQuestions) {
        speakWithCallback(
          "Great! Now let's test your understanding with some questions. Click 'Start Questions' when you're ready.",
          () => setCanStartQuestions(true),
        );
      } else if (lesson.next_lesson_id) {
        speakWithCallback(
          "You've completed this lesson! Click 'Next Lesson' to continue.",
        );
      } else {
        speakWithCallback(
          "Congratulations! You've completed all lessons in this module.",
        );
      }
    },
    [speakWithCallback],
  );

  const playLessonFormulaTyping = useCallback(
    (detail: FormulaExample, lesson: Lesson) => {
      stopFormulaTyping();
      isTypingFormulaRef.current = true;
      setIsFormulaTyping(true);
      setActiveFormulaExample(detail);
      setDisplayedFormula("");

      const formulaToType = detail.formula;
      const typingSpeed = detail.typingSpeed ?? 45;
      let currentIndex = 0;

      if (detail.explanation) {
        speak(detail.explanation);
      }

      const typeNextChar = () => {
        if (!isTypingFormulaRef.current) return;
        if (currentIndex < formulaToType.length) {
          setDisplayedFormula(formulaToType.substring(0, currentIndex + 1));
          currentIndex++;
          formulaTypingTimeoutRef.current = setTimeout(typeNextChar, typingSpeed);
        } else {
          isTypingFormulaRef.current = false;
          setIsFormulaTyping(false);
          if (!detail.explanation) {
            speakLessonOutro(lesson);
          } else if (!isSpeaking) {
            speakLessonOutro(lesson);
          } else {
            pendingAfterSpeechRef.current = () => speakLessonOutro(lesson);
          }
        }
      };

      formulaTypingTimeoutRef.current = setTimeout(typeNextChar, 300);
    },
    [isSpeaking, speak, speakLessonOutro, stopFormulaTyping],
  );

  const speakLessonContent = useCallback(
    (lesson: Lesson) => {
      const parts = [
        `Welcome! In this lesson, you will be learning about ${lesson.title}.`,
      ];
      if (lesson.body) parts.push(lesson.body);
      if (lesson.avatar_script) parts.push(lesson.avatar_script);
      const introText = parts.join(" ");

      if (lesson.formula_example) {
        setActiveFormulaExample(lesson.formula_example);
        setDisplayedFormula("");
        setIsFormulaTyping(false);
        speakWithCallback(introText, () =>
          playLessonFormulaTyping(lesson.formula_example!, lesson),
        );
      } else {
        setActiveFormulaExample(null);
        setDisplayedFormula("");
        speakWithCallback(introText, () => speakLessonOutro(lesson));
      }
    },
    [playLessonFormulaTyping, speakLessonOutro, speakWithCallback],
  );

  const resetQuestionState = useCallback(() => {
    setSelectedAnswer(null);
    setStudentAnswer("");
    setIsAnswerSubmitted(false);
    setLastAnswerCorrect(null);
  }, []);

  const handleSelectLesson = useCallback(
    (lesson: Lesson) => {
      stop();
      stopFormulaTyping();
      setCurrentLesson(lesson);
      setLessonPhase("intro");
      setCurrentQuestionIndex(0);
      resetQuestionState();
      setDisplayedFormula("");
      setActiveFormulaExample(null);
      setCurrentSubtitleText("");
      setCanStartQuestions(false);
      lessonStartedRef.current = false;
    },
    [resetQuestionState, stop, stopFormulaTyping],
  );

  const startLesson = useCallback(() => {
    if (!currentLesson || lessonStartedRef.current) return;
    lessonStartedRef.current = true;
    setLessonPhase("teaching");
    setCanStartQuestions(false);
    speakLessonContent(currentLesson);
  }, [currentLesson, speakLessonContent]);

  const typeQuestionFormula = useCallback(
    (detail: FormulaExample, question: Question) => {
      stopFormulaTyping();
      isTypingFormulaRef.current = true;
      setIsFormulaTyping(true);
      setActiveFormulaExample(detail);
      setDisplayedFormula("");

      const formulaToType = detail.formula;
      const typingSpeed = detail.typingSpeed ?? 45;
      let currentIndex = 0;

      if (detail.description) speak(detail.description);

      const startTyping = () => {
        const typeNextChar = () => {
          if (!isTypingFormulaRef.current) return;
          if (currentIndex < formulaToType.length) {
            setDisplayedFormula(formulaToType.substring(0, currentIndex + 1));
            currentIndex++;
            formulaTypingTimeoutRef.current = setTimeout(
              typeNextChar,
              typingSpeed,
            );
          } else {
            isTypingFormulaRef.current = false;
            setIsFormulaTyping(false);
            speakWithCallback(
              "Now it's your turn! Try solving the problem yourself.",
              () => speak(question.question),
            );
          }
        };
        formulaTypingTimeoutRef.current = setTimeout(typeNextChar, 400);
      };

      setTimeout(startTyping, detail.description ? 1200 : 300);
    },
    [speak, speakWithCallback, stopFormulaTyping],
  );

  const beginQuestion = useCallback(
    (question: Question) => {
      resetQuestionState();
      setDisplayedFormula("");
      if (question.type === "formula_test" && question.formula_example) {
        typeQuestionFormula(question.formula_example, question);
      } else {
        setActiveFormulaExample(null);
        speak(question.question);
      }
    },
    [resetQuestionState, speak, typeQuestionFormula],
  );

  const startQuestions = useCallback(() => {
    if (
      !currentLesson ||
      currentLesson.questions.length === 0 ||
      !canStartQuestions
    )
      return;
    setLessonPhase("questions");
    setCurrentQuestionIndex(0);
    resetQuestionState();
    setCanStartQuestions(false);
    beginQuestion(currentLesson.questions[0]);
  }, [beginQuestion, canStartQuestions, currentLesson, resetQuestionState]);

  const handleSubmitMcTf = useCallback(() => {
    if (!currentLesson || selectedAnswer === null) return;
    const question = currentLesson.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.answer;
    setIsAnswerSubmitted(true);
    setLastAnswerCorrect(isCorrect);

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

  const handleSubmitFormula = useCallback(() => {
    if (!currentLesson) return;
    const question = currentLesson.questions[currentQuestionIndex];
    if (question.type !== "formula_test") return;

    const expected = question.testCriteria?.expectedFormula?.trim() ?? "";
    const isCorrect = expected
      ? compareFormulaAnswer(studentAnswer, expected)
      : false;
    setIsAnswerSubmitted(true);
    setLastAnswerCorrect(isCorrect);

    const feedbackText = isCorrect
      ? `Correct! Well done. ${question.explanation || ""}`
      : `Not quite. The expected answer is ${expected}. ${question.explanation || ""}`;
    speak(feedbackText);
  }, [currentLesson, currentQuestionIndex, speak, studentAnswer]);

  const handleNextQuestion = useCallback(() => {
    if (!currentLesson) return;
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < currentLesson.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      beginQuestion(currentLesson.questions[nextIndex]);
    } else {
      setLessonPhase("complete");
      setCompletedLessons((prev) => new Set([...prev, currentLesson.id]));
      speak("Great job! You've completed this lesson.");
    }
  }, [beginQuestion, currentLesson, currentQuestionIndex, speak]);

  const getNextLesson = useCallback((): Lesson | null => {
    if (!currentLesson) return null;
    let foundCurrent = false;
    for (const module of curriculum.modules) {
      for (let i = 0; i < module.lessons.length; i++) {
        if (foundCurrent) return module.lessons[i];
        if (module.lessons[i].id === currentLesson.id) {
          foundCurrent = true;
          if (i + 1 < module.lessons.length) return module.lessons[i + 1];
        }
      }
    }
    return null;
  }, [curriculum.modules, currentLesson]);

  const handleNextLesson = useCallback(() => {
    stop();
    stopFormulaTyping();
    const nextLesson = getNextLesson();
    if (nextLesson) {
      setCurrentLesson(nextLesson);
      setLessonPhase("teaching");
      setCurrentQuestionIndex(0);
      resetQuestionState();
      setDisplayedFormula("");
      setActiveFormulaExample(null);
      setCanStartQuestions(false);
      lessonStartedRef.current = true;
      speakLessonContent(nextLesson);
    } else {
      speak("Congratulations! You've completed all lessons in this curriculum.");
    }
  }, [
    getNextLesson,
    resetQuestionState,
    speak,
    speakLessonContent,
    stop,
    stopFormulaTyping,
  ]);

  useEffect(
    () => () => {
      stopFormulaTyping();
    },
    [stopFormulaTyping],
  );

  const currentQuestion = currentLesson.questions[currentQuestionIndex];
  const isFormulaQuestion = currentQuestion?.type === "formula_test";
  const isMcTfQuestion =
    currentQuestion?.type === "multiple_choice" ||
    currentQuestion?.type === "true_false";

  return (
    <div className="flex h-screen bg-gray-100">
      <button
        type="button"
        onClick={() => setShowSidebar(!showSidebar)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-lg lg:hidden"
      >
        {showSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 transform border-r border-gray-200 bg-white shadow-lg transition-transform lg:relative lg:translate-x-0 ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="space-y-3 border-b border-gray-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onBackToUpload}
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
              onClick={onPublish}
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
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <Calculator className="h-4 w-4 shrink-0" />
              Mathematics preview
            </div>
          </div>
          <PreviewSidebar
            curriculum={curriculum}
            currentLesson={currentLesson}
            onSelectLesson={handleSelectLesson}
            completedLessons={completedLessons}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <h1 className="truncate text-lg font-semibold text-gray-900">
              {currentLesson.title}
            </h1>
            <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
              {lessonPhase === "intro"
                ? "Ready to start"
                : lessonPhase === "teaching"
                  ? "Learning"
                  : lessonPhase === "questions"
                    ? `Question ${currentQuestionIndex + 1}/${currentLesson.questions.length}`
                    : "Complete"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {lessonPhase === "intro" && (
              <button
                type="button"
                onClick={startLesson}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:bg-primary/90"
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
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                  canStartQuestions && currentLesson.questions.length > 0
                    ? "bg-primary text-white shadow-md shadow-primary/25 hover:bg-primary/90"
                    : "cursor-not-allowed bg-gray-200 text-gray-500"
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
            {lessonPhase === "questions" &&
              isAnswerSubmitted &&
              isMcTfQuestion && (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  disabled={isSpeaking}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
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
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                <ChevronRight className="h-4 w-4" />
                Next Lesson
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-80 shrink-0 flex-col border-r border-gray-200 bg-linear-to-b from-primary/10 to-white">
            <div className="flex-1 overflow-hidden p-4">
              <div className="h-64 overflow-hidden rounded-xl border border-primary/20 bg-white shadow-inner">
                <AvatarComponent className="h-full w-full" />
              </div>
              {isSpeaking && currentSubtitleText && (
                <div className="mt-4 rounded-xl border border-primary/15 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs text-primary">Speaking...</p>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {currentSubtitleText}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white">
            {lessonPhase === "intro" || lessonPhase === "teaching" ? (
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
                <div className="mx-auto max-w-2xl min-w-0 space-y-4">
                  <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                      {currentLesson.title}
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed text-gray-700 sm:text-base">
                      {currentLesson.body}
                    </p>
                    {currentLesson.avatar_script &&
                      currentLesson.avatar_script !== currentLesson.body && (
                        <div className="mt-4 rounded-lg border-l-4 border-primary bg-primary/10 p-4">
                          <h3 className="mb-2 text-sm font-semibold text-primary">
                            Instructor script
                          </h3>
                          <p className="text-sm leading-relaxed text-gray-700">
                            {currentLesson.avatar_script}
                          </p>
                        </div>
                      )}
                  </div>
                  {activeFormulaExample && (
                    <MathFormulaBoard
                      example={activeFormulaExample}
                      liveFormula={
                        isFormulaTyping ? displayedFormula : undefined
                      }
                    />
                  )}
                </div>
              </div>
            ) : lessonPhase === "questions" && currentQuestion ? (
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
                <div className="mx-auto max-w-2xl min-w-0">
                  <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
                    {isFormulaQuestion && activeFormulaExample && (
                      <MathFormulaBoard
                        example={activeFormulaExample}
                        liveFormula={
                          isFormulaTyping ? displayedFormula : undefined
                        }
                        compact
                        className="mb-4"
                      />
                    )}
                    {isFormulaQuestion ? (
                      <>
                        <MathAnswerWorkspace
                          question={currentQuestion.question}
                          value={studentAnswer}
                          onChange={setStudentAnswer}
                          onSubmit={handleSubmitFormula}
                          canSubmit={
                            !!studentAnswer.trim() &&
                            !isSpeaking &&
                            !isAnswerSubmitted
                          }
                          disabled={isSpeaking}
                          isSubmitted={isAnswerSubmitted}
                          isCorrect={lastAnswerCorrect}
                          expectedAnswer={
                            currentQuestion.testCriteria?.expectedFormula
                          }
                        />
                        {isAnswerSubmitted && (
                          <button
                            type="button"
                            onClick={handleNextQuestion}
                            disabled={isSpeaking}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                          >
                            <ChevronRight className="h-5 w-5" />
                            {currentQuestionIndex + 1 <
                            currentLesson.questions.length
                              ? "Next Question"
                              : "Complete Lesson"}
                          </button>
                        )}
                      </>
                    ) : (
                      <PreviewQuestion
                        question={currentQuestion}
                        selectedAnswer={selectedAnswer}
                        onSelectAnswer={setSelectedAnswer}
                        isSubmitted={isAnswerSubmitted}
                        onSubmit={handleSubmitMcTf}
                        disabled={isSpeaking}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : lessonPhase === "complete" ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Lesson Complete!
                  </h2>
                  <p className="mt-2 text-gray-600">
                    You&apos;ve finished &quot;{currentLesson.title}&quot;
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
