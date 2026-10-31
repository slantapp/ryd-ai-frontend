import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardList, Clock, Eye, Loader2, RotateCcw, Target } from "lucide-react";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { apiErrorMessage, apiErrorStatus, fetchTest, startAttempt } from "../api";
import { coursePath, formatDuration, testAttemptPath, testResultPath } from "../paths";
import { GradeBadge, MetaChip, TypeChips } from "../components/TestBits";
import type { LearnerTestDetail } from "../types";

export default function TestIntroPage() {
  const { testId = "" } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<LearnerTestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchTest(testId)
      .then((data) => !cancelled && setTest(data))
      .catch((e) => {
        if (cancelled) return;
        setError(apiErrorStatus(e) === 404 ? "This test isn't available any more." : apiErrorMessage(e, "Could not load the test."));
      });
    return () => {
      cancelled = true;
    };
  }, [testId]);

  const start = async () => {
    if (!test || starting) return;
    setStarting(true);
    try {
      const { attemptId } = await startAttempt(test.id);
      navigate(testAttemptPath(test.id, attemptId));
    } catch (e) {
      setStarting(false);
      toast.error(apiErrorMessage(e, "Could not start the test."));
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

  if (!test) {
    return (
      <div className="flex h-64 items-center justify-center text-primary">
        <Loader2 className="size-6 animate-spin" aria-label="Loading test" />
      </div>
    );
  }

  const outOfAttempts = test.attemptsLeft === 0 && !test.openAttemptId;
  const cta = test.openAttemptId ? "Resume test" : test.attemptsUsed ? "Take it again" : "Start test";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-8">
      <Link to={PRIVATE_PATHS.TESTS} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-[#132050]/70 hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> All tests
      </Link>

      <section className="overflow-hidden rounded-[28px] bg-[#FBF5FC] p-5 sm:p-8">
        <div className="flex flex-col gap-5 rounded-3xl bg-white p-5 shadow-[0_24px_60px_-24px_rgba(170,70,142,0.3)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="app-type-eyebrow mb-1">{test.level ?? "Test"}</p>
              <h1 className="app-type-page-title">{test.title}</h1>
              {test.courseTitle && test.courseSlug ? (
                <Link to={coursePath(test.courseSlug)} className="app-type-link mt-1 inline-flex items-center gap-1 text-sm">
                  <BookOpen className="size-4" aria-hidden />
                  {test.courseTitle}
                </Link>
              ) : null}
            </div>
            {test.best ? (
              <div className="flex flex-col items-center gap-1">
                <GradeBadge grade={test.best.grade} size="md" />
                <span className="app-type-meta">Best {Math.round(test.best.percent)}%</span>
              </div>
            ) : null}
          </div>

          {test.description ? <p className="app-type-body text-[#132050]/75">{test.description}</p> : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <Fact icon={<ClipboardList className="size-4" />} label="Cards" value={`${test.questionCount}`} />
            <Fact icon={<Clock className="size-4" />} label="Time limit" value={test.timeLimitMinutes ? `${test.timeLimitMinutes} minutes` : "No time limit"} />
            <Fact icon={<Target className="size-4" />} label="Pass mark" value={`${test.passMark}%`} />
            <Fact
              icon={<RotateCcw className="size-4" />}
              label="Attempts"
              value={test.maxAttempts == null ? `Unlimited (${test.attemptsUsed} used)` : `${test.attemptsLeft} of ${test.maxAttempts} left`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="app-type-label">Card types</p>
            <TypeChips types={test.types} />
          </div>

          <div className="flex items-start gap-2 rounded-2xl bg-[#F6F3FA] px-4 py-3 text-[13px] text-[#4B4458]">
            {test.instantFeedback ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <Eye className="mt-0.5 size-4 shrink-0 text-primary" />}
            <span>
              {test.instantFeedback
                ? "You'll see if each answer is right straight away, with a short explanation. Only your first try on each card counts towards your score."
                : "Exam mode: answers are saved as you go, and you'll see what you got right when you finish."}
              {test.timeLimitMinutes ? " When the time runs out, your answers are submitted automatically." : ""}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void start()}
            disabled={starting || outOfAttempts}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {starting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
            {outOfAttempts ? "No attempts left" : cta}
          </button>
        </div>
      </section>

      {test.attempts.length ? (
        <section className="rounded-xl border border-[#EDEAF3] bg-white">
          <h2 className="app-type-section-title border-b border-[#EDEAF3] px-4 py-3">Your attempts</h2>
          <ul className="divide-y divide-[#EDEAF3]">
            {test.attempts.map((a, i) => (
              <li key={a.id}>
                <Link to={testResultPath(a.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FBF5FC]">
                  <GradeBadge grade={a.grade} size="sm" />
                  <span className="app-type-body flex-1">
                    Attempt {test.attempts.length - i}
                    <span className="app-type-meta ml-2">{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : ""}</span>
                  </span>
                  <MetaChip>{formatDuration(a.durationSeconds)}</MetaChip>
                  <span className="w-14 text-right font-solway font-bold text-[#132050]">{Math.round(a.percent ?? 0)}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#EDEAF3] px-3 py-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-[#F6E9FB] text-primary">{icon}</span>
      <div>
        <p className="app-type-meta">{label}</p>
        <p className="app-type-card-title">{value}</p>
      </div>
    </div>
  );
}
