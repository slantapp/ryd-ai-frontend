import { useEffect, useMemo } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import type { DashboardRecommendation, DashboardResume } from "@/api/dashboard";
import { getCurriculumSummaryBySlug } from "@/data/curriculumData";
import { BadgesCard, DailyGoalCard, StreakCard } from "@/features/learning-pathways/components/SideRail";
import { useAuthStore } from "@/stores/authStore";
import { useCoursesStore, type Course } from "@/stores/coursesStore";
import { DashboardHeader } from "./components/DashboardHeader";
import { PathsSection } from "./components/PathsSection";
import { RecommendedSection } from "./components/RecommendedSection";
import { ResumeSection } from "./components/ResumeSection";
import { TestsSection } from "./components/TestsSection";
import { TotalsSection, type DashboardTotals } from "./components/TotalsSection";
import { WeekSection } from "./components/WeekSection";
import { useDashboard } from "./useDashboard";

/** Resume rows from the course list and progress the app already has (used if /parent/dashboard fails). */
function resumeFromStore(ongoing: Course[], lastUpdated: (slug: string) => number, completed: (slug: string) => number): DashboardResume[] {
  return [...ongoing]
    .sort((a, b) => lastUpdated(b.slug) - lastUpdated(a.slug))
    .slice(0, 4)
    .map((course) => {
      const lessonCount = getCurriculumSummaryBySlug(course.slug)?.lessonCount ?? 0;
      return {
        slug: course.slug,
        title: course.title,
        lessonNumber: lessonCount ? Math.min(completed(course.slug) + 1, lessonCount) : completed(course.slug) + 1,
        lessonCount,
        lessonTitle: null,
        progress: Math.round(course.progress ?? 0),
        lastActiveAt: null,
      };
    });
}

const Dashboard = () => {
  const user = useAuthStore((s) => s.user);
  const {
    getAllCourses,
    courseProgress,
    curriculaRevision,
    courseImagesRevision,
    curriculaLoading,
    curriculaFetched,
    fetchVisibleCurriculums,
  } = useCoursesStore();
  const dashboard = useDashboard();
  const data = dashboard.data;

  useEffect(() => {
    void fetchVisibleCurriculums();
  }, [fetchVisibleCurriculums]);

  const firstName = data?.learner.firstName || user?.firstName?.trim() || "there";

  const allCourses = useMemo(
    () => getAllCourses(),
    // Revisions: rebuild when the list, progress or course images change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getAllCourses, courseProgress, curriculaRevision, courseImagesRevision],
  );
  const coursesBySlug = useMemo(() => new Map(allCourses.map((c) => [c.slug, c])), [allCourses]);

  const resume = useMemo<DashboardResume[]>(() => {
    if (data) return data.resume;
    if (dashboard.status !== "error") return [];
    return resumeFromStore(
      allCourses.filter((c) => c.status === "ongoing"),
      (slug) => courseProgress[slug]?.lastUpdated ?? 0,
      (slug) => courseProgress[slug]?.completedLessons?.length ?? 0,
    );
  }, [data, dashboard.status, allCourses, courseProgress]);

  const recommended = useMemo<DashboardRecommendation[]>(() => {
    if (data) return data.recommended;
    if (dashboard.status !== "error") return [];
    return allCourses
      .filter((c) => c.status === "not-started" && (c.level ?? "Beginner") === "Beginner")
      .slice(0, 3)
      .map((c) => ({ slug: c.slug, reason: "start_here" as const, detail: null }));
  }, [data, dashboard.status, allCourses]);

  const starter = useMemo(() => {
    const fromRecs = recommended.map((r) => coursesBySlug.get(r.slug)).find(Boolean);
    return fromRecs ?? allCourses.find((c) => c.status === "not-started") ?? null;
  }, [recommended, coursesBySlug, allCourses]);

  const loadingDashboard = dashboard.status === "loading";
  const stats = data?.stats ?? null;
  const totals: DashboardTotals = {
    courses: data?.counts.courses ?? allCourses.length,
    ongoing: data?.counts.ongoing ?? allCourses.filter((c) => c.status === "ongoing").length,
    completed: data?.counts.completed ?? allCourses.filter((c) => c.status === "completed").length,
    lessonsCompleted: stats?.totals.lessonsCompleted ?? null,
    lessonsThisWeek: stats ? stats.last7Days.reduce((n, d) => n + d.lessons, 0) : null,
    minutesLearned: stats?.totals.minutes ?? null,
    minutesThisWeek: stats ? stats.last7Days.reduce((n, d) => n + d.minutes, 0) : null,
    testsTaken: data?.tests.taken ?? null,
    bestGrade: data?.tests.best?.grade ?? null,
    bestPercent: data?.tests.best?.percent ?? null,
  };
  const isBootstrapping = curriculaLoading && !curriculaFetched;
  const noCourses = curriculaFetched && allCourses.length === 0;

  return (
    <div className="mx-auto min-w-0 max-w-full space-y-5 pb-2 sm:space-y-6">
      <DashboardHeader firstName={firstName} stats={stats} />
      {!isBootstrapping && !noCourses ? <TotalsSection totals={totals} loading={loadingDashboard} /> : null}

      {isBootstrapping ? (
        <div className="flex flex-col items-center justify-center px-2 py-12 text-center sm:py-16">
          <Loader2 className="mb-3 size-10 animate-spin text-primary" />
          <p className="app-type-body">Loading your dashboard…</p>
        </div>
      ) : noCourses ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[#EDEAF3] bg-white px-4 py-10 text-center shadow-[0_2px_12px_rgba(19,32,80,0.03)] sm:py-12">
          <span className="mb-3 flex size-14 items-center justify-center rounded-lg bg-[#F8F8FA]">
            <BookOpen className="size-7 text-[#132050]/25" />
          </span>
          <p className="app-type-card-title">No courses available yet</p>
          <p className="app-type-body mt-1 max-w-sm">
            Once your curriculum is published, courses will appear here and in the library.
          </p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5 sm:space-y-6">
            <ResumeSection loading={loadingDashboard} items={resume} coursesBySlug={coursesBySlug} starter={starter} />
            <WeekSection loading={loadingDashboard} stats={stats} />
            {data ? <PathsSection paths={data.paths} /> : null}
            {data ? <TestsSection tests={data.tests} /> : null}
            <RecommendedSection items={recommended} coursesBySlug={coursesBySlug} />
          </div>

          {stats ? (
            <aside className="min-w-0 space-y-5" aria-label="Streak, goal and badges">
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
                <StreakCard stats={stats} />
                <DailyGoalCard stats={stats} />
              </div>
              <BadgesCard badges={stats.badges} />
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
