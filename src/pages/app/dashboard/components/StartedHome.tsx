import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Flame, Headphones, Play } from "lucide-react";
import type { DashboardData, DashboardPath, DashboardResume } from "@/api/dashboard";
import type { LearningStats } from "@/api/learningStats";
import { fetchResult } from "@/features/tests/api";
import { testAttemptPath, testIntroPath, testResultPath } from "@/features/tests/paths";
import type { AttemptResult } from "@/features/tests/types";
import { useCoursesStore, type Course } from "@/stores/coursesStore";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { cn } from "@/lib/utils";
import { PathMap } from "./PathMap";

/** Soft weekly target shown on the streak card until the API sends one. */
const WEEKLY_MINUTE_GOAL = 90;

const coursePath = (slug: string) => `${PRIVATE_PATHS.COURSES}/${slug}`;

function weekdayLetter(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "narrow",
    timeZone: "UTC",
  });
}

function preferredPathId(paths: DashboardPath[], resumeSlug?: string): number | null {
  const matched = paths.find((path) => path.nextCourse?.slug === resumeSlug);
  if (matched) return matched.id;
  const open = paths.find((path) => path.started && !path.finished);
  if (open) return open.id;
  const anyStarted = paths.find((path) => path.started || path.finished);
  return (anyStarted ?? paths[0])?.id ?? null;
}

type MissedTopic = { label: string; count: number; courseSlug: string | null };

function missedTopics(result: AttemptResult): MissedTopic[] {
  const counts = new Map<string, MissedTopic>();
  for (const item of result.review) {
    if (item.answer?.correct !== false) continue;
    const label = item.lessonRef?.lessonTitle?.trim() || item.question.prompt.trim();
    const key = label.slice(0, 80);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    counts.set(key, {
      label: key,
      count: 1,
      courseSlug: item.lessonRef?.courseSlug ?? null,
    });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 2);
}

