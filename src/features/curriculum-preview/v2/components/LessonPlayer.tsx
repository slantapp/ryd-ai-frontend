import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowLeft, CheckCircle2, Lightbulb, ListTodo, Mic, Pause, Play, Volume2, XCircle } from "lucide-react";
import Split from "react-split";
import MathText from "@/components/courses/math/MathText";
import CodeEditor from "@/components/courses/exercise/CodeEditor";
import FullscreenModal from "@/components/courses/exercise/FullscreenModal";
import WebCodeWorkspace from "@/components/courses/exercise/WebCodeWorkspace";
import TestResults from "@/components/courses/exercise/TestResults";
import { MobileCollapsible } from "@/components/courses/exercise/MobileCollapsible";
import {
  editorConsoleMinSizes,
  editorConsoleSplitSizes,
} from "@/components/courses/exercise/codeWorkspaceLayout";
import MultipleChoiceQuestion from "@/components/courses/exercise/MultipleChoiceQuestion";
import TrueFalseQuestion from "@/components/courses/exercise/TrueFalseQuestion";
import { LessonProgressBar } from "@/components/courses/exercise/LessonProgressBar";
import { PageLoadWaitBanner } from "@/components/courses/exercise/PageLoadWaitBanner";
import {
  MOBILE_INSTRUCTOR_AUDIO_BUTTON,
  MOBILE_INSTRUCTOR_AUDIO_HINT,
} from "@/constants/mobileInstructorAudio";
import { useMediaQueryMinLg } from "@/hooks/useMediaQueryMinLg";
import {
  buildSubmitCodeResultLines,
  evaluateSubmissionCodeTest,
  runSubmissionCodeOutput,
  submissionHasContent,
} from "@/utils/codeTestRunner";
import { normalizeRunLanguage } from "@/utils/codeExecution/languages";
import { isTurtlePythonCode } from "@/utils/codeExecution/turtle";
import { compareFormulaAnswer } from "@/utils/formulaAnswer";
import {
  defaultWebEditorTab,
  EMPTY_WEB_CODE,
  isWebWorkspaceLanguage,
  seedWebCodeFromExample,
  type WebCodeSources,
} from "@/utils/webCodeWorkspace";
import { pauseMinSeconds, resolveAvatarDefaults } from "../defaults";
import { useTypedText } from "../hooks/useTypedText";
import {
  resolveExhaustedWrongTeachingLines,
  resolveQuestionRetry,
} from "../studentFlow";
import { stripMarkdownForSpeech } from "../speechText";
import {
  normalizeSpeechPart,
  withShow,
  type SpeechPart,
} from "../subtitleShow";
import type {
  AvatarShowReplacement,
  Beat,
  BridgeBeat,
  CodeDemoBeat,
  CurriculumV2Data,
  DisplayBeat,
  FormulaDemoBeat,
  LessonV2,
  MediaBeat,
  PauseBeat,
  QuestionBeat,
  RecapBeat,
  SpeakBeat,
} from "../types";
import { cn } from "@/lib/utils";
import { ContinueButton } from "./ContinueButton";
import { BeatProgressBar } from "./BeatProgressBar";
import { V2SkipPanel } from "./V2SkipPanel";
import {
  DisplayBeatView,
  MediaBeatView,
  PauseBeatView,
  RecapBeatView,
  SpeakBeatView,
  DemoIntro,
  Panel,
} from "./beats/ContentBeats";
import { BridgeBeatView } from "./beats/BridgeBeatView";

type SpeakFn = (text: string, options?: { show?: AvatarShowReplacement[] }) => void;
type AfterSpeechFn = (fn: () => void) => void;

interface LessonPlayerProps {
  curriculum: CurriculumV2Data;
  lesson: LessonV2;
  lessonOrdinal: number;
  lessonTotal: number;
  speak: SpeakFn;
  stop: () => void;
  scheduleAfterSpeech: AfterSpeechFn;
  clearScheduledAfterSpeech: () => void;
  isSpeaking: boolean;
  /** Whether the instructor is currently paused (mid-sentence). */
  isPaused?: boolean;
  /** Toggle pause/resume of the instructor's speech. */
  onTogglePause?: () => void;
  currentSubtitle?: string;
  avatarSlot?: ReactNode;
  onLessonComplete: (lessonId: string) => void;
  onNextLesson: (preferredNextId?: string | null) => void;
  /** Hide teacher skip chips + beat step bar (kids / sneak-peek stage). */
  hideFlowChrome?: boolean;
  /**
   * Kid-first responsive stage: compact avatar strip on small screens,
   * full-width Continue, tighter spacing for phone/tablet.
   */
  kidsStage?: boolean;
  /**
   * Match the real CourseDetails learning shell (left avatar / right board)
   * while keeping the v2 beat flow. Prefer this for sneak peek.
   */
  classicLayout?: boolean;
  /**
   * Mobile WebKit: first speak after avatar ready must run inside a tap.
   * Shown when the 3D avatar is off-screen on small viewports.
   */
  showMobileAudioUnlock?: boolean;
  onMobileAudioUnlock?: () => void;
  /** True while the 3D instructor avatar is still loading (mobile wait banner). */
  /** True while the instructor avatar or speech is delayed (shows patience banner). */
  isInstructorWaiting?: boolean;
  /** @deprecated Use isInstructorWaiting */
  isAvatarLoading?: boolean;
  /** When true, parent renders PageLoadWaitBanner (e.g. sneak peek page chrome). */
  suppressMobileWaitBanner?: boolean;
  /**
   * Sneak-peek cliffhanger: after this lesson, the bridge CTA opens the
   * subscribe flow instead of advancing (parent still handles onNextLesson).
   */
  subscribeGateAfterLesson?: boolean;
}

