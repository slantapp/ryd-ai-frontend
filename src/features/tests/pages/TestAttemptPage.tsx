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
import type { AttemptQuestion, AttemptView } from "../types";
import "../tests.css";

/** How long a wrong chip / pair stays red before it resets (as in the guide). */
const WRONG_FLASH_MS = 450;

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
};

function initialCardState(q: AttemptQuestion, instant: boolean): CardState {
  const f = q.feedback;
  const matched: Record<string, string> = {};
  for (const m of f?.matched ?? []) if (m.right) matched[m.left] = m.right;
  const done = Boolean(f?.done);
  const revealed = instant && done;
  let blankStatus: BlankStatus = "idle";
  if (q.type === "fill_blank" && done) blankStatus = instant ? "correct" : "selected";
  return {
    done,
    revealed,
    correct: f?.correct,
    firstTryCorrect: f?.firstTryCorrect,
    correctAnswer: f?.correctAnswer,
    explanation: f?.explanation ?? null,
    selected: done ? (f?.value ?? null) : null,
    blankStatus,
    matched,
    selectedLeft: null,
    wrong: null,
    missed: Boolean(f && f.tries > 1) || f?.firstTryCorrect === false,
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
    if (res.correct) {
      patch(question.id, {
        selected: word,
        blankStatus: "correct",
        done: true,
        revealed: true,
        correct: true,
        firstTryCorrect: !state.missed,
        explanation: res.explanation ?? null,
      });
      scoreOutcome(!state.missed);
      return;
    }
    patch(question.id, { selected: word, blankStatus: "wrong", missed: true });
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

  // ---------------------------------------------------------------------------------------------
  // Next / finish
  // ---------------------------------------------------------------------------------------------

  const isLast = index >= questions.length - 1;

  const examReady = (() => {
    if (!question || !state || instant) return false;
    if (state.done) return true;
    if (question.type === "match_pairs") return Object.keys(state.matched).length === question.left.length;
    return state.selected != null;
  })();

  const goNext = async () => {
    if (!question || !state) return;
    if (!instant && !state.done) {
      const value = question.type === "match_pairs" ? { matches: state.matched } : state.selected;
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
    const ok = question.type === "fill_blank" || question.type === "match_pairs" ? !state.missed : Boolean(state.correct);
    feedback = ok
      ? { tone: "correct", title: "Nice — spot on!", body: state.explanation }
      : question.type === "fill_blank" || question.type === "match_pairs"
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