export function StartedHome({
  stats,
  resume,
  paths,
  tests,
  coursesBySlug,
}: {
  stats: LearningStats | null;
  resume: DashboardResume[];
  paths: DashboardPath[];
  tests: DashboardData["tests"] | null;
  coursesBySlug: Map<string, Course>;
}) {
  const navigate = useNavigate();
  const firstResume = resume[0];
  const [activePathId, setActivePathId] = useState<number | null>(() =>
    preferredPathId(paths, firstResume?.slug),
  );
  const [review, setReview] = useState<MissedTopic[] | null>(null);

  useEffect(() => {
    setActivePathId(preferredPathId(paths, firstResume?.slug));
  }, [paths, firstResume?.slug]);

  const latestAttemptId = tests?.latest?.attemptId;
  useEffect(() => {
    if (!latestAttemptId) {
      setReview(null);
      return;
    }
    let cancelled = false;
    fetchResult(latestAttemptId)
      .then((result) => {
        if (!cancelled) setReview(result ? missedTopics(result) : []);
      })
      .catch(() => {
        if (!cancelled) setReview([]);
      });
    return () => {
      cancelled = true;
    };
  }, [latestAttemptId]);

  const activePath = paths.find((path) => path.id === activePathId) ?? paths[0] ?? null;
  const resumeForPath = useMemo(() => {
    if (!activePath) return firstResume ?? null;
    return (
      resume.find((item) => item.slug === activePath.nextCourse?.slug) ??
      (paths.length <= 1 ? firstResume ?? null : null)
    );
  }, [activePath, firstResume, paths.length, resume]);

  const continueSlug = resumeForPath?.slug || activePath?.nextCourse?.slug || null;
  const continueCourse = continueSlug ? coursesBySlug.get(continueSlug) : undefined;
  const lessonTitle =
    resumeForPath?.lessonTitle ||
    activePath?.nextCourse?.title ||
    resumeForPath?.title ||
    activePath?.title ||
    "Your next lesson";
  const eyebrow = activePath?.title || continueCourse?.title || "Your course";
  const lessonMeta = resumeForPath
    ? `Lesson ${resumeForPath.lessonNumber}${continueCourse?.duration ? ` · ${continueCourse.duration}` : ""} · listen, try it, then a quick check`
    : activePath
      ? `${activePath.completedLessons} of ${activePath.totalLessons} lessons · listen, try it, then a quick check`
      : "Listen, try it, then a quick check";

  const completedLessons = activePath?.completedLessons ?? resumeForPath?.lessonNumber ?? 0;
  const totalLessons = activePath?.totalLessons || resumeForPath?.lessonCount || 0;

  const suggestion = tests?.suggestions[0] ?? null;
  const accuracy = tests?.latest?.percent ?? tests?.best?.percent ?? null;
  const weekMinutes = stats ? stats.last7Days.reduce((sum, day) => sum + day.minutes, 0) : 0;
  const minutePct = Math.min(100, Math.round((weekMinutes / WEEKLY_MINUTE_GOAL) * 100));
  const streak = stats?.streak ?? 0;

  const openContinue = () => {
    if (continueSlug) {
      void useCoursesStore.getState().ensureCurriculum(continueSlug);
      navigate(coursePath(continueSlug));
      return;
    }
    navigate(PRIVATE_PATHS.LEARNING_PATH);
  };

  const openQuiz = () => {
    if (!suggestion) {
      navigate(PRIVATE_PATHS.TESTS);
      return;
    }
    navigate(
      suggestion.openAttemptId
        ? testAttemptPath(suggestion.testId, suggestion.openAttemptId)
        : testIntroPath(suggestion.testId),
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6">
      <section
        aria-labelledby="pathTitle"
        className="relative flex flex-col gap-2 overflow-hidden rounded-[28px] px-5 py-6 text-white shadow-[0_18px_40px_rgba(48,12,72,0.18)] sm:px-8 sm:py-7"
        style={{
          backgroundColor: "#1A0C2E",
          backgroundImage: [
            "radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1.15px)",
            "radial-gradient(ellipse 48% 70% at 82% 8%, rgba(255,92,196,0.55), transparent 62%)",
            "radial-gradient(ellipse 42% 55% at 8% 100%, rgba(148,52,196,0.45), transparent 70%)",
            "linear-gradient(115deg, #160A28 0%, #2A1248 34%, #5A1874 70%, #8A227C 100%)",
          ].join(", "),
          backgroundSize: "18px 18px, auto, auto, auto",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex max-w-[680px] flex-col gap-1.5">
            <div role="tablist" aria-label="Your subjects" className="mb-3 flex flex-wrap gap-2">
                {paths.map((path) => {
                  const selected = path.id === (activePath?.id ?? paths[0]?.id);
                  return (
                    <button
                      key={path.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActivePathId(path.id)}
                      className={cn(
                        "min-h-9 cursor-pointer rounded-full px-3.5 text-[13px]",
                        selected
                          ? "bg-white font-bold text-[#1C1B3A] shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
                          : "border border-white/20 bg-white/10 font-semibold text-white/85 hover:bg-white/15",
                      )}
                    >
                      {path.title} · {path.percent}%
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => navigate(PRIVATE_PATHS.LEARNING_PATH)}
                  className="min-h-9 cursor-pointer rounded-full border border-dashed border-white/35 bg-white/5 px-3.5 text-[13px] font-semibold text-white/80 hover:bg-white/10"
                >
                  + Add a subject
                </button>
            </div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#F3B4DE]">{eyebrow}</p>
            <h1 id="pathTitle" className="font-solway text-[32px] leading-[1.05] sm:text-[42px]">
              {lessonTitle}
            </h1>
            <p className="text-[15px] text-white/75">{lessonMeta}</p>
          </div>
          <button
            type="button"
            onClick={openContinue}
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#F23CAD] px-5 text-[15px] font-bold text-white shadow-[0_10px_28px_rgba(242,60,173,0.55)] transition hover:bg-[#FF4EBA]"
          >
            <Play className="size-3.5 fill-current" aria-hidden />
            Continue lesson
          </button>
        </div>
        <PathMap
          completed={activePath?.finished ? totalLessons || completedLessons : completedLessons}
          total={totalLessons}
          finished={!!activePath?.finished && !resumeForPath}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="streakTitle"
          className="flex flex-col gap-3.5 rounded-[20px] border border-[#E7E4EE] bg-white p-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#FDF1E2]" aria-hidden>
              <Flame className="size-5" fill="#F2A65A" color="#8A4206" />
            </span>
            <div>
              <h2 id="streakTitle" className="font-solway text-[22px] leading-none text-[#1C1B3A]">
                {streak > 0 ? `${streak}-day streak` : "Start a streak"}
              </h2>
              <p className="mt-1 text-[13px] text-[#5E5C72]">
                {stats?.activeToday
                  ? "You learned today. Come back tomorrow to keep it going."
                  : streak > 0
                    ? `Do today’s lesson to make it ${streak + 1}`
                    : "Finish a lesson today to light your streak"}
              </p>
            </div>
          </div>
          {stats ? (
            <div className="flex justify-between" aria-label="Last 7 days">
              {stats.last7Days.map((day) => {
                const isToday = day.date === stats.today.day;
                return (
                  <span
                    key={day.date}
                    className={cn(
                      "flex size-[34px] items-center justify-center rounded-full border-2 text-xs font-bold",
                      day.active && "border-[#9B3A86] bg-[#9B3A86] text-white",
                      !day.active && isToday && "border-dashed border-[#9B3A86] bg-white text-[#7E2C6C]",
                      !day.active && !isToday && "border-[#F1EFF5] bg-[#F1EFF5] text-[#5E5C72]",
                    )}
                  >
                    {weekdayLetter(day.date)}
                  </span>
                );
              })}
            </div>
          ) : null}
          <div className="mt-auto flex flex-col gap-1.5">
            <div className="flex justify-between text-[13px]">
              <span className="font-semibold text-[#1C1B3A]">
                {weekMinutes > WEEKLY_MINUTE_GOAL
                  ? `${weekMinutes} min this week`
                  : `${weekMinutes} of ${WEEKLY_MINUTE_GOAL} min this week`}
              </span>
              {accuracy != null ? (
                <span className="text-[#5E5C72]">{Math.round(accuracy)}% quiz accuracy</span>
              ) : null}
            </div>
            <div className="h-2 rounded-full bg-[#EFEAF3]">
              <div className="h-2 rounded-full bg-[#9B3A86]" style={{ width: `${minutePct}%` }} />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="testTitle"
          className="flex flex-col gap-3.5 rounded-[20px] border border-[#E7E4EE] bg-white p-6"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="testTitle" className="font-solway text-[22px] text-[#1C1B3A]">
              Test your knowledge
            </h2>
            {suggestion ? (
              <span className="shrink-0 text-[13px] text-[#5E5C72]">
                {suggestion.questionCount ? `${suggestion.questionCount} questions` : "Quiz"}
                {suggestion.timeLimitMinutes ? ` · ${suggestion.timeLimitMinutes} min` : ""}
              </span>
            ) : null}
          </div>
          <div className="relative mx-1.5 mt-1 h-[148px]" aria-hidden>
            <div className="absolute inset-x-4 -bottom-1.5 top-2.5 rotate-3 rounded-[14px] bg-[#E9CFE2]" />
            <div className="absolute inset-x-2 top-1 bottom-0 -rotate-2 rounded-[14px] bg-[#F7ECF4]" />
            <div className="absolute inset-0 flex flex-col justify-between rounded-[14px] bg-[#1C1B3A] p-4">
              <p className="line-clamp-2 font-mono text-sm text-[#E9E4F0]">
                {suggestion?.title || "A short quiz on what you’ve learned"}
              </p>
              <p className="text-[13px] text-[#CFCBE0]">
                {suggestion?.courseTitle || "True or false, from your lessons"}
              </p>
              <div className="flex gap-2">
                <span className="flex-1 rounded-lg border border-[#55537A] py-1.5 text-center text-[13px] font-semibold text-white">
                  True
                </span>
                <span className="flex-1 rounded-lg border border-[#55537A] py-1.5 text-center text-[13px] font-semibold text-white">
                  False
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={openQuiz}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#9B3A86] font-bold text-white transition hover:brightness-105"
          >
            {suggestion?.openAttemptId ? "Resume quiz" : "Start quiz"}
            <ArrowRight className="size-4" />
          </button>
        </section>

        {latestAttemptId && review === null ? (
          <section className="flex flex-col justify-center rounded-[20px] border border-[#E7E4EE] bg-white p-6">
            <h2 className="font-solway text-[22px] text-[#1C1B3A]">Quick review</h2>
            <p className="mt-1 text-[13px] text-[#5E5C72]">Checking your last quiz…</p>
          </section>
        ) : review && review.length > 0 ? (
          <section
            aria-labelledby="reviewTitle"
            className="flex flex-col gap-3.5 rounded-[20px] border border-[#E7E4EE] bg-white p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-[#E8F0FB]" aria-hidden>
                <Headphones className="size-5 text-[#1E4E8C]" />
              </span>
              <div>
                <h2 id="reviewTitle" className="font-solway text-[22px] leading-none text-[#1C1B3A]">
                  Quick review
                </h2>
                <p className="mt-1 text-[13px] text-[#5E5C72]">Picked from your last quiz</p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {review.map((topic) => (
                <div
                  key={topic.label}
                  className="flex items-center justify-between gap-2.5 rounded-xl bg-[#F7F6FA] px-3.5 py-3"
                >
                  <span className="min-w-0 truncate font-semibold text-[#1C1B3A]">{topic.label}</span>
                  <span className="shrink-0 rounded-full bg-[#FDF1E2] px-2 py-0.5 text-xs font-bold text-[#8A4206]">
                    {topic.count} missed
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const slug = review.find((topic) => topic.courseSlug)?.courseSlug;
                if (slug) {
                  navigate(coursePath(slug));
                  return;
                }
                if (latestAttemptId) navigate(testResultPath(latestAttemptId));
              }}
              className="mt-auto inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#1C1B3A] font-bold text-white transition hover:brightness-125"
            >
              <Headphones className="size-4" />
              Listen to a 5-min review
            </button>
          </section>
        ) : (
          <section className="flex flex-col justify-between gap-3 rounded-[20px] border border-[#E7E4EE] bg-white p-6">
            <div>
              <h2 className="font-solway text-[22px] text-[#1C1B3A]">Quick review</h2>
              <p className="mt-1 text-[13px] text-[#5E5C72]">
                {latestAttemptId
                  ? "Your last quiz didn’t leave a topic to revisit."
                  : "Finish a quiz and we’ll pull the questions you missed."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(latestAttemptId ? testResultPath(latestAttemptId) : PRIVATE_PATHS.TESTS)}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#1C1B3A] font-bold text-white"
            >
              {latestAttemptId ? "See last quiz" : "Browse quizzes"}
              <ArrowRight className="size-4" />
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