export function LessonPlayer({
  curriculum,
  lesson,
  lessonOrdinal,
  lessonTotal,
  speak,
  stop,
  scheduleAfterSpeech,
  clearScheduledAfterSpeech,
  isSpeaking,
  isPaused = false,
  onTogglePause,
  currentSubtitle,
  avatarSlot,
  onLessonComplete,
  onNextLesson,
  hideFlowChrome = false,
  kidsStage = false,
  classicLayout = false,
  showMobileAudioUnlock = false,
  onMobileAudioUnlock,
  isAvatarLoading = false,
  isInstructorWaiting,
  suppressMobileWaitBanner = false,
  subscribeGateAfterLesson = false,
}: LessonPlayerProps) {
  const isLgUp = useMediaQueryMinLg();
  const showInstructorWait = isInstructorWaiting ?? isAvatarLoading;
  const isInstructorActive = isSpeaking && !isPaused;
  const defaults = useMemo(() => resolveAvatarDefaults(curriculum), [curriculum]);
  const [beatIndex, setBeatIndex] = useState(0);
  const [completedBeatIds, setCompletedBeatIds] = useState<Set<string>>(new Set());
  const [canContinue, setCanContinue] = useState(false);
  const [pauseSecondsLeft, setPauseSecondsLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [formulaAnswer, setFormulaAnswer] = useState("");
  const [code, setCode] = useState("");
  const [webCode, setWebCode] = useState<WebCodeSources>(EMPTY_WEB_CODE);
  const [results, setResults] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [demoMode, setDemoMode] = useState<"idle" | "demo" | "practice">("idle");
  const [showCelebration, setShowCelebration] = useState(false);
  /** Wrong attempts used on the current question beat (student retry simulation). */
  const [wrongAttempts, setWrongAttempts] = useState(0);
  /**
   * True when any question in this lesson exhausted retries without a correct
   * answer — used so recap/bridge speech does not celebrate a failed attempt.
   */
  const missedPracticeRef = useRef(false);
  const [fullscreen, setFullscreen] = useState<"editor" | "results" | null>(null);
  const [runLanguage, setRunLanguage] = useState("javascript");
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const turtleTargetId = `ryd-turtle-${useId().replace(/:/g, "")}`;

  const typed = useTypedText();
  const beatStartedRef = useRef<string | null>(null);
  const goalSpokenRef = useRef(false);
  const advanceRef = useRef<() => void>(() => { });

  const beat: Beat | undefined = lesson.flow[beatIndex];
  const isLastBeat = beatIndex >= lesson.flow.length - 1;

  const resetInteractive = useCallback(() => {
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setFormulaAnswer("");
    setCode("");
    setWebCode(EMPTY_WEB_CODE);
    setResults([]);
    setDemoMode("idle");
    setShowCelebration(false);
    setWrongAttempts(0);
    setFullscreen(null);
    setPreviewRefreshKey(0);
    typed.reset();
  }, [typed]);

  const markBeatDone = useCallback((id: string) => {
    setCompletedBeatIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const goToBeat = useCallback(
    (index: number) => {
      stop();
      clearScheduledAfterSpeech();
      typed.stop();
      setCanContinue(false);
      setPauseSecondsLeft(0);
      resetInteractive();
      beatStartedRef.current = null;
      setBeatIndex(Math.max(0, Math.min(index, lesson.flow.length - 1)));
    },
    [clearScheduledAfterSpeech, lesson.flow.length, resetInteractive, stop, typed],
  );

  const advance = useCallback(() => {
    if (!beat) return;
    markBeatDone(beat.id);
    setCanContinue(false);
    setPauseSecondsLeft(0);
    clearScheduledAfterSpeech();

    if (isLastBeat) {
      onLessonComplete(lesson.id);
      return;
    }

    const nextIndex = beatIndex + 1;
    const nextBeat = lesson.flow[nextIndex];
    const nextWantsKeep =
      nextBeat?.type === "pause" &&
      (nextBeat.keep_previous !== false) &&
      (beat.type === "code_demo" ||
        beat.type === "formula_demo" ||
        (beat.type === "question" &&
          (beat.question.type === "code_test" ||
            beat.question.type === "formula_test")));

    // Keep the demo on screen during pause so kids can look at it
    if (!nextWantsKeep) {
      resetInteractive();
    } else {
      setDemoMode("demo");
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setShowCelebration(false);
      setWrongAttempts(0);
    }

    beatStartedRef.current = null;
    setBeatIndex(nextIndex);
  }, [
    beat,
    beatIndex,
    clearScheduledAfterSpeech,
    isLastBeat,
    lesson.flow,
    lesson.id,
    markBeatDone,
    onLessonComplete,
    resetInteractive,
  ]);

  advanceRef.current = advance;

  const speakThen = useCallback(
    (text: string | undefined, then?: () => void, show?: AvatarShowReplacement[]) => {
      const trimmed = text?.trim();
      if (!trimmed) {
        then?.();
        return;
      }
      if (then) scheduleAfterSpeech(then);
      speak(trimmed, show?.length ? { show } : undefined);
    },
    [scheduleAfterSpeech, speak],
  );

  /** Speak several learning lines in order (avatar reads almost everything). */
  const speakSequence = useCallback(
    (parts: SpeechPart[], then?: () => void) => {
      const queue = parts
        .map((p) => {
          const u = normalizeSpeechPart(p);
          if (!u) return null;
          return {
            ...u,
            text: stripMarkdownForSpeech(u.text),
          };
        })
        .filter((u): u is NonNullable<typeof u> => !!u && !!u.text);
      if (queue.length === 0) {
        then?.();
        return;
      }
      const run = (index: number) => {
        if (index >= queue.length) {
          then?.();
          return;
        }
        const item = queue[index];
        speakThen(item.text, () => run(index + 1), item.show);
      };
      run(0);
    },
    [speakThen],
  );

  const enableManualContinue = useCallback(() => {
    setCanContinue(true);
  }, []);

  const finishAutoOrManual = useCallback(
    (current: Beat) => {
      if (current.advance === "auto") {
        setTimeout(() => advanceRef.current(), 450);
        return;
      }
      if (current.advance !== "manual") return;

      // Pause / bridge already include their own "continue" cue in speech.
      if (current.type === "pause" || current.type === "bridge") {
        enableManualContinue();
        return;
      }

      const prompt = defaults.continue_prompt?.trim();
      if (prompt) {
        speakThen(prompt, () => enableManualContinue());
      } else {
        enableManualContinue();
      }
    },
    [defaults.continue_prompt, enableManualContinue, speakThen],
  );

  // Reset when lesson changes
  useEffect(() => {
    stop();
    clearScheduledAfterSpeech();
    setBeatIndex(0);
    setCompletedBeatIds(new Set());
    setCanContinue(false);
    setPauseSecondsLeft(0);
    missedPracticeRef.current = false;
    resetInteractive();
    beatStartedRef.current = null;
    goalSpokenRef.current = false;
  }, [lesson.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Speak the lesson goal at most once, on the first beat of the lesson. */
  const takeGoalLine = useCallback((): string | undefined => {
    if (goalSpokenRef.current) return undefined;
    const goal = lesson.goal?.trim();
    if (!goal) return undefined;
    goalSpokenRef.current = true;
    return `In this lesson, your goal is: ${goal}.`;
  }, [lesson.goal]);

  // Drive each beat
  useEffect(() => {
    if (!beat) return;
    const key = `${lesson.id}:${beat.id}:${beatIndex}`;
    if (beatStartedRef.current === key) return;
    beatStartedRef.current = key;

    stop();
    clearScheduledAfterSpeech();
    setCanContinue(false);
    setPauseSecondsLeft(0);

    const goalLine = takeGoalLine();

    switch (beat.type) {
      case "speak": {
        speakSequence([goalLine, withShow(beat.avatar.text, beat.avatar.show)], () =>
          finishAutoOrManual(beat),
        );
        break;
      }
      case "display": {
        const timing = beat.avatar?.timing ?? "with_display";
        const show = beat.avatar?.show;
        const titleLine = beat.title
          ? `Let's look at this: ${beat.title}.`
          : undefined;
        const speakBody = beat.speak_body !== false;
        const bodyLine =
          speakBody && beat.body
            ? withShow(stripMarkdownForSpeech(beat.body), show)
            : undefined;
        const avatarLine = withShow(beat.avatar?.text, show);

        if (timing === "before_display") {
          speakSequence([goalLine, avatarLine, titleLine, bodyLine], () =>
            finishAutoOrManual(beat),
          );
        } else {
          speakSequence([goalLine, titleLine, bodyLine, avatarLine], () =>
            finishAutoOrManual(beat),
          );
        }
        break;
      }
      case "media": {
        speakSequence(
          [
            goalLine,
            withShow(beat.avatar?.text, beat.avatar?.show),
            beat.media.alt
              ? `Here's a picture: ${beat.media.alt}.`
              : "Take a look at this on the screen.",
          ],
          () => finishAutoOrManual(beat),
        );
        break;
      }
      case "pause": {
        const secs = pauseMinSeconds(curriculum, (beat as PauseBeat).min_seconds);
        setPauseSecondsLeft(secs);
        speakSequence(
          [
            goalLine,
            withShow(beat.avatar?.text, beat.avatar?.show),
            "Take a moment to look at the screen. When you're ready, continue.",
          ],
          () => {
            /* wait for timer / manual */
          },
        );
        break;
      }
      case "recap": {
        const pointLines = beat.points.map(
          (point, i) => `Point ${i + 1}: ${stripMarkdownForSpeech(point)}.`,
        );
        const missed = missedPracticeRef.current;
        const recapLead = missed
          ? "Let's review what this lesson covered."
          : (beat.avatar?.text ?? "Let's recap what you learned.");
        const spokenPoints = missed
          ? pointLines.filter(
            (line) =>
              !/\byou (made|built|did|put|finished|added)\b/i.test(line),
          )
          : pointLines;
        const show = beat.avatar?.show;
        speakSequence(
          [
            goalLine,
            withShow(recapLead, missed ? undefined : show),
            "Here are the key takeaways.",
            ...(spokenPoints.length > 0 ? spokenPoints : pointLines).map((line) =>
              withShow(line, show),
            ),
          ],
          () => finishAutoOrManual(beat),
        );
        break;
      }
      case "bridge": {
        const missed = missedPracticeRef.current;
        const gated = subscribeGateAfterLesson && !!beat.next;
        const endLine = gated
          ? "When you're ready, tap Subscribe to continue to unlock the next adventure."
          : beat.next
            ? "When you're ready, tap Next lesson to keep going."
            : missed
              ? "You've reached the end of this sneak peek. Keep practicing — subscribe to unlock more courses."
              : "You've reached the end of this course. Amazing work!";
        const bridgeText =
          missed && !gated
            ? beat.next
              ? "Nice effort — we'll keep building on these ideas in the next lesson."
              : beat.avatar?.text
            : beat.avatar?.text;
        speakSequence(
          [
            goalLine,
            withShow(bridgeText, beat.avatar?.show),
            endLine,
          ],
          () => enableManualContinue(),
        );
        break;
      }
      case "code_demo": {
        runCodeDemo(beat, goalLine);
        break;
      }
      case "formula_demo": {
        runFormulaDemo(beat, goalLine);
        break;
      }
      case "question": {
        startQuestion(beat, goalLine);
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, beatIndex, lesson.id]);

  // Pause countdown
  useEffect(() => {
    if (!beat || beat.type !== "pause") return;
    if (pauseSecondsLeft <= 0) {
      enableManualContinue();
      return;
    }
    const t = setTimeout(() => setPauseSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [beat, pauseSecondsLeft, enableManualContinue]);

  const runCodeDemo = (demoBeat: CodeDemoBeat, goalLine?: string) => {
    const example = demoBeat.code_example;
    setDemoMode("demo");
    const isWeb = isWebWorkspaceLanguage(example.language);
    if (isWeb) {
      setWebCode(seedWebCodeFromExample(example.code, example.language));
      setCode("");
    } else {
      setCode("");
      setWebCode(EMPTY_WEB_CODE);
    }

    const afterType = () => {
      const explainAndFinish = () => {
        speakSequence(
          [
            example.explanation,
            "Watch how that code works on the screen.",
          ],
          () => finishAutoOrManual(demoBeat),
        );
      };
      if (example.autoRun) {
        void (async () => {
          setIsExecuting(true);
          try {
            const lang = normalizeRunLanguage(example.language);
            const out = await runSubmissionCodeOutput(
              {
                code: example.code,
                webCode: isWeb
                  ? seedWebCodeFromExample(example.code, example.language)
                  : undefined,
                language: lang,
              },
              undefined,
              { turtleTargetId },
            );
            setResults(out.length ? out : ["✓ Code ran successfully."]);
          } finally {
            setIsExecuting(false);
            explainAndFinish();
          }
        })();
      } else {
        explainAndFinish();
      }
    };

    speakSequence(
      [
        goalLine,
        withShow(demoBeat.avatar?.text, demoBeat.avatar?.show),
        example.description ?? "Watch carefully as I type this example.",
      ],
      () => {
        typed.type(example.code, example.typingSpeed ?? 40, () => {
          if (isWeb) {
            setWebCode(seedWebCodeFromExample(example.code, example.language));
          } else {
            setCode(example.code);
          }
          afterType();
        });
      },
    );
  };

  const runFormulaDemo = (demoBeat: FormulaDemoBeat, goalLine?: string) => {
    const example = demoBeat.formula_example;
    setDemoMode("demo");
    speakSequence(
      [
        goalLine,
        withShow(demoBeat.avatar?.text, demoBeat.avatar?.show),
        example.description ?? "Let's work through this step by step.",
      ],
      () => {
        typed.type(example.formula, example.typingSpeed ?? 40, () => {
          speakSequence(
            [
              example.explanation,
              "Look at each step on the formula board.",
            ],
            () => finishAutoOrManual(demoBeat),
          );
        });
      },
    );
  };

  const applyStudentStarter = useCallback(
    (example: { code: string; language: string; starterCode?: string }) => {
      const starter = example.starterCode?.trim() ?? "";
      if (isWebWorkspaceLanguage(example.language)) {
        setWebCode(
          starter
            ? seedWebCodeFromExample(starter, example.language)
            : EMPTY_WEB_CODE,
        );
        setCode("");
      } else {
        setCode(starter);
        setWebCode(EMPTY_WEB_CODE);
      }
      setResults([]);
    },
    [],
  );

  const startQuestion = (qBeat: QuestionBeat, goalLine?: string) => {
    const q = qBeat.question;
    const avatar = qBeat.avatar;
    const show = avatar?.show;

    if (q.type === "code_test" && q.code_example) {
      setDemoMode("demo");
      const example = q.code_example;
      speakSequence(
        [
          goalLine,
          withShow(avatar?.before_demo ?? "I'll show you an example first.", show),
          example.description,
        ],
        () => {
          typed.type(example.code, example.typingSpeed ?? 40, () => {
            setCode(example.code);
            if (isWebWorkspaceLanguage(example.language)) {
              setWebCode(seedWebCodeFromExample(example.code, example.language));
            }
            speakSequence(
              [
                example.explanation,
                withShow(avatar?.handoff ?? defaults.handoff_to_practice, show),
                withShow(avatar?.on_ask ?? q.question, show),
              ],
              () => {
                applyStudentStarter(example);
                setDemoMode("practice");
              },
            );
          });
        },
      );
      return;
    }

    if (q.type === "formula_test" && q.formula_example?.formula) {
      setDemoMode("demo");
      const example = q.formula_example;
      speakSequence(
        [
          goalLine,
          withShow(avatar?.before_demo ?? "I'll work through an example first.", show),
          example.description,
        ],
        () => {
          typed.type(example.formula, example.typingSpeed ?? 40, () => {
            speakSequence(
              [
                example.explanation,
                withShow(avatar?.handoff ?? defaults.handoff_to_practice, show),
                withShow(avatar?.on_ask ?? q.question, show),
              ],
              () => {
                typed.reset();
                setDemoMode("practice");
              },
            );
          });
        },
      );
      return;
    }

    setDemoMode("practice");
    speakSequence([
      goalLine,
      withShow(avatar?.on_ask, show),
      withShow(q.question, show),
      q.type === "multiple_choice"
        ? "Pick the best answer."
        : q.type === "true_false"
          ? "Is this true or false?"
          : undefined,
    ]);
  };

  /**
   * Student simulation: correct → celebrate + advance;
   * wrong → on_wrong + hint and stay until max wrong attempts, then explanation + advance.
   */
  const handleQuestionOutcome = useCallback(
    (correct: boolean, opts?: { clearSelection?: boolean }) => {
      if (!beat || beat.type !== "question") return;
      // Prevent double-submit while feedback is showing / avatar is speaking
      if (isAnswerSubmitted || isSpeaking) return;

      const q = beat.question;
      const retry = resolveQuestionRetry(beat, curriculum);
      const clearSelection = opts?.clearSelection ?? false;

      setIsAnswerSubmitted(true);
      setShowCelebration(correct);

      if (correct) {
        // Solved it — they understood the task, so don't re-explain it.
        const feedback =
          beat.avatar?.on_correct ?? defaults.correct_feedback;
        speakSequence(
          [withShow(feedback, beat.avatar?.show), "Let's keep going!"],
          () => {
            setTimeout(() => advanceRef.current(), 600);
          },
        );
        return;
      }

      const nextWrong = wrongAttempts + 1;
      setWrongAttempts(nextWrong);
      const exhausted = nextWrong >= retry.max;
      const feedback =
        beat.avatar?.on_wrong ?? defaults.incorrect_feedback;

      if (exhausted) {
        // Do not speak success-phrased question.explanation after a failed attempt.
        missedPracticeRef.current = true;
        const teachingLines = resolveExhaustedWrongTeachingLines(q);
        speakThen(feedback, () => {
          speakSequence(
            [...teachingLines, "Let's move on and keep learning."],
            () => {
              setTimeout(() => advanceRef.current(), 600);
            },
          );
        }, beat.avatar?.show);
        return;
      }

      // Wrong with retries left: re-explain the task, then hand back for another try.
      const reAskInstruction =
        q.type === "code_test" || q.type === "formula_test"
          ? beat.avatar?.on_ask ?? q.question
          : undefined;
      speakThen(feedback, () => {
        speakSequence(
          [
            withShow(reAskInstruction, beat.avatar?.show),
            retry.hint,
          ],
          () => {
            setIsAnswerSubmitted(false);
            setShowCelebration(false);
            if (clearSelection) setSelectedAnswer(null);
          },
        );
      }, beat.avatar?.show);
    },
    [
      beat,
      curriculum,
      defaults.correct_feedback,
      defaults.incorrect_feedback,
      isAnswerSubmitted,
      isSpeaking,
      speakSequence,
      speakThen,
      wrongAttempts,
    ],
  );

  const handleSubmitMcTf = () => {
    if (!beat || beat.type !== "question" || selectedAnswer === null) return;
    handleQuestionOutcome(selectedAnswer === beat.question.answer, {
      clearSelection: true,
    });
  };

  const handleSubmitFormula = () => {
    if (!beat || beat.type !== "question") return;
    const expected = beat.question.testCriteria?.expectedFormula ?? "";
    handleQuestionOutcome(compareFormulaAnswer(formulaAnswer, expected));
  };

  const handleSubmitCode = async () => {
    if (!beat || beat.type !== "question") return;
    const q = beat.question;
    const lang = normalizeRunLanguage(q.code_example?.language);
    const useWeb = isWebWorkspaceLanguage(lang, q.testCriteria);
    const submission = {
      code,
      webCode: useWeb ? webCode : undefined,
      language: lang,
    };
    if (!submissionHasContent(submission, q.testCriteria)) {
      setResults(["⚠️ Write some code first!"]);
      return;
    }
    setIsExecuting(true);
    setResults(["⏳ Checking your code..."]);
    try {
      const runOutput = await runSubmissionCodeOutput(
        submission,
        q.testCriteria,
        { turtleTargetId },
      );
      const { passed, testResults } = evaluateSubmissionCodeTest(
        submission,
        q.testCriteria,
      );
      const lines = buildSubmitCodeResultLines(runOutput, passed, testResults);
      setResults(lines);
      handleQuestionOutcome(passed);
    } finally {
      setIsExecuting(false);
    }
  };

  const previousBeat = beatIndex > 0 ? lesson.flow[beatIndex - 1] : undefined;

  const pauseReviewingCode =
    beat?.type === "pause" &&
    (previousBeat?.type === "code_demo" ||
      (previousBeat?.type === "question" &&
        previousBeat.question.type === "code_test"));

  const pauseReviewingFormula =
    beat?.type === "pause" &&
    (previousBeat?.type === "formula_demo" ||
      (previousBeat?.type === "question" &&
        previousBeat.question.type === "formula_test"));

  const showCodePanel =
    !!beat &&
    (beat.type === "code_demo" ||
      (beat.type === "question" && beat.question.type === "code_test") ||
      pauseReviewingCode);

  const showFormulaPanel =
    !!beat &&
    (beat.type === "formula_demo" ||
      (beat.type === "question" &&
        beat.question.type === "formula_test" &&
        (demoMode === "demo" || !!typed.text || !!formulaAnswer)) ||
      pauseReviewingFormula);

  const codeLang = useMemo(() => {
    if (beat?.type === "code_demo") {
      return normalizeRunLanguage(beat.code_example.language);
    }
    if (beat?.type === "question" && beat.question.code_example) {
      return normalizeRunLanguage(beat.question.code_example.language);
    }
    if (pauseReviewingCode && previousBeat?.type === "code_demo") {
      return normalizeRunLanguage(previousBeat.code_example.language);
    }
    if (
      pauseReviewingCode &&
      previousBeat?.type === "question" &&
      previousBeat.question.code_example
    ) {
      return normalizeRunLanguage(previousBeat.question.code_example.language);
    }
    return "javascript";
  }, [beat, pauseReviewingCode, previousBeat]);

  const authoredCode =
    beat?.type === "code_demo"
      ? beat.code_example.code
      : beat?.type === "question"
        ? beat.question.code_example?.code
        : pauseReviewingCode && previousBeat?.type === "code_demo"
          ? previousBeat.code_example.code
          : pauseReviewingCode && previousBeat?.type === "question"
            ? previousBeat.question.code_example?.code
            : undefined;
  const activeTurtleTargetId = isTurtlePythonCode(
    code || authoredCode || "",
    codeLang,
  )
    ? turtleTargetId
    : undefined;

  useEffect(() => {
    setRunLanguage(codeLang);
  }, [codeLang]);

  const useWeb =
    showCodePanel &&
    isWebWorkspaceLanguage(
      codeLang,
      beat?.type === "question" ? beat.question.testCriteria : undefined,
    );

  const webEditorTab = useMemo(
    () => defaultWebEditorTab(codeLang),
    [codeLang],
  );

  // Keep editor in sync while the instructor types
  useEffect(() => {
    if (demoMode !== "demo" || !typed.text) return;
    if (useWeb) {
      setWebCode(seedWebCodeFromExample(typed.text, codeLang));
    } else {
      setCode(typed.text);
    }
  }, [typed.text, demoMode, useWeb, codeLang]);

  const getCodeSubmission = useCallback(
    () => ({
      code,
      webCode: useWeb ? webCode : undefined,
      language: runLanguage,
    }),
    [code, runLanguage, useWeb, webCode],
  );

  const handleRunCode = useCallback(async () => {
    if (demoMode === "demo" || isExecuting) return;
    const submission = getCodeSubmission();
    if (!submissionHasContent(submission, beat?.type === "question" ? beat.question.testCriteria : undefined)) {
      setResults(["Write some code first!"]);
      return;
    }
    if (useWeb) {
      setPreviewRefreshKey((k) => k + 1);
      setResults(["✓ Preview updated."]);
      return;
    }
    setIsExecuting(true);
    setResults(["⏳ Running…"]);
    try {
      const out = await runSubmissionCodeOutput(
        submission,
        beat?.type === "question" ? beat.question.testCriteria : undefined,
        { turtleTargetId },
      );
      setResults(out.length ? out : ["✓ Code ran successfully."]);
    } finally {
      setIsExecuting(false);
    }
  }, [beat, demoMode, getCodeSubmission, isExecuting, turtleTargetId, useWeb]);

  const editorLocked = demoMode === "demo" || pauseReviewingCode;

  const demoIntroTitle = pauseReviewingCode || pauseReviewingFormula
    ? "Look closely"
    : demoMode === "demo"
      ? beat?.type === "formula_demo" || pauseReviewingFormula
        ? "Worked example"
        : "Watch the example"
      : "Your turn";

  const demoIntroDescription = (() => {
    if (beat?.type === "pause") {
      return (
        beat.avatar?.text ??
        "Take a moment to look at the example on the screen."
      );
    }
    if (beat?.type === "code_demo") return beat.code_example.description;
    if (beat?.type === "formula_demo") return beat.formula_example.description;
    if (beat?.type === "question") return beat.question.question;
    return undefined;
  })();

  const formulaBoardText = (() => {
    if (typed.text) return typed.text;
    if (beat?.type === "formula_demo") return beat.formula_example.formula;
    if (beat?.type === "question") {
      return beat.question.formula_example?.formula ?? "";
    }
    if (pauseReviewingFormula && previousBeat?.type === "formula_demo") {
      return previousBeat.formula_example.formula;
    }
    if (
      pauseReviewingFormula &&
      previousBeat?.type === "question" &&
      previousBeat.question.formula_example
    ) {
      return previousBeat.question.formula_example.formula;
    }
    return "";
  })();

  const codeWorkspace = showCodePanel ? (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {useWeb ? (
        <WebCodeWorkspace
          sources={webCode}
          onSourcesChange={(next) => {
            if (editorLocked) return;
            setWebCode(next);
          }}
          onTestCode={
            beat?.type === "question" && demoMode === "practice"
              ? () => void handleSubmitCode()
              : () => void handleRunCode()
          }
          onTryOut={
            beat?.type === "question" && demoMode === "practice"
              ? () => void handleRunCode()
              : undefined
          }
          onToggleFullscreen={() =>
            setFullscreen(fullscreen === "editor" ? null : "editor")
          }
          isFullscreen={fullscreen === "editor"}
          canTest={!editorLocked && !isExecuting}
          canSubmit={
            beat?.type === "question" &&
            demoMode === "practice" &&
            !isAnswerSubmitted
          }
          isRunning={isExecuting}
          results={results}
          previewRefreshKey={previewRefreshKey}
          initialTab={webEditorTab}
          compactMobile={kidsStage}
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
            onCodeChange={(value) => {
              if (editorLocked) return;
              setCode(value);
            }}
            onTestCode={
              beat?.type === "question" && demoMode === "practice"
                ? () => void handleSubmitCode()
                : () => void handleRunCode()
            }
            onTryOut={
              beat?.type === "question" && demoMode === "practice"
                ? () => void handleRunCode()
                : undefined
            }
            language={runLanguage}
            onLanguageChange={setRunLanguage}
            onToggleFullscreen={() =>
              setFullscreen(fullscreen === "editor" ? null : "editor")
            }
            isFullscreen={fullscreen === "editor"}
            canTest={!editorLocked && !isExecuting}
            canSubmit={
              beat?.type === "question" &&
              demoMode === "practice" &&
              submissionHasContent(getCodeSubmission(), beat.question.testCriteria)
            }
            isRunning={isExecuting}
          />
          <TestResults
            results={results}
            code={code}
            turtleTargetId={activeTurtleTargetId}
            onToggleFullscreen={() =>
              setFullscreen(fullscreen === "results" ? null : "results")
            }
            isFullscreen={fullscreen === "results"}
          />
        </Split>
      )}
    </div>
  ) : null;

  const continueLabel =
    beat?.type === "recap" || isLastBeat ? "Next lesson" : "Continue";

  const continueRow =
    canContinue &&
      beat &&
      beat.type !== "bridge" &&
      beat.advance === "manual" &&
      !isSpeaking ? (
      <div
        className={cn(
          "flex shrink-0 border-t border-gray-200 bg-white",
          kidsStage || classicLayout
            ? "justify-stretch px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end sm:px-4"
            : "justify-end px-4 py-3 sm:px-5",
        )}
      >
        <ContinueButton
          label={continueLabel}
          onClick={() => advance()}
          className={
            kidsStage || classicLayout
              ? "h-12 w-full text-base sm:h-auto sm:w-auto sm:text-sm"
              : undefined
          }
        />
      </div>
    ) : null;

  const questionRetry =
    beat?.type === "question"
      ? resolveQuestionRetry(beat, curriculum)
      : null;
  const triesLeft =
    questionRetry != null
      ? Math.max(0, questionRetry.max - wrongAttempts)
      : 0;

  const tipText =
    beat?.type === "code_demo" || beat?.type === "formula_demo"
      ? beat.avatar?.before_demo ||
      beat.avatar?.text ||
      "Watch carefully — you'll try this next."
      : beat?.type === "question"
        ? questionRetry && questionRetry.max > 0
          ? triesLeft > 0
            ? `Student flow: you can try again up to ${triesLeft} more time${triesLeft === 1 ? "" : "s"} if this answer is wrong.`
            : "Last try used — after this wrong answer we'll explain and move on."
          : "Read the question, then submit your best answer."
        : beat?.type === "recap"
          ? "These are the key takeaways from this lesson."
          : "Listen to your instructor, then continue when you're ready.";

  const taskText = (() => {
    if (beat?.type === "question") return beat.question.question;
    if (beat?.type === "code_demo") {
      return "Watch the example, then you'll try it yourself.";
    }
    if (beat?.type === "formula_demo") {
      return "Follow the worked example carefully.";
    }
    if (demoMode === "practice") {
      return "Write your solution in the editor below.";
    }
    return lesson.goal;
  })();

  const fillWorkspace = showCodePanel || showFormulaPanel;
  const isCodeTestPractice =
    beat?.type === "question" &&
    beat.question.type === "code_test" &&
    demoMode === "practice";
  /** Code-test practice: keep the prompt visible and stack the avatar under it. */
  const showAvatarBelowQuestion =
    isCodeTestPractice && fillWorkspace;
  /**
   * Kids stage + workspace: on lg+ the instruction card becomes a full-height
   * side rail beside the board instead of a cramped strip above it.
   */
  const sideBySide = kidsStage && fillWorkspace;

  const instructionCard = (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-sm",
        kidsStage ? "p-2.5 sm:p-3 md:p-4" : "p-3 sm:p-4",
        sideBySide && "lg:min-h-full",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3",
          showAvatarBelowQuestion
            ? "gap-3"
            : kidsStage
              ? sideBySide
                ? "sm:gap-3"
                : "sm:gap-3 lg:flex-row lg:items-stretch lg:gap-4"
              : "gap-4 lg:flex-row lg:items-stretch",
        )}
      >
        {avatarSlot &&
          !showAvatarBelowQuestion &&
          (kidsStage ? (
            <>
              {/*
                One mount only: remounting on breakpoint switches breaks ready state
                and makes the unlock CTA flaky. Off-screen on mobile (opacity, not display:none).
              */}
              <div
                className={
                  isLgUp
                    ? sideBySide
                      ? "mx-auto flex w-36 shrink-0 flex-col items-center xl:w-44"
                      : "mx-0 flex w-52 shrink-0 flex-col items-center xl:w-60"
                    : "pointer-events-none fixed bottom-0 right-0 z-0 h-[280px] w-[320px] translate-x-8 translate-y-12 opacity-0"
                }
                aria-hidden={!isLgUp}
              >
                <div
                  className={
                    isLgUp
                      ? "aspect-square w-full overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-b from-primary/10 to-white shadow-inner"
                      : "h-full w-full"
                  }
                >
                  {avatarSlot}
                </div>
                {isLgUp ? (
                  isInstructorActive ? (
                    <p className="mt-2 line-clamp-3 text-center text-xs text-gray-600">
                      {currentSubtitle || "…"}
                    </p>
                  ) : (
                    <p className="mt-2 text-center text-xs text-gray-400">
                      {isPaused ? "Paused" : "Your instructor"}
                    </p>
                  )
                ) : null}
              </div>

              {/* Mobile / tablet chrome: unlock CTA, loading, or mic + subtitle */}
              {!isLgUp && (
                <div className="flex w-full shrink-0 flex-col gap-2">
                  {!suppressMobileWaitBanner ? (
                    <PageLoadWaitBanner isLoading={showInstructorWait} />
                  ) : null}
                  {showMobileAudioUnlock ? (
                    <div className="rounded-xl border border-primary/20 bg-linear-to-b from-primary/10 to-primary/5 px-3 py-3">
                      <p className="mb-2.5 text-center text-[0.7rem] leading-snug text-gray-600 sm:text-xs">
                        {MOBILE_INSTRUCTOR_AUDIO_HINT}
                      </p>
                      <button
                        type="button"
                        onClick={onMobileAudioUnlock}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary/90 active:scale-[0.99]"
                      >
                        <Volume2 className="h-5 w-5 shrink-0" aria-hidden />
                        <span>{MOBILE_INSTRUCTOR_AUDIO_BUTTON}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex w-full items-center gap-3">
                      <div
                        className="relative flex size-11 shrink-0 items-center justify-center sm:size-12"
                        aria-hidden={!isInstructorActive}
                        aria-label={
                          isInstructorActive ? "Instructor is speaking" : undefined
                        }
                        role={isInstructorActive ? "status" : undefined}
                      >
                        {isInstructorActive ? (
                          <>
                            <span className="absolute inline-flex size-[130%] animate-ping rounded-full bg-primary/35" />
                            <span className="absolute inline-flex size-full rounded-full bg-primary/20" />
                          </>
                        ) : null}
                        <div
                          className={cn(
                            "relative flex size-9 items-center justify-center rounded-xl border-2 bg-white shadow-md transition-all duration-300 sm:size-10",
                            isInstructorActive
                              ? "scale-105 border-primary shadow-lg shadow-primary/25"
                              : "border-primary/25",
                          )}
                        >
                          <Mic
                            className={cn(
                              "size-[1.15rem] text-primary sm:size-5",
                              isInstructorActive && "animate-pulse",
                            )}
                            aria-hidden
                          />
                        </div>
                      </div>
                      {isInstructorActive ? (
                        <p className="min-w-0 flex-1 line-clamp-3 text-left text-xs text-gray-600 sm:text-sm">
                          {currentSubtitle || "Speaking…"}
                        </p>
                      ) : (
                        <p className="min-w-0 flex-1 text-left text-xs text-gray-400">
                          {isPaused ? currentSubtitle || "Paused" : "Your instructor"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mx-auto flex w-full max-w-[280px] shrink-0 flex-col items-center lg:mx-0 lg:w-60 xl:w-72">
              <div className="aspect-square w-full overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-b from-primary/10 to-white shadow-inner">
                {avatarSlot}
              </div>
              {isInstructorActive ? (
                <p className="mt-2 line-clamp-3 text-center text-xs text-gray-600">
                  {currentSubtitle || "…"}
                </p>
              ) : (
                <p className="mt-2 text-center text-xs text-gray-400">
                  {isPaused ? "Paused" : "Your instructor"}
                </p>
              )}
            </div>
          ))}

        <div className="min-w-0 flex-1">
          {!kidsStage ? (
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.7rem] font-semibold text-primary">
              Lesson {lessonOrdinal} of {lessonTotal}
            </span>
          ) : null}
          <h2
            className={cn(
              "font-bold leading-tight text-gray-900",
              kidsStage
                ? "text-base sm:text-lg md:text-xl"
                : "mt-1.5 text-lg sm:text-xl",
            )}
          >
            {lesson.title}
          </h2>
          {lesson.goal && !kidsStage ? (
            <p className="mt-1 text-sm text-gray-600">{lesson.goal}</p>
          ) : null}

          <div className={cn("space-y-3", kidsStage ? "mt-2 sm:mt-3" : "mt-3")}>
            {showCodePanel || showFormulaPanel ? (
              <DemoIntro
                title={demoIntroTitle}
                description={demoIntroDescription}
              />
            ) : (
              <>
                {beat?.type === "speak" && (
                  <SpeakBeatView beat={beat as SpeakBeat} />
                )}
                {beat?.type === "display" && (
                  <DisplayBeatView beat={beat as DisplayBeat} />
                )}
                {beat?.type === "media" && (
                  <MediaBeatView beat={beat as MediaBeat} />
                )}
                {beat?.type === "pause" && (
                  <PauseBeatView beat={beat} secondsLeft={pauseSecondsLeft} />
                )}
                {beat?.type === "recap" && (
                  <RecapBeatView beat={beat as RecapBeat} />
                )}
                {beat?.type === "bridge" && (
                  <BridgeBeatView
                    beat={beat as BridgeBeat}
                    isCourseEnd={!beat.next}
                    subscribeGate={subscribeGateAfterLesson && !!beat.next}
                    canContinue={canContinue && !isSpeaking}
                    fullWidthCta={kidsStage}
                    onNextLesson={() => {
                      markBeatDone(beat.id);
                      onLessonComplete(lesson.id);
                      onNextLesson(beat.next);
                    }}
                    onFinish={() => {
                      markBeatDone(beat.id);
                      onLessonComplete(lesson.id);
                    }}
                  />
                )}
                {beat?.type === "question" && (
                  <QuestionPanel
                    beat={beat}
                    selectedAnswer={selectedAnswer}
                    onSelectAnswer={setSelectedAnswer}
                    isSubmitted={isAnswerSubmitted}
                    onSubmitMcTf={handleSubmitMcTf}
                    isSpeaking={isSpeaking}
                    showCelebration={showCelebration}
                    wrongAttempts={wrongAttempts}
                    retryMax={questionRetry?.max ?? 0}
                    retryHint={questionRetry?.hint}
                  />
                )}
              </>
            )}

            {beat?.type === "pause" &&
              (showCodePanel || showFormulaPanel) &&
              pauseSecondsLeft > 0 && (
                <p className="text-sm font-medium text-primary">
                  Continue in {pauseSecondsLeft}s…
                </p>
              )}
          </div>

          {showAvatarBelowQuestion && avatarSlot ? (
            <div className="mx-auto flex w-full max-w-[220px] shrink-0 flex-col items-center sm:max-w-[260px]">
              <div className="aspect-square w-full overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-b from-primary/10 to-white shadow-inner">
                {avatarSlot}
              </div>
              {isInstructorActive ? (
                <p className="mt-2 line-clamp-3 text-center text-xs text-gray-600">
                  {currentSubtitle || "…"}
                </p>
              ) : (
                <p className="mt-2 text-center text-xs text-gray-400">
                  {isPaused ? "Paused" : "Your instructor"}
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "flex w-full shrink-0 flex-col gap-2.5",
            showAvatarBelowQuestion
              ? "hidden"
              : kidsStage
                ? sideBySide
                  ? "grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-1"
                  : "grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:flex lg:w-48 lg:grid-cols-none xl:w-56"
                : "lg:w-52 xl:w-56",
          )}
        >
          <div
            className={cn(
              "rounded-xl border border-amber-200/80 bg-amber-50",
              kidsStage ? "p-2.5 sm:p-3" : "p-3",
            )}
          >
            <div className="mb-1 flex items-center gap-1.5 text-amber-800">
              <Lightbulb className="size-3.5 shrink-0" aria-hidden />
              <span className="text-[0.7rem] font-bold uppercase tracking-wide">
                Tip
              </span>
            </div>
            <p
              className={cn(
                "leading-snug text-amber-900/90",
                kidsStage
                  ? "line-clamp-3 text-xs sm:line-clamp-4 sm:text-sm"
                  : "text-xs sm:text-sm",
              )}
            >
              {tipText}
            </p>
          </div>
          {taskText && (
            <div
              className={cn(
                "rounded-xl border border-sky-200/80 bg-sky-50",
                kidsStage ? "p-2.5 sm:p-3" : "p-3",
              )}
            >
              <div className="mb-1 flex items-center gap-1.5 text-sky-800">
                <ListTodo className="size-3.5 shrink-0" aria-hidden />
                <span className="text-[0.7rem] font-bold uppercase tracking-wide">
                  Your task
                </span>
              </div>
              <p
                className={cn(
                  "leading-snug text-sky-950/90",
                  kidsStage
                    ? "line-clamp-3 text-xs sm:line-clamp-4 sm:text-sm"
                    : "text-xs sm:text-sm",
                )}
              >
                <MathText>{taskText}</MathText>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const beatBoard = (
    <div className="min-w-0 space-y-3">
      {showCodePanel || showFormulaPanel ? (
        <DemoIntro
          title={demoIntroTitle}
          description={demoIntroDescription}
        />
      ) : (
        <>
          {beat?.type === "speak" && (
            <SpeakBeatView beat={beat as SpeakBeat} />
          )}
          {beat?.type === "display" && (
            <DisplayBeatView beat={beat as DisplayBeat} />
          )}
          {beat?.type === "media" && (
            <MediaBeatView beat={beat as MediaBeat} />
          )}
          {beat?.type === "pause" && (
            <PauseBeatView beat={beat} secondsLeft={pauseSecondsLeft} />
          )}
          {beat?.type === "recap" && (
            <RecapBeatView beat={beat as RecapBeat} />
          )}
          {beat?.type === "bridge" && (
            <BridgeBeatView
              beat={beat as BridgeBeat}
              isCourseEnd={!beat.next}
              subscribeGate={subscribeGateAfterLesson && !!beat.next}
              canContinue={canContinue && !isSpeaking}
              fullWidthCta={classicLayout || kidsStage}
              onNextLesson={() => {
                markBeatDone(beat.id);
                onLessonComplete(lesson.id);
                onNextLesson(beat.next);
              }}
              onFinish={() => {
                markBeatDone(beat.id);
                onLessonComplete(lesson.id);
              }}
            />
          )}
          {beat?.type === "question" && (
            <QuestionPanel
              beat={beat}
              selectedAnswer={selectedAnswer}
              onSelectAnswer={setSelectedAnswer}
              isSubmitted={isAnswerSubmitted}
              onSubmitMcTf={handleSubmitMcTf}
              isSpeaking={isSpeaking}
              showCelebration={showCelebration}
              wrongAttempts={wrongAttempts}
              retryMax={questionRetry?.max ?? 0}
              retryHint={questionRetry?.hint}
            />
          )}
        </>
      )}
      {beat?.type === "pause" &&
        (showCodePanel || showFormulaPanel) &&
        pauseSecondsLeft > 0 && (
          <p className="text-sm font-medium text-primary">
            Continue in {pauseSecondsLeft}s…
          </p>
        )}
    </div>
  );

  if (classicLayout) {
    const phaseLabel =
      beat?.phase === "practice"
        ? "Practice"
        : beat?.phase === "assess"
          ? "Check understanding"
          : beat?.phase === "reflect"
            ? "Wrap-up"
            : "Lesson in progress";

    const canGoPreviousBeat = beatIndex > 0 && !isSpeaking;
    const canPrimaryContinue =
      !!canContinue &&
      !!beat &&
      beat.type !== "bridge" &&
      beat.advance === "manual" &&
      !isSpeaking;

    // Match CourseDetails: show the prompt above the avatar while the learner answers a code test.
    const isCodeTestQuestionActive = isCodeTestPractice;

    const flowLength = Math.max(1, lesson.flow.length);
    const classicProgressPct = Math.min(
      100,
      Math.max(
        0,
        ((lessonOrdinal - 1 + (beatIndex + 1) / flowLength) /
          Math.max(1, lessonTotal)) *
        100,
      ),
    );

    const isCompactMobileBeat =
      !isLgUp && beat != null && !showCodePanel && !showFormulaPanel;

    const classicChrome = (
      <div className="relative z-10 w-full min-w-0 shrink-0">
        <div className="mb-3 shrink-0 rounded-xl border border-primary/10 bg-white/70 p-2.5 shadow-sm backdrop-blur">
          <div className="mb-2 flex items-center gap-2">
            <LessonProgressBar
              value={classicProgressPct}
              label={`Lesson ${lessonOrdinal} of ${lessonTotal}`}
              hidePercent
              className="flex-1"
            />
            {onTogglePause && (isSpeaking || isPaused) && (
              <button
                type="button"
                onClick={onTogglePause}
                title={isPaused ? "Resume the lesson" : "Pause the lesson"}
                aria-label={isPaused ? "Resume the lesson" : "Pause the lesson"}
                aria-pressed={isPaused}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-[0.7rem] font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:text-xs"
              >
                {isPaused ? (
                  <Play className="size-3.5" aria-hidden />
                ) : (
                  <Pause className="size-3.5" aria-hidden />
                )}
                <span className="hidden min-[360px]:inline">
                  {isPaused ? "Resume" : "Pause"}
                </span>
              </button>
            )}
          </div>
          {!isCompactMobileBeat ? (
            <p className="mb-2 line-clamp-1 text-[0.7rem] text-gray-500 sm:text-xs">
              {isInstructorActive
                ? "Wait for the instructor to finish speaking."
                : isPaused
                  ? "Lesson paused — tap Resume when you're ready."
                  : canPrimaryContinue
                    ? "Ready — continue to the next step."
                    : beat?.type === "question"
                      ? "Answer the question to continue."
                      : "Listen to your instructor."}
            </p>
          ) : null}

          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => goToBeat(beatIndex - 1)}
              disabled={!canGoPreviousBeat}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:text-sm",
                canGoPreviousBeat
                  ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                  : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400",
              )}
            >
              <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">Previous</span>
            </button>
            <button
              type="button"
              onClick={() => advance()}
              disabled={!canPrimaryContinue}
              className={cn(
                "min-w-0 flex-[1.4] rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:text-sm",
                canPrimaryContinue
                  ? "bg-green-500 text-white shadow hover:bg-green-600"
                  : "cursor-not-allowed bg-gray-200 text-gray-500",
              )}
            >
              <span className="truncate">{continueLabel}</span>
            </button>
          </div>
        </div>

        {isCodeTestQuestionActive ? (
          isLgUp ? (
            <div className="min-w-0">
              <h2 className="mb-2 text-base font-bold leading-snug text-gray-900 sm:text-lg lg:text-xl">
                {beat.question.question}
              </h2>
              {avatarSlot ? (
                <div className="mt-3 flex justify-center lg:mt-4 lg:justify-start">
                  <div className="aspect-square h-36 w-36 max-w-full overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-b from-primary/10 to-white shadow-inner sm:h-44 sm:w-44 lg:h-auto lg:min-h-48 lg:w-full">
                    {avatarSlot}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {/* Mobile: collapse the prompt so the editor gets full height. */}
              <MobileCollapsible label="question">
                <h2 className="text-base font-bold leading-snug text-gray-900 sm:text-lg">
                  {beat.question.question}
                </h2>
              </MobileCollapsible>
              {/* Keep the instructor mounted (off-screen) so voice still plays on mobile. */}
              {avatarSlot ? (
                <div
                  className="pointer-events-none fixed bottom-0 right-0 z-0 h-[280px] w-[320px] translate-x-8 translate-y-12 opacity-0"
                  aria-hidden
                >
                  {avatarSlot}
                </div>
              ) : null}
            </>
          )
        ) : null}
      </div>
    );

    const classicLessonBoard = (
      <div className="relative min-h-0 w-full min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-0 opacity-5">
          <div className="absolute top-20 right-10 h-32 w-32 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-20 left-10 h-40 w-40 rounded-full bg-primary/60 blur-3xl" />
        </div>

        <div className="relative z-10 min-w-0 space-y-4 pb-6 sm:space-y-6 sm:pb-8">
          {!isCompactMobileBeat ? (
            <div className="mb-2">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-sm font-medium uppercase tracking-wide text-primary/70">
                  {phaseLabel}
                </span>
              </div>
              <h2 className="mb-3 text-xl font-bold leading-tight text-gray-900 sm:text-2xl lg:text-3xl">
                {lesson.title}
              </h2>
              <div className="h-1 w-24 rounded-full bg-linear-to-r from-primary via-primary/80 to-primary/60" />
            </div>
          ) : beat?.type === "question" ? (
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-primary/70">
              {phaseLabel}
            </p>
          ) : null}

          {/*
            Subtitle stage is for teaching beats only. Questions / bridge must
            show their UI immediately (like CourseDetails), even while the
            avatar is still speaking the prompt.
          */}
          {isInstructorActive &&
            beat?.type !== "question" &&
            beat?.type !== "bridge" &&
            beat?.type !== "recap" ? (
            <div className="flex min-h-[200px] flex-1 items-center justify-center sm:min-h-[260px] lg:min-h-[300px]">
              <div className="mx-auto max-w-2xl px-4 sm:px-6">
                <div className="mb-6 flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-sm font-medium text-primary/70">
                    Your instructor is speaking...
                  </span>
                </div>
                <div className="rounded-2xl border-2 border-primary/20 bg-white/80 p-5 shadow-xl backdrop-blur-md sm:p-8">
                  <p className="text-center text-lg font-medium leading-relaxed text-gray-800 sm:text-2xl md:text-3xl">
                    {currentSubtitle || "…"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            beatBoard
          )}
        </div>
      </div>
    );

    return (
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white">
        {!hideFlowChrome ? (
          <V2SkipPanel
            lesson={lesson}
            activeBeatId={beat?.id ?? null}
            onJump={(target) => goToBeat(target.index)}
          />
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
              "relative box-border flex h-full min-h-0 flex-col overflow-y-auto scrollbar-hide",
              isLgUp ? "px-5 py-4 sm:px-6 sm:py-5" : "min-w-0",
            )}
          >
            {isLgUp ? (
              <>
                {classicChrome}
                {avatarSlot && !isCodeTestQuestionActive ? (
                  <div className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden sm:mt-4">
                    <div className="flex h-full min-h-0 min-w-0 w-full items-center justify-center sm:justify-start">
                      {avatarSlot}
                    </div>
                  </div>
                ) : null}
              </>
            ) : avatarSlot && !isCodeTestQuestionActive ? (
              <div
                className="pointer-events-none fixed bottom-0 right-0 z-0 h-[280px] w-[320px] translate-x-8 translate-y-12 opacity-0"
                aria-hidden
              >
                {avatarSlot}
              </div>
            ) : null}
          </div>

          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {!isLgUp && (
              <div className="shrink-0 border-b border-primary/10 bg-white/95 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-white/80">
                {!suppressMobileWaitBanner ? (
                  <PageLoadWaitBanner isLoading={showInstructorWait} />
                ) : null}
                <div className="flex items-center gap-3 px-4 py-2 sm:px-5">
                  <div className="relative flex size-11 shrink-0 items-center justify-center sm:size-12">
                    {isInstructorActive ? (
                      <>
                        <span className="absolute inline-flex size-[120%] animate-ping rounded-full bg-primary/30" />
                        <span className="absolute inline-flex size-full rounded-full bg-primary/20" />
                      </>
                    ) : null}
                    <div
                      className={cn(
                        "relative flex size-9 items-center justify-center rounded-xl border-2 bg-white shadow-md transition-all duration-300 sm:size-10",
                        isInstructorActive
                          ? "scale-105 border-primary shadow-lg shadow-primary/25"
                          : "border-primary/25",
                      )}
                    >
                      <Mic
                        className={cn(
                          "size-[1.15rem] text-primary sm:size-5",
                          isInstructorActive && "animate-pulse",
                        )}
                        aria-hidden
                      />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary/80">
                      Instructor audio
                    </p>
                    <p className="truncate text-xs text-gray-600 sm:text-sm">
                      {isInstructorActive
                        ? currentSubtitle || "Speaking…"
                        : isPaused
                          ? currentSubtitle || "Paused"
                          : "Ready when you are"}
                    </p>
                  </div>
                </div>
                {showMobileAudioUnlock ? (
                  <div className="border-t border-primary/15 bg-linear-to-b from-primary/10 to-primary/5 px-4 py-3 sm:px-5">
                    <p className="mb-2.5 text-center text-[0.7rem] leading-snug text-gray-600 sm:text-xs">
                      {MOBILE_INSTRUCTOR_AUDIO_HINT}
                    </p>
                    <button
                      type="button"
                      onClick={onMobileAudioUnlock}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary/90 active:scale-[0.99]"
                    >
                      <Volume2 className="h-5 w-5 shrink-0" aria-hidden />
                      <span>{MOBILE_INSTRUCTOR_AUDIO_BUTTON}</span>
                    </button>
                  </div>
                ) : null}
                <div className="px-4 pb-4 sm:px-5">{classicChrome}</div>
              </div>
            )}

            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col border-l-0 border-primary/20 bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white lg:border-l-2",
                fillWorkspace
                  ? "overflow-hidden"
                  : "overflow-y-auto overflow-x-hidden overscroll-y-contain scrollbar-hide touch-pan-y",
              )}
            >
              <div
                className={cn(
                  "flex min-h-0 w-full min-w-0 flex-1 flex-col",
                  fillWorkspace
                    ? "h-full"
                    : "p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-8",
                )}
              >
              {showCodePanel ? (
                <div className="flex h-full min-h-0 w-full flex-1 flex-col">
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {codeWorkspace}
                  </div>
                </div>
              ) : showFormulaPanel ? (
                <div className="min-h-0 flex-1 overflow-y-auto border-l-0 border-primary/20 bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white p-4 sm:p-6 lg:border-l-2">
                  <div className="overflow-hidden rounded-xl border border-primary/20 bg-white/60 p-4 shadow-sm backdrop-blur-sm">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                      Formula board
                    </p>
                    <div className="min-h-[120px] rounded-lg bg-primary/5 p-3 font-mono text-base text-gray-900">
                      <MathText displayMode forceMath>
                        {formulaBoardText}
                      </MathText>
                    </div>
                    {beat?.type === "question" && demoMode === "practice" && (
                      <div className="mt-3 space-y-2.5">
                        <input
                          type="text"
                          value={formulaAnswer}
                          onChange={(e) => setFormulaAnswer(e.target.value)}
                          disabled={isAnswerSubmitted}
                          placeholder="Type your answer…"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium outline-none focus:border-primary"
                        />
                        {!isAnswerSubmitted && (
                          <ContinueButton
                            label="Check answer"
                            onClick={handleSubmitFormula}
                            disabled={!formulaAnswer.trim() || isSpeaking}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                classicLessonBoard
              )}
              </div>
            </div>
          </div>
        </Split>

        {fullscreen && showCodePanel && !useWeb && (
          <FullscreenModal
            type={fullscreen}
            code={code}
            results={results}
            language={runLanguage}
            onClose={() => setFullscreen(null)}
            onCodeChange={(value) => {
              if (editorLocked) return;
              setCode(value);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f6f8]">
      {!hideFlowChrome ? (
        <V2SkipPanel
          lesson={lesson}
          activeBeatId={beat?.id ?? null}
          onJump={(target) => goToBeat(target.index)}
        />
      ) : null}

      {!hideFlowChrome ? (
        <div className="shrink-0 border-b border-gray-100 bg-white px-4 py-2 sm:px-5">
          <BeatProgressBar
            flow={lesson.flow}
            beatIndex={beatIndex}
            completedBeatIds={completedBeatIds}
            onJump={goToBeat}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "min-h-0 min-w-0 flex-1 overflow-x-hidden",
          kidsStage ? "p-2 sm:p-3 md:p-4" : "p-3 sm:p-4 lg:p-5",
          fillWorkspace
            ? "flex flex-col overflow-hidden"
            : "overflow-y-auto overscroll-y-contain scrollbar-hide touch-pan-y",
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-7xl flex-col",
            kidsStage ? "gap-2 sm:gap-3" : "gap-3",
            fillWorkspace ? "h-full min-h-0" : "min-h-full",
            sideBySide && "lg:flex-row lg:items-stretch",
          )}
        >
          <div
            className={
              fillWorkspace
                ? kidsStage
                  ? cn(
                    "max-h-[min(45%,17rem)] shrink-0 overflow-y-auto sm:max-h-[min(48%,20rem)] md:max-h-[50%]",
                    "lg:h-full lg:max-h-none lg:w-80 xl:w-96",
                  )
                  : "max-h-[42%] shrink-0 overflow-y-auto"
                : undefined
            }
          >
            {instructionCard}
          </div>

          {showCodePanel && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div
                className={cn(
                  "min-h-0 flex-1 overflow-hidden",
                  kidsStage ? "p-1.5 sm:p-2 md:p-3" : "p-2 sm:p-3",
                )}
              >
                {codeWorkspace}
              </div>
            </div>
          )}

          {showFormulaPanel && (
            <div
              className={cn(
                "overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm",
                kidsStage ? "p-3 sm:p-4" : "p-4",
                fillWorkspace ? "min-h-0 min-w-0 flex-1 overflow-y-auto" : "",
              )}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                Formula board
              </p>
              <div className="min-h-[120px] rounded-lg bg-primary/5 p-3 font-mono text-base text-gray-900">
                <MathText displayMode forceMath>
                  {formulaBoardText}
                </MathText>
              </div>

              {beat?.type === "question" && demoMode === "practice" && (
                <div className="mt-3 space-y-2.5">
                  <input
                    type="text"
                    value={formulaAnswer}
                    onChange={(e) => setFormulaAnswer(e.target.value)}
                    disabled={isAnswerSubmitted}
                    placeholder="Type your answer…"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium outline-none focus:border-primary"
                  />
                  {!isAnswerSubmitted && (
                    <ContinueButton
                      label="Check answer"
                      onClick={handleSubmitFormula}
                      disabled={!formulaAnswer.trim() || isSpeaking}
                      className={
                        kidsStage
                          ? "h-12 w-full text-base sm:h-auto sm:w-auto sm:text-sm"
                          : undefined
                      }
                    />
                  )}
                  {showCelebration && (
                    <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <CheckCircle2 className="h-4 w-4" /> Awesome!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {continueRow}

      {fullscreen && showCodePanel && !useWeb && (
        <FullscreenModal
          type={fullscreen}
          code={code}
          results={results}
          language={runLanguage}
          onClose={() => setFullscreen(null)}
          onCodeChange={(value) => {
            if (editorLocked) return;
            setCode(value);
          }}
        />
      )}
    </div>
  );
}

function QuestionPanel({
  beat,
  selectedAnswer,
  onSelectAnswer,
  isSubmitted,
  onSubmitMcTf,
  isSpeaking,
  showCelebration,
  wrongAttempts,
  retryMax,
  retryHint,
}: {
  beat: QuestionBeat;
  selectedAnswer: string | boolean | null;
  onSelectAnswer: (a: string | boolean) => void;
  isSubmitted: boolean;
  onSubmitMcTf: () => void;
  isSpeaking: boolean;
  showCelebration: boolean;
  wrongAttempts: number;
  retryMax: number;
  retryHint?: string;
}) {
  const q = beat.question;
  const triesLeft = Math.max(0, retryMax - wrongAttempts);
  const isMcTf =
    q.type === "multiple_choice" || q.type === "true_false";
  const correctTfAnswer =
    typeof q.answer === "boolean" ? q.answer : undefined;

  return (
    <Panel label="Quick check">
      {retryMax > 0 && !showCelebration && (
        <p className="mb-2 text-[0.7rem] font-medium text-gray-500">
          Wrong tries left before we move on: {triesLeft}
          {retryHint ? " · A hint plays after a wrong answer" : ""}
        </p>
      )}
      {showCelebration && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/15 px-2.5 py-1.5 text-xs font-semibold text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Awesome! You got it!
        </div>
      )}
      {isSubmitted && !showCelebration && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700">
          <XCircle className="h-4 w-4 text-primary" />
          {triesLeft > 0
            ? "Not yet — try again!"
            : "Let's review the answer and continue."}
        </div>
      )}

      {isMcTf ? (
        <div className="min-w-0">
          <h3 className="mb-2 text-base font-semibold leading-snug text-gray-900 sm:text-lg">
            <MathText>{q.question}</MathText>
          </h3>
          <div className="mb-3 h-0.5 w-14 rounded-full bg-linear-to-r from-primary via-primary/80 to-primary/60" />

          {q.type === "multiple_choice" && (
            <MultipleChoiceQuestion
              question={q}
              selectedAnswer={
                typeof selectedAnswer === "string" ? selectedAnswer : null
              }
              onSelect={onSelectAnswer}
              disabled={isSubmitted || isSpeaking}
              isSubmitted={isSubmitted}
            />
          )}

          {q.type === "true_false" && (
            <TrueFalseQuestion
              selectedAnswer={
                typeof selectedAnswer === "boolean" ? selectedAnswer : null
              }
              onSelect={onSelectAnswer}
              disabled={isSubmitted || isSpeaking}
              isSubmitted={isSubmitted}
              correctAnswer={correctTfAnswer}
            />
          )}

          <div className="sticky bottom-0 z-10 -mx-3 mt-4 border-t border-primary/10 bg-white/95 px-3 py-3 backdrop-blur-sm supports-backdrop-filter:bg-white/90 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <button
              type="button"
              onClick={onSubmitMcTf}
              disabled={
                selectedAnswer === null || isSubmitted || isSpeaking
              }
              className={cn(
                "w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all sm:w-auto sm:py-2.5",
                selectedAnswer !== null && !isSubmitted && !isSpeaking
                  ? "bg-primary text-white shadow-md hover:bg-primary/90 active:scale-[0.99]"
                  : "cursor-not-allowed bg-gray-200 text-gray-500",
              )}
            >
              {isSubmitted ? "Answer Submitted" : "Submit Answer"}
            </button>
          </div>

          {isSubmitted && q.explanation ? (
            <div
              className={cn(
                "mt-4 rounded-lg border-l-4 p-3",
                selectedAnswer === q.answer
                  ? "border-green-500 bg-green-50"
                  : "border-red-500 bg-red-50",
              )}
            >
              <p className="text-sm font-semibold text-gray-800">
                {selectedAnswer === q.answer ? "Correct!" : "Incorrect"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">
                <MathText>{q.explanation}</MathText>
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}
