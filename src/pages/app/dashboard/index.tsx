import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Heart,
  Loader2,
  PlayCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CourseCard from "@/components/shared/CourseCard";
import {
  getCategoryIcon,
  listCategoriesWithCounts,
} from "@/data/courseCategories";
import { getAllCurricula } from "@/data/curriculumData";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useCoursesStore } from "@/stores/coursesStore";
import { PRIVATE_PATHS } from "@/utils/routePaths";

function countQuizzesInVisibleCurricula(): number {
  return getAllCurricula().reduce((total, curriculum) => {
    const modules = curriculum.curriculum.modules ?? [];
    return (
      total +
      modules.reduce(
        (moduleTotal, mod) =>
          moduleTotal +
          (mod.lessons ?? []).reduce(
            (lessonTotal, lesson) =>
              lessonTotal + (lesson.questions?.length ?? 0),
            0,
          ),
        0,
      )
    );
  }, 0);
}

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const {
    getAllCourses,
    getCompletedCourses,
    getOngoingCourses,
    getEnrolledCourses,
    toggleWishlist,
    isInWishlist,
    wishlist,
    courseProgress,
    curriculaRevision,
    courseImagesRevision,
    curriculaLoading,
    curriculaFetched,
    fetchVisibleCurriculums,
  } = useCoursesStore();

  useEffect(() => {
    void fetchVisibleCurriculums();
  }, [fetchVisibleCurriculums]);

  const firstName = user?.firstName?.trim() || "there";

  const {
    stats,
    continueLearning,
    recommendedCourses,
    wishlistCourses,
    categoryFolders,
    averageProgress,
  } = useMemo(() => {
    const allCourses = getAllCourses();
    const completedCourses = getCompletedCourses();
    const ongoingCourses = getOngoingCourses();
    const enrolledCourses = getEnrolledCourses();

    const continueLearningSorted = [...ongoingCourses].sort((a, b) => {
      const aUpdated = courseProgress[a.slug]?.lastUpdated ?? 0;
      const bUpdated = courseProgress[b.slug]?.lastUpdated ?? 0;
      if (bUpdated !== aUpdated) return bUpdated - aUpdated;
      return (b.progress ?? 0) - (a.progress ?? 0);
    });

    const recommended = allCourses
      .filter((course) => course.status === "not-started")
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 4);

    const wishlistList = allCourses.filter((course) => wishlist.has(course.slug));

    const progressSum = enrolledCourses.reduce(
      (sum, course) => sum + (course.progress ?? 0),
      0,
    );
    const avg =
      enrolledCourses.length > 0
        ? Math.round(progressSum / enrolledCourses.length)
        : 0;

    return {
      stats: [
        {
          id: "total",
          label: "Total Courses",
          value: allCourses.length,
          icon: "/images/dashboard/completed-project.png",
        },
        {
          id: "ongoing",
          label: "Ongoing",
          value: ongoingCourses.length,
          icon: "/images/dashboard/pending-projects.png",
        },
        {
          id: "completed",
          label: "Completed",
          value: completedCourses.length,
          icon: "/images/dashboard/finished-courses.png",
        },
        {
          id: "enrolled",
          label: "Enrolled",
          value: enrolledCourses.length,
          icon: "/images/dashboard/enrolled-courses.png",
        },
        {
          id: "wishlist",
          label: "Wishlist",
          value: wishlist.size,
          icon: "/images/dashboard/activities.png",
        },
        {
          id: "quizzes",
          label: "Total Quizzes",
          value: countQuizzesInVisibleCurricula(),
          icon: "/images/dashboard/learning-time.png",
        },
      ],
      continueLearning: continueLearningSorted.slice(0, 3),
      recommendedCourses: recommended,
      wishlistCourses: wishlistList.slice(0, 3),
      categoryFolders: listCategoriesWithCounts(allCourses),
      averageProgress: avg,
    };
  }, [
    getAllCourses,
    getCompletedCourses,
    getOngoingCourses,
    getEnrolledCourses,
    wishlist,
    courseProgress,
    curriculaRevision,
    courseImagesRevision,
  ]);

  const isBootstrapping = curriculaLoading && !curriculaFetched;

  return (
    <div className="mx-auto min-w-0 max-w-full space-y-6 pb-2 sm:space-y-8">
      <header className="relative overflow-hidden rounded-lg border border-[#E5E3E9] bg-white p-3.5 shadow-[0_1px_3px_rgba(19,32,80,0.04)] sm:p-4 md:p-5">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#F3ECFE]/70 to-transparent"
          aria-hidden
        />
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="app-type-eyebrow">
              Your learning hub
            </p>
            <h1 className="app-type-page-title truncate">
              Welcome back, {firstName}
            </h1>
            <p className="app-type-page-subtitle max-w-2xl">
              {averageProgress > 0
                ? `You're averaging ${averageProgress}% across enrolled courses. Keep going.`
                : "Pick up where you left off, or explore a new course today."}
            </p>
            {averageProgress > 0 ? (
              <div className="flex max-w-sm items-center gap-3 pt-1">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EDEAF3]">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(averageProgress, 100)}%` }}
                  />
                </div>
                <span className="app-type-meta flex items-center gap-1 font-semibold tabular-nums text-[#132050]">
                  <TrendingUp className="size-3.5 text-primary" />
                  {averageProgress}%
                </span>
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            className="h-9 w-full shrink-0 rounded-md font-inter shadow-[0_4px_12px_rgba(170,70,142,0.2)] sm:w-auto"
            onClick={() => navigate(PRIVATE_PATHS.COURSES)}
          >
            Browse courses
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </header>

      {isBootstrapping ? (
        <div className="flex flex-col items-center justify-center px-2 py-12 text-center sm:py-16">
          <Loader2 className="mb-3 size-10 animate-spin text-primary" />
          <p className="app-type-body">
            Loading your dashboard…
          </p>
        </div>
      ) : (
        <>
          <section aria-label="Learning stats">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 md:gap-4">
              {stats.map(({ id, label, value, icon }) => (
                <div
                  key={id}
                  className="group rounded-lg border border-[#E5E3E9] bg-white p-2.5 shadow-[0_1px_3px_rgba(19,32,80,0.04)] transition-all hover:border-primary/20 hover:shadow-[0_6px_16px_rgba(19,32,80,0.06)] sm:p-3"
                >
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#F3ECFE]/80 transition-colors group-hover:bg-[#F3ECFE] sm:size-10">
                      <img
                        src={icon}
                        alt=""
                        className="max-h-[70%] max-w-[70%] object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="app-type-stat">
                        {value}
                      </p>
                      <p className="app-type-meta mt-1.5 line-clamp-2 leading-snug">
                        {label}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {categoryFolders.length > 0 && (
            <section aria-label="Course categories" className="space-y-3.5">
              <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
                <h2 className="app-type-section-title min-w-0 truncate">
                  Browse by category
                </h2>
                <Link
                  to={PRIVATE_PATHS.COURSES}
                  className="app-type-link inline-flex shrink-0 items-center gap-1"
                >
                  View all
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-3 lg:grid-cols-6">
                {categoryFolders.map(({ category, count }) => {
                  const Icon = getCategoryIcon(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        navigate(
                          `${PRIVATE_PATHS.COURSES}?category=${encodeURIComponent(category.id)}`,
                        )
                      }
                      className={cn(
                        "flex w-[9rem] shrink-0 flex-col items-start gap-2 rounded-lg border border-[#E5E3E9] bg-white p-2.5 text-left shadow-[0_1px_3px_rgba(19,32,80,0.04)] sm:w-auto",
                        "transition-all hover:border-primary/25 hover:shadow-[0_6px_16px_rgba(19,32,80,0.06)]",
                        "active:scale-[0.98]",
                      )}
                    >
                      <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 w-full">
                        <span className="app-type-card-title block truncate text-sm">
                          {category.title}
                        </span>
                        <span className="app-type-meta">
                          {count} {count === 1 ? "course" : "courses"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section aria-label="Continue learning" className="space-y-3.5">
            <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
              <h2 className="app-type-section-title min-w-0 truncate">
                Continue learning
              </h2>
              {continueLearning.length > 0 && (
                <Link
                  to={PRIVATE_PATHS.COURSES}
                  className="app-type-link inline-flex shrink-0 items-center gap-1"
                >
                  See ongoing
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
            {continueLearning.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {continueLearning.map((course) => (
                  <CourseCard
                    key={course.slug}
                    course={course}
                    isInWishlist={isInWishlist(course.slug)}
                    onWishlistToggle={toggleWishlist}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-stretch gap-4 rounded-lg border border-dashed border-[#E0DCE8] bg-[#FBF9FE] px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-8">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <PlayCircle className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="app-type-card-title">
                      No courses in progress
                    </p>
                    <p className="app-type-body mt-1 max-w-md">
                      Start a course from the collection and it will show up
                      here so you can jump back in quickly.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full shrink-0 rounded-md border-[#E0DCE8] font-inter shadow-none hover:bg-white sm:w-auto"
                  onClick={() => navigate(PRIVATE_PATHS.COURSES)}
                >
                  Explore courses
                </Button>
              </div>
            )}
          </section>

          {recommendedCourses.length > 0 && (
            <section aria-label="Recommended courses" className="space-y-3.5">
              <div className="flex min-w-0 items-start justify-between gap-2 sm:items-center sm:gap-3">
                <div className="min-w-0">
                  <h2 className="app-type-section-title">
                    Recommended for you
                  </h2>
                  <p className="app-type-meta mt-0.5">
                    Highly rated courses you haven&apos;t started yet.
                  </p>
                </div>
                <Link
                  to={PRIVATE_PATHS.COURSES}
                  className="app-type-link inline-flex shrink-0 items-center gap-1 pt-0.5"
                >
                  <span className="sm:hidden">All</span>
                  <span className="hidden sm:inline">Browse all</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {recommendedCourses.map((course) => (
                  <CourseCard
                    key={course.slug}
                    course={course}
                    isInWishlist={isInWishlist(course.slug)}
                    onWishlistToggle={toggleWishlist}
                  />
                ))}
              </div>
            </section>
          )}

          {wishlistCourses.length > 0 && (
            <section aria-label="Wishlist" className="space-y-3.5">
              <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                    <Heart className="size-3.5 fill-current sm:size-4" />
                  </span>
                  <h2 className="app-type-section-title min-w-0 truncate">
                    From your wishlist
                  </h2>
                </div>
                <Link
                  to={PRIVATE_PATHS.WISHLISTS}
                  className="app-type-link inline-flex shrink-0 items-center gap-1"
                >
                  <span className="sm:hidden">Wishlist</span>
                  <span className="hidden sm:inline">Open wishlist</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {wishlistCourses.map((course) => (
                  <CourseCard
                    key={course.slug}
                    course={course}
                    isInWishlist={isInWishlist(course.slug)}
                    onWishlistToggle={toggleWishlist}
                  />
                ))}
              </div>
            </section>
          )}

          {stats[0]?.value === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-[#EDEAF3] bg-white px-4 py-10 text-center shadow-[0_2px_12px_rgba(19,32,80,0.03)] sm:py-12">
              <span className="mb-3 flex size-14 items-center justify-center rounded-lg bg-[#F8F8FA]">
                <BookOpen className="size-7 text-[#132050]/25" />
              </span>
              <p className="app-type-card-title">
                No courses available yet
              </p>
              <p className="app-type-body mt-1 max-w-sm">
                Once your curriculum is published, courses will appear here and
                in the library.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
