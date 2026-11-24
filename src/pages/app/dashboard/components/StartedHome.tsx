import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import type { DashboardData, DashboardPath, DashboardResume } from "@/api/dashboard";
import type { LearningStats } from "@/api/learningStats";
import { CourseRecommendedTests } from "@/features/learning-pathways/components/PathRail";
import { useCoursesStore, type Course } from "@/stores/coursesStore";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { cn } from "@/lib/utils";
import { DailyTestChallenge } from "./DailyTestChallenge";
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

  useEffect(() => {
    setActivePathId(preferredPathId(paths, firstResume?.slug));
  }, [paths, firstResume?.slug]);

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

  const accuracy = tests?.latest?.percent ?? tests?.best?.percent ?? null;
  const weekMinutes = stats ? stats.last7Days.reduce((sum, day) => sum + day.minutes, 0) : 0;
  const streak = stats?.streak ?? 0;

  const openContinue = () => {
    if (continueSlug) {
      void useCoursesStore.getState().ensureCurriculum(continueSlug);
      navigate(coursePath(continueSlug));
      return;
    }
    navigate(PRIVATE_PATHS.LEARNING_PATH);
  };

  const selectedCourseSlug = activePath ? activePath.nextCourse?.slug ?? null : continueSlug;
  const selectedCourseTitle =
    activePath?.nextCourse?.title || continueCourse?.title || activePath?.currentUnit || activePath?.title || "This course";
  const selectedLessonTitle =
    resumeForPath && resumeForPath.slug === selectedCourseSlug ? resumeForPath.lessonTitle : null;

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

      <CourseRecommendedTests
        courseSlug={selectedCourseSlug}
        courseTitle={selectedCourseTitle}
        lessonTitle={selectedLessonTitle}
      />

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <section
          aria-labelledby="streakTitle"
          className="relative flex h-full flex-col gap-3 overflow-hidden rounded-[22px] border border-[#eadcf4] bg-[linear-gradient(145deg,#fff_4%,#fff7ff_100%)] p-4 shadow-[0_12px_30px_rgba(99,26,138,0.10)]"
        >
          <span className="pointer-events-none absolute -right-20 -top-24 size-[230px] rounded-full bg-[radial-gradient(circle,rgba(223,45,169,0.10),transparent_70%)]" aria-hidden />
          <div className="relative z-[1] flex items-start gap-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#ffdfc8,#ffd6ed)] text-xl shadow-[inset_0_0_0_1px_#f0d8fb]" aria-hidden>
              🔥
            </span>
            <div>
              <h2 id="streakTitle" className="font-solway text-lg leading-tight text-[#201b48]">
                {streak > 0 ? `${streak}-day streak` : "Start a streak"}
              </h2>
              <p className="mt-0.5 text-[13px] leading-snug text-[#6f6a8b]">
                {stats?.activeToday
                  ? "You learned today. Come back tomorrow to keep it going."
                  : "Finish a lesson today to keep your streak alive!"}
              </p>
            </div>
          </div>
          {stats ? (
            <div className="relative z-[1] flex justify-between" aria-label="Last 7 days">
              {stats.last7Days.map((day) => {
                const isToday = day.date === stats.today.day;
                return (
                  <span
                    key={day.date}
                    className={cn(
                      "flex size-[30px] items-center justify-center rounded-full border-2 text-xs font-bold",
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
          <div className="relative z-[1] grid grid-cols-2 rounded-2xl bg-[linear-gradient(100deg,#f9dafa,#f7e9fc)] px-3 py-2.5 text-center">
            <div>
              <p className="font-solway text-lg font-bold leading-none tracking-[-0.4px] text-[#64118d]">
                {weekMinutes} <span className="text-[13px] font-bold">of {WEEKLY_MINUTE_GOAL} min</span>
              </p>
              <p className="mt-1 text-[11px] text-[#5b4778]">this week</p>
            </div>
            <div className="border-l border-[#dcb9e9]">
              <p className="font-solway text-lg font-bold leading-none tracking-[-0.4px] text-[#64118d]">
                {accuracy != null ? `${Math.round(accuracy)}%` : "0%"}
              </p>
              <p className="mt-1 text-[11px] text-[#5b4778]">quiz accuracy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openContinue}
            className="relative z-[1] mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(100deg,#8c16a6,#651183)] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            <Play className="size-3.5 fill-current" aria-hidden />
            Continue Learning
          </button>
        </section>

        <DailyTestChallenge paths={paths} resume={resume} activePathId={activePath?.id ?? null} />
      </div>
    </div>
  );
}
