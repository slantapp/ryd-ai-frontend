import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { DashboardData, DashboardResume } from "@/api/dashboard";
import { getCurriculumSummaryBySlug } from "@/data/curriculumData";
import { useAuthStore } from "@/stores/authStore";
import { useCoursesStore, type Course } from "@/stores/coursesStore";
import { EmptyPathHome } from "./components/EmptyPathHome";
import { StartedHome } from "./components/StartedHome";
import { useDashboard } from "./useDashboard";

/** Resume rows from the course list and progress the app already has (used if /parent/dashboard fails). */
function resumeFromStore(
  ongoing: Course[],
  lastUpdated: (slug: string) => number,
  completed: (slug: string) => number,
): DashboardResume[] {
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

function learningHasStarted(data: DashboardData): boolean {
  if (data.resume.length > 0) return true;
  if (data.counts.ongoing > 0 || data.counts.completed > 0) return true;
  if (data.stats.totals.lessonsCompleted > 0) return true;
  return data.paths.some((path) => path.started || path.finished || path.completedLessons > 0);
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

  const firstName = data?.learner.firstName || user?.firstName?.trim() || "";

  const allCourses = useMemo(
    () => getAllCourses(),
    // Revisions: rebuild when the list, progress or course images change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getAllCourses, courseProgress, curriculaRevision, courseImagesRevision],
  );
  const coursesBySlug = useMemo(() => new Map(allCourses.map((course) => [course.slug, course])), [allCourses]);

  const fallbackResume = useMemo<DashboardResume[]>(() => {
    if (dashboard.status !== "error") return [];
    return resumeFromStore(
      allCourses.filter((course) => course.status === "ongoing"),
      (slug) => courseProgress[slug]?.lastUpdated ?? 0,
      (slug) => courseProgress[slug]?.completedLessons?.length ?? 0,
    );
  }, [dashboard.status, allCourses, courseProgress]);

  const startedFromStore =
    curriculaFetched &&
    allCourses.some((course) => course.status === "ongoing" || course.status === "completed");

  const started = data ? learningHasStarted(data) : dashboard.status === "error" ? startedFromStore : null;
  const waiting =
    started === null || (dashboard.status === "error" && curriculaLoading && !curriculaFetched);

  if (waiting) {
    return (
      <div className="flex flex-col items-center justify-center px-2 py-16 text-center">
        <Loader2 className="mb-3 size-10 animate-spin text-primary" />
        <p className="app-type-body">Loading your home…</p>
      </div>
    );
  }

  if (!started) {
    return <EmptyPathHome firstName={firstName} />;
  }

  return (
    <StartedHome
      stats={data?.stats ?? null}
      resume={data?.resume ?? fallbackResume}
      paths={data?.paths ?? []}
      tests={data?.tests ?? null}
      coursesBySlug={coursesBySlug}
    />
  );
};

export default Dashboard;
