import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock, Loader2, Map as MapIcon, RotateCcw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { apiErrorMessage, apiErrorStatus, fetchResult, startAttempt } from "../api";
import { coursePath, formatDuration, testAttemptPath, testIntroPath } from "../paths";
import { TYPE_META } from "../cards/cardStyles";
import { CodeBlock } from "../cards/CodeBlock";
import { GradeBadge } from "../components/TestBits";
import type { AttemptResult, Recommendation, ReviewItem, TestQuestionType } from "../types";

export default function TestResultPage() {
  const { attemptId = "" } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retaking, setRetaking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchResult(attemptId)
      .then((data) => !cancelled && setResult(data))
      .catch((e) => {
        if (cancelled) return;
        const status = apiErrorStatus(e);
        const open = (e as { response?: { data?: { data?: { attemptId?: number } } } })?.response?.data?.data;
        // Still running: go back to the test.
        if (status === 409 && open?.attemptId) {
          setError("This test is still in progress.");
          return;
        }
        setError(status === 404 ? "We couldn't find this result." : apiErrorMessage(e, "Could not load the result."));
      });
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const retake = async () => {
    if (!result || retaking) return;
    setRetaking(true);
    try {
      const { attemptId: next } = await startAttempt(result.testId);
      navigate(testAttemptPath(result.testId, next));
    } catch (e) {
      setRetaking(false);
      toast.error(apiErrorMessage(e, "Could not start a new attempt."));
    }
  };

  if (error) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-[#EDEAF3] bg-white p-8 text-center">
        <p className="app-type-body text-[#132050]">{error}</p>
        <Link to={PRIVATE_PATHS.TESTS} className="app-type-link mt-4 inline-block">
          Back to tests
        </Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-64 items-center justify-center text-primary">
        <Loader2 className="size-6 animate-spin" aria-label="Loading result" />
      </div>
    );
  }

  const rec = result.recommendation;
  const percent = Math.round(result.percent ?? 0);
  const byType = rec?.byType ?? {};

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-10">
      <Link
        to={testIntroPath(result.testId)}
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-[#132050]/70 hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden /> {result.test.title}
      </Link>

      <section className="rounded-[28px] bg-[#FBF5FC] p-5 sm:p-8">
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-[0_24px_60px_-24px_rgba(170,70,142,0.3)] sm:p-8">
          <GradeBadge grade={result.grade} size="lg" />
          <div>
            <p className="font-solway text-4xl font-extrabold text-[#132050]">{percent}%</p>
            <p className="app-type-meta mt-1">
              {formatScore(result.score)} of {formatScore(result.maxScore)} points
              {rec?.total != null ? ` · ${rec.correctCount ?? 0} of ${rec.total} cards right first time` : ""}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold",
                result.passed ? "bg-[#ECFDF3] text-[#15803D]" : "bg-[#FEF2F2] text-[#B91C1C]",
              )}
            >
              {result.passed ? "Passed" : "Not passed yet"} · pass mark {result.test.passMark}%
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F6F3FA] px-3 py-1 text-xs font-semibold text-[#4B4458]">
              <Clock className="size-3.5" aria-hidden /> {formatDuration(result.durationSeconds)}
            </span>
            {result.status === "expired" ? (
              <span className="rounded-full bg-[#FFFBEB] px-3 py-1 text-xs font-semibold text-[#B45309]">Time ran out</span>
            ) : null}
          </div>
          {Object.keys(byType).length > 1 ? (
            <div className="grid w-full gap-2 pt-2 sm:grid-cols-2">
              {(Object.entries(byType) as [TestQuestionType, { total: number; correct: number }][]).map(([type, s]) => (
                <div key={type} className="flex items-center justify-between rounded-xl bg-[#F8F8FA] px-3 py-2 text-left">
                  <span className="text-[13px] font-semibold text-[#132050]/80">{TYPE_META[type]?.label ?? type}</span>
                  <span className="text-[13px] font-bold text-[#132050]">
                    {s.correct}/{s.total}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {rec ? <RecommendationCard rec={rec} attemptsLeft={result.attemptsLeft} retaking={retaking} onRetake={() => void retake()} /> : null}

      <section className="flex flex-col gap-3">
        <h2 className="app-type-section-title">Review your answers</h2>
        {result.review.map((item, i) => (
          <ReviewCard key={item.question.id} item={item} n={i + 1} language={result.test.language} />
        ))}
      </section>
    </div>
  );
}

function formatScore(n: number | null) {
  if (n == null) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function RecommendationCard({
  rec,
  attemptsLeft,
  retaking,
  onRetake,
}: {
  rec: Recommendation;
  attemptsLeft: number | null;
  retaking: boolean;
  onRetake: () => void;
}) {
  const title = rec.label ? `${rec.label} — here's what to do next` : "What to do next";
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F6E9FB] text-primary">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="app-type-section-title">{title}</h2>
          {rec.message ? <p className="app-type-body mt-1 text-[#132050]/75">{rec.message}</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {rec.nextCourse ? (
          <ActionLink to={coursePath(rec.nextCourse.slug)} icon={<ArrowRight className="size-4" />} primary>
            {rec.action === "next_level" && rec.nextLevel ? `Move up to ${rec.nextLevel}: ` : "Next course: "}
            {rec.nextCourse.title}
          </ActionLink>
        ) : null}
        {rec.action === "next_level" && !rec.nextCourse ? (
          <p className="text-[13px] text-[#4B4458]">
            {rec.nextLevel ? `There's no ${rec.nextLevel} course for this yet — keep an eye on your courses.` : "You've reached the top level. Amazing!"}
          </p>
        ) : null}
        {rec.learningPath ? (
          <ActionLink to={PRIVATE_PATHS.LEARNING_PATH} icon={<MapIcon className="size-4" />} primary>
            Follow the learning path: {rec.learningPath.title}
          </ActionLink>
        ) : null}
        {rec.reviewLessons.length ? (
          <div className="flex flex-col gap-1.5">
            <p className="app-type-label">Lessons to review</p>
            {rec.reviewLessons.map((l) => (
              <ActionLink key={`${l.courseSlug}-${l.lessonId}`} to={coursePath(l.courseSlug)} icon={<BookOpen className="size-4" />}>
                {l.lessonTitle || "Open the lesson"}
              </ActionLink>
            ))}
          </div>
        ) : null}
        {rec.course && !rec.reviewLessons.length && rec.action !== "next_course" && rec.action !== "next_level" ? (
          <ActionLink to={coursePath(rec.course.slug)} icon={<BookOpen className="size-4" />}>
            Back to {rec.course.title}
          </ActionLink>
        ) : null}
        {rec.canRetake ? (
          <button
            type="button"
            onClick={onRetake}
            disabled={retaking}
            className={cn(
              "inline-flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition disabled:opacity-60",
              rec.action === "retake_test"
                ? "border-primary bg-primary text-white hover:brightness-110"
                : "border-[#EDEAF3] text-[#132050] hover:border-primary/40",
            )}
          >
            <span>
              Take the test again
              {attemptsLeft != null ? ` (${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left)` : ""}
            </span>
            {retaking ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
          </button>
        ) : (
          <p className="text-[13px] text-[#4B4458]">You've used all your attempts for this test.</p>
        )}
      </div>
    </section>
  );
}

function ActionLink({ to, icon, primary, children }: { to: string; icon: React.ReactNode; primary?: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition",
        primary ? "border-primary/30 bg-[#FBF5FC] text-[#132050] hover:border-primary" : "border-[#EDEAF3] text-[#132050] hover:border-primary/40",
      )}
    >
      <span>{children}</span>
      <span className="text-primary">{icon}</span>
    </Link>
  );
}

function ReviewCard({ item, n, language }: { item: ReviewItem; n: number; language: string | null }) {
  const q = item.question;
  const a = item.answer;
  const right = Boolean(a?.firstTryCorrect);
  const status = !a ? "Not answered" : right ? "Right first time" : a.correct ? "Got there after a retry" : "Not right";
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[#EDEAF3] bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-primary">
          {n}. {TYPE_META[q.type]?.label}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
            right ? "bg-[#ECFDF3] text-[#15803D]" : a ? "bg-[#FEF2F2] text-[#B91C1C]" : "bg-[#F6F3FA] text-[#6B6572]",
          )}
        >
          {right ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
          {status}
        </span>
      </div>
      {q.code ? <CodeBlock code={q.code} language={language} /> : null}
      <p className="m-0 font-semibold text-[#1F1B24]">{q.prompt}</p>
      <AnswerLines item={item} />
      {item.explanation ? <p className="rounded-xl bg-[#F6F3FA] px-3 py-2 text-[13px] text-[#4B4458]">{item.explanation}</p> : null}
      {item.lessonRef?.courseSlug && !right ? (
        <Link to={coursePath(item.lessonRef.courseSlug)} className="app-type-link inline-flex items-center gap-1 text-sm">
          <BookOpen className="size-4" aria-hidden /> Review: {item.lessonRef.lessonTitle || "the lesson"}
        </Link>
      ) : null}
    </article>
  );
}

function AnswerLines({ item }: { item: ReviewItem }) {
  const q = item.question;
  const a = item.answer;
  const line = (label: string, value: string, tone: "you" | "right") => (
    <p className="flex flex-wrap gap-1.5 text-sm">
      <span className="font-semibold text-[#6B6572]">{label}</span>
      <span className={cn("font-semibold", tone === "right" ? "text-[#15803D]" : "text-[#132050]")}>{value}</span>
    </p>
  );

  if (q.type === "code_prediction" || q.type === "multiple_choice") {
    const label = (id: unknown) => q.options.find((o) => o.id === String(id))?.label ?? "—";
    return (
      <div className="flex flex-col gap-1">
        {line("Your answer:", a ? label(a.value) : "—", "you")}
        {!a?.firstTryCorrect ? line("Right answer:", label(item.correctAnswer), "right") : null}
      </div>
    );
  }
  if (q.type === "true_false") {
    const label = (v: unknown) => (v === true ? "True" : v === false ? "False" : "—");
    return (
      <div className="flex flex-col gap-1">
        {line("Your answer:", a ? label(a.value) : "—", "you")}
        {!a?.firstTryCorrect ? line("Right answer:", label(item.correctAnswer), "right") : null}
      </div>
    );
  }
  if (q.type === "fill_blank") {
    return (
      <div className="flex flex-col gap-1">
        <p className="rounded-xl bg-[#1E1B2E] px-3 py-2 font-mono text-sm text-[#E9E4F0]">
          {q.pre}
          <span className="rounded bg-[#16A34A] px-1.5 font-bold text-white">{String(item.correctAnswer ?? "")}</span>
          {q.post}
        </p>
        {a && !a.firstTryCorrect ? line("You needed", `${a.tries} tries`, "you") : null}
      </div>
    );
  }
  if (q.type === "match_pairs") {
    const matches = (item.correctAnswer as { matches?: Record<string, string> } | null)?.matches ?? {};
    const rightText = new Map(q.right.map((r) => [r.token, r.text]));
    const missed = new Set(a?.missed ?? []);
    return (
      <ul className="flex flex-col gap-1.5">
        {q.left.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
            <code className="rounded-lg bg-[#1E1B2E] px-2 py-1 font-mono text-[13px] text-[#E9E4F0]">{l.text}</code>
            <ArrowRight className="size-3.5 text-[#9C96A6]" aria-hidden />
            <span className="font-semibold text-[#132050]">{rightText.get(matches[l.id]) ?? "—"}</span>
            {a ? (
              missed.has(l.id) || !(a.matched ?? []).includes(l.id) ? (
                <X className="size-4 text-[#DC2626]" aria-label="Missed first time" />
              ) : (
                <Check className="size-4 text-[#16A34A]" aria-label="Matched first time" />
              )
            ) : null}
          </li>
        ))}
      </ul>
    );
  }
  return null;
}
