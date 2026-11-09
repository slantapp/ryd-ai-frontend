import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Clock, Flag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { playCorrectOrStreakSfx, playLearningSfx } from "@/features/curriculum-preview/v2/learningSfx";
import { answerQuestion, apiErrorMessage, apiErrorStatus, fetchAttempt, submitAttempt } from "../api";
import { testIntroPath, testResultPath } from "../paths";
import { CardShell } from "../cards/CardShell";
import type { CardFeedback } from "../cards/cardStyles";
import { ChoiceCard, FillBlankCard, MatchPairsCard, TrueFalseCard, type BlankStatus } from "../cards/QuestionCards";
import {
  BuildAnswerCard,
  ListenAnswerCard,
  OrderLinesCard,
  PlaceOnLineCard,
  SelectAllCard,
  SortBucketsCard,
  SpeedRoundCard,
  SpotBugCard,
  SpotMistakeCard,
  TraceStepsCard,
  TypeOutputCard,
  type SpotBugStage,
} from "../cards/QuestionCardsExtra";
import type { AttemptQuestion, AttemptView, TestQuestionType } from "../types";
import "../tests.css";

/** How long a wrong chip / pair stays red before it resets (as in the guide). */
const WRONG_FLASH_MS = 450;

/** Learning-mode cards that allow a second try before revealing the answer. */
const RETRY_WITH_LIMIT = new Set<TestQuestionType>([
  "fill_blank",
  "order_lines",
  "build_answer",
  "select_all",
  "type_output",
  "place_on_line",
  "sort_buckets",
  "trace_steps",
  "spot_bug",
]);

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

type CardState = {
  /** Learning mode: the server has graded the card. Exam mode: the answer is saved. */
  done: boolean;
  revealed: boolean;
  correct?: boolean;
  firstTryCorrect?: boolean;
  correctAnswer?: unknown;
  explanation?: string | null;
  /** choice id, boolean, or word chip */
  selected: unknown;
  blankStatus: BlankStatus;
  /** match pairs: left id -> right token */
  matched: Record<string, string>;
  selectedLeft: string | null;
  wrong: { left: string; right: string } | null;
  /** any wrong try on this card (streak) */
  missed: boolean;
  /** Learning-mode attempt count for this card (server tries). */
  tries: number;
  sequence: string[];
  multiSelected: string[];
  typed: string;
  tick: number | null;
  bucketMap: Record<string, string>;
  traceValues: (string | number)[];
  traceMisses: number;
  bugStage: SpotBugStage;
  bugLine: number | null;
  bugFixId: string | null;
  bugTries: number;
  speedResults: { id: string; value: boolean }[];
  speedStarted: boolean;
  speedEndsAt: number | null;
  showSpokenText: boolean;
  checkWrong: boolean;
};

function initialCardState(q: AttemptQuestion, instant: boolean): CardState {
  const f = q.feedback;
  const matched: Record<string, string> = {};
  for (const m of f?.matched ?? []) if (m.right) matched[m.left] = m.right;
  const done = Boolean(f?.done);
  const revealed = instant && done;
  let blankStatus: BlankStatus = "idle";
  if (q.type === "fill_blank" && done) {
    blankStatus = !instant ? "selected" : f?.correct === false ? "wrong" : "correct";
  }

  const traceLen = q.type === "trace_steps" ? q.steps.length : 0;
  const traceFrom =
    q.type === "trace_steps" && Array.isArray(f?.value) ? (f.value as (string | number)[]) : [];
  const bugVal =
    q.type === "spot_bug" && f?.value && typeof f.value === "object" && !Array.isArray(f.value)
      ? (f.value as { line?: number; fixId?: string })
      : null;
  const speedFrom =
    q.type === "speed_round" && Array.isArray(f?.value)
      ? (f.value as { id: string; value: boolean }[])
      : [];

  return {
    done,
    revealed,
    correct: f?.correct,
    firstTryCorrect: f?.firstTryCorrect,
    correctAnswer: f?.correctAnswer,
    explanation: f?.explanation ?? null,
    selected: (() => {
      if (f?.value == null) return null;
      if (q.type === "spot_mistake" && typeof f.value === "number") return f.value;
      if (q.type === "listen_answer") return String(f.value);
      if (q.type === "true_false" && typeof f.value === "boolean") return f.value;
      if (q.type === "code_prediction" || q.type === "multiple_choice") return String(f.value);
      if (done && (q.type === "fill_blank" || q.type === "type_output")) return f.value;
      return done ? f.value : null;
    })(),
    blankStatus,
    matched,
    selectedLeft: null,
    wrong: null,
    missed: Boolean(f && f.tries > 1) || f?.firstTryCorrect === false,
    tries: f?.tries ?? 0,
    sequence:
      q.type === "order_lines" || q.type === "build_answer"
        ? asStringArray(done ? f?.value : f?.value)
        : [],
    multiSelected: q.type === "select_all" ? asStringArray(f?.value) : [],
    typed: q.type === "type_output" && typeof f?.value === "string" ? f.value : "",
    tick: q.type === "place_on_line" && typeof f?.value === "number" ? f.value : null,
    bucketMap:
      q.type === "sort_buckets" && f?.value && typeof f.value === "object" && !Array.isArray(f.value)
        ? (f.value as Record<string, string>)
        : {},
    traceValues:
      traceLen > 0
        ? Array.from({ length: traceLen }, (_, i) => traceFrom[i] ?? "")
        : [],
    traceMisses: 0,
    bugStage: done ? "fix" : bugVal?.line != null ? "fix" : "run",
    bugLine: bugVal?.line ?? null,
    bugFixId: bugVal?.fixId ?? null,
    bugTries: f?.tries ?? 0,
    speedResults: speedFrom,
    speedStarted: q.type === "speed_round" && (done || speedFrom.length > 0),
    speedEndsAt: null,
    showSpokenText: false,
    checkWrong: false,
  };
}

/** Consecutive first-try-correct cards just before `index` (rebuilds the streak on resume). */
function streakBefore(questions: AttemptQuestion[], states: Record<number, CardState>, index: number): number {
  let n = 0;
  for (let i = index - 1; i >= 0; i -= 1) {
    const s = states[questions[i].id];
    if (!s?.done || !s.firstTryCorrect) break;
    n += 1;
  }
  return n;
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TestAttemptPage() {
  const { testId = "", attemptId = "" } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<AttemptView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [states, setStates] = useState<Record<number, CardState>>({});
  const [index, setIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [speedTick, setSpeedTick] = useState(0);
  const clockOffset = useRef(0);
  const timers = useRef<number[]>([]);
  const finishedRef = useRef(false);

  const instant = view?.test.instantFeedback ?? true;
  const questions = useMemo(() => view?.questions ?? [], [view]);
  const question = questions[index];
  const state = question ? states[question.id] : undefined;

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const finish = useCallback(
    async (reason: "done" | "manual" | "timeout") => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setFinishing(true);
      try {
        await submitAttempt(attemptId);
        playLearningSfx("moduleComplete");
        if (reason === "timeout") toast.info("Time is up. Your answers have been submitted.");
        navigate(testResultPath(attemptId), { replace: true });
      } catch (e) {
        finishedRef.current = false;
        setFinishing(false);
        toast.error(apiErrorMessage(e, "Could not submit the test. Please try again."));
      }
    },
    [attemptId, navigate],
  );

  const load = useCallback(async () => {
    try {
      const data = await fetchAttempt(attemptId);
      if (data.status !== "in_progress") {
        navigate(testResultPath(attemptId), { replace: true });
        return;
      }
      clockOffset.current = new Date(data.serverNow).getTime() - Date.now();
      const instantMode = data.test.instantFeedback;
      const next: Record<number, CardState> = {};
      for (const q of data.questions) next[q.id] = initialCardState(q, instantMode);
      const firstOpen = data.questions.findIndex((q) => !next[q.id].done);
      const start = firstOpen === -1 ? Math.max(0, data.questions.length - 1) : firstOpen;
      setStates(next);
      setIndex(start);
      setStreak(instantMode ? streakBefore(data.questions, next, start) : 0);
      setView(data);
    } catch (e) {
      setLoadError(apiErrorStatus(e) === 404 ? "We couldn't find this test attempt." : apiErrorMessage(e, "Could not load the test."));
    }
  }, [attemptId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  // Countdown, corrected for the difference between this device's clock and the server's.
  useEffect(() => {
    if (!view?.expiresAt) return;
    const end = new Date(view.expiresAt).getTime();
    const tick = () => {
      const left = end - (Date.now() + clockOffset.current);
      setRemainingMs(left);
      if (left <= 0) void finish("timeout");
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [view?.expiresAt, finish]);

  const patch = useCallback((qid: number, change: Partial<CardState>) => {
    setStates((prev) => ({ ...prev, [qid]: { ...prev[qid], ...change } }));
  }, []);

  const handleAnswerError = useCallback(
    async (e: unknown) => {
      const status = apiErrorStatus(e);
      const message = apiErrorMessage(e, "Could not save your answer. Please try again.");
      if (status === 409 && /time is up/i.test(message)) {
        await finish("timeout");
        return;
      }
      toast.error(message);
      // The server may know more than we do (another tab, a double tap); resync.
      if (status === 409) await load();
    },
    [finish, load],
  );

  const send = useCallback(
    async (value: unknown) => {
      if (!question) return null;
      setBusy(true);
      try {
        return await answerQuestion(attemptId, question.id, value);
      } catch (e) {
        await handleAnswerError(e);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [attemptId, question, handleAnswerError],
  );

  const scoreOutcome = (firstTryCorrect: boolean) => {
    if (firstTryCorrect) {
      const n = streak + 1;
      setStreak(n);
      playCorrectOrStreakSfx(n);
    } else {
      setStreak(0);
      playLearningSfx("wrong");
    }
  };

  // ---------------------------------------------------------------------------------------------
  // Learning mode: each pick is graded right away.
  // ---------------------------------------------------------------------------------------------

  const pickSingle = async (value: string | boolean) => {
    if (!question || !state || state.done || busy) return;
    if (!instant) {
      patch(question.id, { selected: value });
      return;
    }
    patch(question.id, { selected: value });
    const res = await send(value);
    if (!res) return;
    patch(question.id, {
      done: true,
      revealed: true,
      correct: res.correct,
      firstTryCorrect: res.correct,
      correctAnswer: res.correctAnswer,
      explanation: res.explanation ?? null,
    });
    scoreOutcome(Boolean(res.correct));
  };

  const pickWord = async (word: string) => {
    if (!question || !state || state.done || busy || state.blankStatus === "wrong") return;
    if (!instant) {
      patch(question.id, { selected: word, blankStatus: "selected" });
      return;
    }
    const res = await send(word);
    if (!res) return;
    const tries = res.tries ?? state.tries + 1;
    if (res.correct) {
      patch(question.id, {
        selected: word,
        blankStatus: "correct",
        done: true,
        revealed: true,
        correct: true,
        firstTryCorrect: !state.missed,
        explanation: res.explanation ?? null,
        correctAnswer: res.correctAnswer,
        tries,
      });
      scoreOutcome(!state.missed);
      return;
    }
    if (res.done) {
      // Second wrong try — reveal the answer and let them move on.
      patch(question.id, {
        selected: word,
        blankStatus: "wrong",
        done: true,
        revealed: true,
        correct: false,
        firstTryCorrect: false,
        correctAnswer: res.correctAnswer,
        explanation: res.explanation ?? null,
        missed: true,
        tries,
      });
      playLearningSfx("wrong");
      setStreak(0);
      return;
    }
    patch(question.id, { selected: word, blankStatus: "wrong", missed: true, tries });
    playLearningSfx("wrong");
    setStreak(0);
    const qid = question.id;
    timers.current.push(
      window.setTimeout(() => {
        setStates((prev) =>
          prev[qid]?.blankStatus === "wrong" ? { ...prev, [qid]: { ...prev[qid], blankStatus: "idle", selected: null } } : prev,
        );
      }, WRONG_FLASH_MS),
    );
  };

  const pickLeft = (id: string) => {
    if (!question || !state || busy || state.wrong) return;
    if (instant) {
      if (id in state.matched) return;
      patch(question.id, { selectedLeft: state.selectedLeft === id ? null : id });
      return;
    }
    // Exam mode: tapping a paired card unpairs it so it can be paired again.
    if (id in state.matched) {
      const rest = { ...state.matched };
      delete rest[id];
      patch(question.id, { matched: rest, selectedLeft: id });
      return;
    }
    patch(question.id, { selectedLeft: state.selectedLeft === id ? null : id });
  };

  const pickRight = async (token: string) => {
    if (!question || !state || busy || state.wrong) return;
    if (!instant) {
      const owner = Object.entries(state.matched).find(([, t]) => t === token)?.[0];
      if (owner && !state.selectedLeft) {
        const rest = { ...state.matched };
        delete rest[owner];
        patch(question.id, { matched: rest });
        return;
      }
      if (!state.selectedLeft) return;
      const nextMatched = Object.fromEntries(Object.entries(state.matched).filter(([, t]) => t !== token));
      nextMatched[state.selectedLeft] = token;
      patch(question.id, { matched: nextMatched, selectedLeft: null });
      return;
    }
    const left = state.selectedLeft;
    if (!left || Object.values(state.matched).includes(token)) return;
    const res = await send({ left, right: token });
    if (!res) return;
    if (res.correct) {
      const matched = { ...state.matched, [left]: token };
      if (res.done) {
        patch(question.id, {
          matched,
          selectedLeft: null,
          done: true,
          revealed: true,
          correct: true,
          firstTryCorrect: !state.missed,
          explanation: res.explanation ?? null,
        });
        scoreOutcome(!state.missed);
      } else {
        patch(question.id, { matched, selectedLeft: null });
        playLearningSfx("correct");
      }
      return;
    }
    patch(question.id, { wrong: { left, right: token }, selectedLeft: null, missed: true });
    playLearningSfx("wrong");
    setStreak(0);
    const qid = question.id;
    timers.current.push(
      window.setTimeout(() => setStates((prev) => ({ ...prev, [qid]: { ...prev[qid], wrong: null } })), WRONG_FLASH_MS),
    );
  };

  const resetPairs = () => {
    if (!question || instant) return;
    patch(question.id, { matched: {}, selectedLeft: null });
  };

  const flashCheckWrong = (qid: number) => {
    patch(qid, { checkWrong: true });
    timers.current.push(
      window.setTimeout(() => setStates((prev) => ({ ...prev, [qid]: { ...prev[qid], checkWrong: false } })), WRONG_FLASH_MS),
    );
  };

  const completeCheck = (
    qid: number,
    res: NonNullable<Awaited<ReturnType<typeof send>>>,
    missed: boolean,
  ) => {
    patch(qid, {
      done: true,
      revealed: true,
      correct: res.correct,
      firstTryCorrect: !missed && Boolean(res.correct),
      correctAnswer: res.correctAnswer,
      explanation: res.explanation ?? null,
      checkWrong: false,
      tries: res.tries ?? undefined,
      missed: missed || !res.correct,
    });
    scoreOutcome(!missed && Boolean(res.correct));
  };

  const checkAnswer = async (value: unknown, missed: boolean) => {
    if (!question || !state || state.done || busy) return;
    if (!instant) {
      patch(question.id, { selected: value });
      return;
    }
    const res = await send(value);
    if (!res) return;
    if (res.done) {
      // Correct, or tries used up — reveal and unlock Next.
      completeCheck(question.id, res, missed || !res.correct);
      return;
    }
    patch(question.id, { missed: true, tries: res.tries ?? state.tries + 1 });
    flashCheckWrong(question.id);
    playLearningSfx("wrong");
    setStreak(0);
  };

  const pickMistake = async (index: number) => {
    if (!question || !state || state.done || busy) return;
    if (!instant) {
      patch(question.id, { selected: index });
      return;
    }
    patch(question.id, { selected: index });
    const res = await send(index);
    if (!res) return;
    patch(question.id, {
      done: true,
      revealed: true,
      correct: res.correct,
      firstTryCorrect: res.correct,
      correctAnswer: res.correctAnswer,
      explanation: res.explanation ?? null,
    });
    scoreOutcome(Boolean(res.correct));
  };

  const submitTrace = async () => {
    if (!question || !state || state.done || busy) return;
    const payload = { values: state.traceValues, misses: state.traceMisses };
    if (!instant) {
      patch(question.id, { selected: payload });
      return;
    }
    const res = await send(payload);
    if (!res) return;
    if (res.done) {
      completeCheck(question.id, res, state.missed || !res.correct);
      return;
    }
    patch(question.id, {
      traceMisses: state.traceMisses + 1,
      missed: true,
      tries: res.tries ?? state.tries + 1,
    });
    flashCheckWrong(question.id);
    playLearningSfx("wrong");
    setStreak(0);
  };

  const submitSpotBug = async () => {
    if (!question || !state || state.done || busy || state.bugLine == null || !state.bugFixId) return;
    const tries = state.bugTries + 1;
    const payload = { line: state.bugLine, fixId: state.bugFixId, tries };
    if (!instant) {
      patch(question.id, { selected: payload });
      return;
    }
    const res = await send(payload);
    if (!res) return;
    if (res.done) {
      patch(question.id, {
        done: true,
        revealed: true,
        correct: res.correct,
        firstTryCorrect: Boolean(res.correct) && tries <= 2 && !state.missed,
        correctAnswer: res.correctAnswer,
        explanation: res.explanation ?? null,
        bugTries: tries,
        tries,
        missed: state.missed || !res.correct,
      });
      scoreOutcome(Boolean(res.correct) && tries <= 2 && !state.missed);
      return;
    }
    patch(question.id, {
      missed: true,
      bugTries: tries,
      tries,
      bugStage: "line",
      bugFixId: null,
    });
    flashCheckWrong(question.id);
    playLearningSfx("wrong");
    setStreak(0);
  };

  const submitSpeedRound = useCallback(
    async (qid: number, results: { id: string; value: boolean }[]) => {
      setBusy(true);
      try {
        const res = await answerQuestion(attemptId, qid, { results });
        patch(qid, {
          done: true,
          speedResults: results,
          correct: res.correct,
          firstTryCorrect: res.correct,
          revealed: instant,
        });
        if (instant) scoreOutcome(Boolean(res.correct));
      } catch (e) {
        await handleAnswerError(e);
      } finally {
        setBusy(false);
      }
    },
    [attemptId, handleAnswerError, instant, patch],
  );

  useEffect(() => {
    if (!question || question.type !== "speed_round" || !state?.speedStarted || state.done) return;
    const id = window.setInterval(() => setSpeedTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [question, state?.speedStarted, state?.done]);

  useEffect(() => {
    if (!question || question.type !== "speed_round" || !state?.speedStarted || state.done || busy || !state.speedEndsAt) return;
    const left = Math.max(0, Math.ceil((state.speedEndsAt - Date.now()) / 1000));
    if (left <= 0 && state.speedResults.length < question.facts.length) {
      const pending = question.facts.filter((f) => !state.speedResults.some((r) => r.id === f.id));
      const merged = [...state.speedResults, ...pending.map((f) => ({ id: f.id, value: false }))];
      void submitSpeedRound(question.id, merged);
    }
  }, [busy, question, speedTick, state, submitSpeedRound]);

  useEffect(() => {
    if (!question || question.type !== "speed_round" || !state?.speedStarted || state.done || busy) return;
    if (state.speedResults.length === question.facts.length) void submitSpeedRound(question.id, state.speedResults);
  }, [busy, question, state, submitSpeedRound]);

  function examValue(q: AttemptQuestion, s: CardState): unknown {
    switch (q.type) {
      case "match_pairs":
        return { matches: s.matched };
      case "order_lines":
      case "build_answer":
        return s.sequence;
      case "select_all":
        return [...s.multiSelected].sort();
      case "type_output":
        return s.typed.trim();
      case "place_on_line":
        return s.tick ?? 0;
      case "sort_buckets":
        return s.bucketMap;
      case "trace_steps":
        return { values: s.traceValues, misses: s.traceMisses };
      case "spot_bug":
        return { line: s.bugLine, fixId: s.bugFixId, tries: s.bugTries || 1 };
      case "speed_round":
        return { results: s.speedResults };
      default:
        return s.selected;
    }
  }

  function examReadyFor(q: AttemptQuestion, s: CardState): boolean {
    if (s.done) return true;
    switch (q.type) {
      case "match_pairs":
        return Object.keys(s.matched).length === q.left.length;
      case "order_lines":
        return s.sequence.length === q.slotCount;
      case "build_answer":
        return s.sequence.length > 0;
      case "select_all":
        return s.multiSelected.length > 0;
      case "type_output":
        return s.typed.trim().length > 0;
      case "place_on_line":
        return s.tick != null;
      case "sort_buckets":
        return q.items.every((i) => s.bucketMap[i.id]);
      case "trace_steps":
        return s.traceValues.length === q.steps.length && s.traceValues.every((v) => v !== "" && v != null);
      case "spot_bug":
        return s.bugLine != null && Boolean(s.bugFixId);
      case "speed_round":
        return s.speedResults.length === q.facts.length;
      default:
        return s.selected != null;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Next / finish
  // ---------------------------------------------------------------------------------------------

  const isLast = index >= questions.length - 1;

  const examReady = question && state && !instant ? examReadyFor(question, state) : false;

  const goNext = async () => {
    if (!question || !state) return;
    if (!instant && !state.done) {
      const value = examValue(question, state);
      const res = await send(value);
      if (!res) return;
      patch(question.id, { done: true });
    }
    if (isLast) {
      const open = questions.filter((q) => q.id !== question.id && !states[q.id]?.done).length;
      if (open > 0) setConfirmFinish(true);
      else void finish("done");
      return;
    }
    setIndex((i) => i + 1);
  };

  // ---------------------------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------------------------

  if (loadError) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-[#EDEAF3] bg-white p-8 text-center">
        <p className="app-type-body text-[#132050]">{loadError}</p>
        <Link to={testIntroPath(testId)} className="app-type-link mt-4 inline-block">
          Back to the test
        </Link>
      </div>
    );
  }

  if (!view || !question || !state) {
    return (
      <div className="flex h-64 items-center justify-center text-primary">
        <Loader2 className="size-6 animate-spin" aria-label="Loading test" />
      </div>
    );
  }

  const doneCount = questions.filter((q) => states[q.id]?.done).length;
  const unanswered = questions.length - doneCount;

  let feedback: CardFeedback | null = null;
  if (instant && state.revealed) {
    const partialOk =
      question.type === "trace_steps" || question.type === "speed_round"
        ? Boolean(state.firstTryCorrect)
        : RETRY_WITH_LIMIT.has(question.type)
          ? !state.missed && Boolean(state.correct)
          : Boolean(state.correct);
    const retryEnd =
      RETRY_WITH_LIMIT.has(question.type) ||
      question.type === "match_pairs" ||
      question.type === "fill_blank";
    feedback = partialOk
      ? { tone: "correct", title: "Nice — spot on!", body: state.explanation }
      : retryEnd && state.correct
        ? { tone: "neutral", title: "Got there in the end — only first tries score", body: state.explanation }
        : { tone: "incorrect", title: "Not quite — here's why", body: state.explanation };
  } else if (!instant && state.done) {
    feedback = { tone: "neutral", title: "Answer saved", body: "You'll see how you did when you finish the test." };
  }

  const canGoNext = instant ? state.done : examReady;
  const nextLabel = isLast ? "Finish test" : "Next";

  const body = (() => {
    const language = view.test.language;
    const locked = busy || finishing || (!instant && state.done);
    switch (question.type) {
      case "code_prediction":
      case "multiple_choice":
        return (
          <ChoiceCard
            prompt={question.prompt}
            code={question.code}
            language={language}
            options={question.options}
            selected={state.selected == null ? null : String(state.selected)}
            correctAnswer={state.correctAnswer == null ? null : String(state.correctAnswer)}
            revealed={state.revealed}
            disabled={locked}
            onPick={(id) => void pickSingle(id)}
          />
        );
      case "true_false":
        return (
          <TrueFalseCard
            statement={question.prompt}
            code={question.code}
            language={language}
            selected={typeof state.selected === "boolean" ? state.selected : null}
            correctAnswer={typeof state.correctAnswer === "boolean" ? state.correctAnswer : null}
            revealed={state.revealed}
            disabled={locked}
            onPick={(v) => void pickSingle(v)}
          />
        );
      case "fill_blank":
        return (
          <FillBlankCard
            prompt={question.prompt}
            pre={question.pre}
            post={question.post}
            language={language}
            options={question.options}
            filled={typeof state.selected === "string" ? state.selected : null}
            status={state.blankStatus}
            disabled={locked}
            onPick={(w) => void pickWord(w)}
          />
        );
      case "match_pairs":
        return (
          <MatchPairsCard
            prompt={question.prompt}
            language={language}
            left={question.left}
            right={question.right}
            matched={state.matched}
            selectedLeft={state.selectedLeft}
            wrong={state.wrong}
            revealed={instant}
            disabled={locked}
            onPickLeft={pickLeft}
            onPickRight={(t) => void pickRight(t)}
            onReset={instant ? null : resetPairs}
          />
        );
      case "order_lines": {
        const used = new Set(state.sequence);
        return (
          <OrderLinesCard
            prompt={question.prompt}
            language={language}
            lines={question.lines}
            slotCount={question.slotCount}
            order={state.sequence}
            usedIds={used}
            revealed={state.revealed}
            disabled={locked}
            checkWrong={state.checkWrong}
            canCheck={instant && !state.done}
            onAdd={(id) => state.sequence.length < question.slotCount && patch(question.id, { sequence: [...state.sequence, id] })}
            onRemove={(i) => patch(question.id, { sequence: state.sequence.filter((_, j) => j !== i) })}
            onCheck={() => void checkAnswer(state.sequence, state.missed)}
          />
        );
      }
      case "build_answer":
        return (
          <BuildAnswerCard
            prompt={question.prompt}
            tiles={question.tiles}
            sequence={state.sequence}
            revealed={state.revealed}
            disabled={locked}
            checkWrong={state.checkWrong}
            canCheck={instant && !state.done}
            onToggle={(id) => {
              const inSeq = state.sequence.includes(id);
              patch(question.id, {
                sequence: inSeq ? state.sequence.filter((x) => x !== id) : [...state.sequence, id],
              });
            }}
            onClear={() => patch(question.id, { sequence: [] })}
            onCheck={() => void checkAnswer(state.sequence, state.missed)}
          />
        );
      case "spot_mistake":
        return (
          <SpotMistakeCard
            prompt={question.prompt}
            language={language}
            steps={question.steps}
            selected={typeof state.selected === "number" ? state.selected : null}
            correctIndex={typeof state.correctAnswer === "number" ? state.correctAnswer : null}
            revealed={state.revealed}
            disabled={locked}
            onPick={(i) => void pickMistake(i)}
          />
        );
      case "select_all":
        return (
          <SelectAllCard
            prompt={question.prompt}
            options={question.options}
            selected={state.multiSelected}
            correctIds={Array.isArray(state.correctAnswer) ? state.correctAnswer.map(String) : null}
            revealed={state.revealed}
            disabled={locked}
            checkWrong={state.checkWrong}
            canCheck={instant && !state.done}
            onToggle={(id) => {
              const has = state.multiSelected.includes(id);
              patch(question.id, {
                multiSelected: has ? state.multiSelected.filter((x) => x !== id) : [...state.multiSelected, id],
              });
            }}
            onCheck={() => void checkAnswer([...state.multiSelected].sort(), state.missed)}
          />
        );
      case "type_output":
        return (
          <TypeOutputCard
            prompt={question.prompt}
            code={question.code}
            language={language}
            maxLength={question.maxLength}
            keypad={question.keypad}
            value={state.typed}
            revealed={state.revealed}
            disabled={locked}
            checkWrong={state.checkWrong}
            canCheck={instant && !state.done}
            onChange={(v) => patch(question.id, { typed: v })}
            onCheck={() => void checkAnswer(state.typed.trim(), state.missed)}
          />
        );
      case "place_on_line":
        return (
          <PlaceOnLineCard
            prompt={question.prompt}
            ticks={question.ticks}
            leftLabel={question.leftLabel}
            rightLabel={question.rightLabel}
            value={state.tick}
            correctValue={typeof state.correctAnswer === "number" ? state.correctAnswer : null}
            revealed={state.revealed}
            disabled={locked}
            checkWrong={state.checkWrong}
            canCheck={instant && !state.done}
            onChange={(v) => patch(question.id, { tick: v })}
            onCheck={() => void checkAnswer(state.tick ?? 0, state.missed)}
          />
        );
      case "sort_buckets":
        return (
          <SortBucketsCard
            prompt={question.prompt}
            items={question.items}
            buckets={question.buckets}
            map={state.bucketMap}
            revealed={state.revealed}
            disabled={locked}
            checkWrong={state.checkWrong}
            canCheck={instant && !state.done}
            onPick={(itemId, bucketId) => patch(question.id, { bucketMap: { ...state.bucketMap, [itemId]: bucketId } })}
            onCheck={() => void checkAnswer(state.bucketMap, state.missed)}
          />
        );
      case "listen_answer":
        return (
          <ListenAnswerCard
            prompt={question.prompt}
            spokenText={question.spokenText}
            showTextAllowed={question.showTextAllowed}
            options={question.options}
            selected={state.selected == null ? null : String(state.selected)}
            correctAnswer={state.correctAnswer == null ? null : String(state.correctAnswer)}
            revealed={state.revealed}
            disabled={locked}
            showText={state.showSpokenText}
            onToggleShow={() => patch(question.id, { showSpokenText: !state.showSpokenText })}
            onPick={(id) => void pickSingle(id)}
          />
        );
      case "trace_steps":
        return (
          <TraceStepsCard
            prompt={question.prompt}
            language={language}
            lines={question.lines}
            steps={question.steps}
            values={state.traceValues}
            revealed={state.revealed}
            disabled={locked}
            canCheck={instant && !state.done}
            onSet={(i, v) => {
              const next = [...state.traceValues];
              next[i] = v;
              patch(question.id, { traceValues: next });
            }}
            onCheck={() => void submitTrace()}
          />
        );
      case "spot_bug":
        return (
          <SpotBugCard
            prompt={question.prompt}
            language={language}
            lines={question.lines}
            expectedOutput={question.expectedOutput}
            actualOutput={question.actualOutput}
            clue={question.clue}
            fixes={question.fixes}
            stage={state.bugStage}
            line={state.bugLine}
            fixId={state.bugFixId}
            revealed={state.revealed}
            disabled={locked}
            onRun={() => patch(question.id, { bugStage: "line" })}
            onPickLine={(i) => patch(question.id, { bugLine: i, bugStage: "fix" })}
            onPickFix={(id) => patch(question.id, { bugFixId: id })}
            onSubmit={() => void submitSpotBug()}
            canSubmit={instant && !state.done && state.bugLine != null && Boolean(state.bugFixId)}
          />
        );
      case "speed_round": {
        const remaining =
          state.speedEndsAt != null
            ? Math.max(0, Math.ceil((state.speedEndsAt - Date.now()) / 1000))
            : question.seconds;
        return (
          <SpeedRoundCard
            prompt={question.prompt}
            seconds={question.seconds}
            facts={question.facts}
            results={state.speedResults}
            remainingSec={remaining}
            revealed={state.revealed}
            disabled={locked || finishing}
            started={state.speedStarted}
            onStart={() =>
              patch(question.id, {
                speedStarted: true,
                speedEndsAt: Date.now() + question.seconds * 1000,
              })
            }
            onPick={(id, value) => {
              if (state.speedResults.some((r) => r.id === id)) return;
              const next = [...state.speedResults, { id, value }];
              patch(question.id, { speedResults: next });
            }}
          />
        );
      }
      default:
        return null;
    }
  })();

  const lowTime = remainingMs != null && remainingMs < 60_000;

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-wrap items-center justify-between gap-3">
        <Link
          to={testIntroPath(testId)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#132050]/70 hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="max-w-[14rem] truncate">{view.test.title}</span>
        </Link>
        <div className="flex items-center gap-2">
          {remainingMs != null ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums",
                lowTime ? "bg-[#FEF2F2] text-[#B91C1C]" : "bg-white text-[#132050]",
              )}
              aria-live={lowTime ? "polite" : "off"}
              aria-label={`Time left ${formatClock(remainingMs)}`}
            >
              <Clock className="size-4" aria-hidden />
              {formatClock(remainingMs)}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setConfirmFinish(true)}
            disabled={finishing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEAF3] bg-white px-3 py-1.5 text-sm font-semibold text-[#132050]/80 hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            <Flag className="size-4" aria-hidden />
            Finish
          </button>
        </div>
      </div>

      <div className="rounded-[32px] bg-[#FBF5FC] px-3 py-6 sm:px-8 sm:py-10">
        <CardShell
          key={question.id}
          type={question.type}
          index={index}
          total={questions.length}
          streak={instant ? streak : null}
          dots={questions.map((q) => (states[q.id]?.done ? "done" : "todo"))}
          feedback={feedback}
          onNext={canGoNext ? () => void goNext() : null}
          nextLabel={finishing ? "Submitting…" : nextLabel}
          nextDisabled={busy || finishing}
          footer={
            <>
              {view.test.courseTitle ? `${view.test.courseTitle} · ` : ""}Card {index + 1} of {questions.length}
              {question.points > 1 ? ` · ${question.points} points` : ""}
            </>
          }
        >
          {body}
        </CardShell>
      </div>

      <Dialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finish the test?</DialogTitle>
            <DialogDescription>
              {unanswered > 0
                ? `You still have ${unanswered} card${unanswered === 1 ? "" : "s"} to answer. Unanswered cards score zero.`
                : "You've answered every card. Ready to see your result?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmFinish(false);
                const firstOpen = questions.findIndex((q) => !states[q.id]?.done);
                if (firstOpen >= 0) setIndex(firstOpen);
              }}
              className="rounded-full border border-[#EDEAF3] px-4 py-2 text-sm font-semibold text-[#132050]"
            >
              {unanswered > 0 ? "Keep going" : "Not yet"}
            </button>
            <button
              type="button"
              disabled={finishing}
              onClick={() => {
                setConfirmFinish(false);
                void finish("manual");
              }}
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {finishing ? "Submitting…" : "Finish and see result"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
