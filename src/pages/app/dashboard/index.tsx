import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Braces,
  Briefcase,
  Calculator,
  BookText,
  Database,
  Heart,
  Loader2,
  Palette,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CourseCard from "@/components/shared/CourseCard";
import {
  listCategoriesWithCounts,
  type CourseCategoryId,
} from "@/data/courseCategories";
import { getAllCurricula } from "@/data/curriculumData";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useCoursesStore } from "@/stores/coursesStore";
import { PRIVATE_PATHS } from "@/utils/routePaths";

const CATEGORY_ICONS: Record<CourseCategoryId, LucideIcon> = {
  coding: Braces,
  mathematics: Calculator,
  english: BookText,
  design: Palette,
  data: Database,
  careers: Briefcase,
};

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
    <div className="mx-auto min-w-0 max-w-full space-y-5 pb-2 sm:space-y-7 md:space-y-8">
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-solway text-xl font-bold tracking-tight text-[#0A090B] sm:text-2xl md:text-[1.75rem] lg:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 max-w-2xl font-inter text-sm leading-relaxed text-gray-600 sm:text-base">
            {averageProgress > 0
              ? `You're averaging ${averageProgress}% across enrolled courses. Keep going.`
              : "Pick up where you left off, or explore a new course today."}
          </p>
        </div>
        <Button
          type="button"
          className="h-10 w-full shrink-0 font-inter sm:h-11 sm:w-auto"
          onClick={() => navigate(PRIVATE_PATHS.COURSES)}
        >
          Browse courses
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </header>

      {isBootstrapping ? (
        <div className="flex flex-col items-center justify-center px-2 py-12 text-center sm:py-16">
          <Loader2 className="mb-3 size-10 animate-spin text-primary" />
          <p className="font-inter text-sm text-gray-600">
            Loading your dashboard…
          </p>
        </div>
      ) : (
        <>
          <section aria-label="Learning stats">
            {/* 2 on mobile, 3 from tablet up */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 md:gap-4">
              {stats.map(({ id, label, value, icon }) => (
                <div
                  key={id}
                  className="rounded-xl border bg-white/80 shadow-md transition-shadow hover:shadow-lg"
                >
                  <div className="flex items-center gap-2.5 p-3 sm:flex-row sm:gap-3 sm:p-4">
                    <div className="flex size-9 shrink-0 items-center justify-center sm:size-10 md:size-12">
                      <img
                        src={icon}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold leading-none tabular-nums sm:text-xl md:text-2xl">
                        {value}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-snug text-[#666666] sm:text-sm">
                        {label}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {categoryFolders.length > 0 && (
            <section aria-label="Course categories" className="space-y-3">
              <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
                <h2 className="min-w-0 truncate font-solway text-base font-bold text-[#0A090B] sm:text-lg md:text-xl">
                  Browse by category
                </h2>
                <Link
                  to={PRIVATE_PATHS.COURSES}
                  className="inline-flex shrink-0 items-center gap-1 font-inter text-xs font-medium text-primary hover:underline sm:text-sm"
                >
                  View all
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {/* Horizontal scroll on small phones; grid from sm up */}
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-3 lg:grid-cols-6">
                {categoryFolders.map(({ category, count }) => {
                  const Icon = CATEGORY_ICONS[category.id];
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => navigate(PRIVATE_PATHS.COURSES)}
                      className={cn(
                        "flex w-[9.5rem] shrink-0 flex-col items-start gap-2 rounded-xl border border-gray-100 bg-white p-3 text-left sm:w-auto",
                        "shadow-sm transition-all hover:border-primary/30 hover:shadow-md",
                        "active:scale-[0.98]",
                      )}
                    >
                      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 w-full">
                        <span className="block truncate font-solway text-sm font-semibold text-gray-900">
                          {category.title}
                        </span>
                        <span className="font-inter text-xs text-gray-500">
                          {count} {count === 1 ? "course" : "courses"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section aria-label="Continue learning" className="space-y-3">
            <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
              <h2 className="min-w-0 truncate font-solway text-base font-bold text-[#0A090B] sm:text-lg md:text-xl">
                Continue learning
              </h2>
              {continueLearning.length > 0 && (
                <Link
                  to={PRIVATE_PATHS.COURSES}
                  className="inline-flex shrink-0 items-center gap-1 font-inter text-xs font-medium text-primary hover:underline sm:text-sm"
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
              <div className="flex flex-col items-stretch gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-8">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <PlayCircle className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-solway text-base font-semibold text-gray-900">
                      No courses in progress
                    </p>
                    <p className="mt-1 max-w-md font-inter text-sm text-gray-600">
                      Start a course from the collection and it will show up
                      here so you can jump back in quickly.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full shrink-0 font-inter shadow-none sm:w-auto"
                  onClick={() => navigate(PRIVATE_PATHS.COURSES)}
                >
                  Explore courses
                </Button>
              </div>
            )}
          </section>

          {recommendedCourses.length > 0 && (
            <section aria-label="Recommended courses" className="space-y-3">
              <div className="flex min-w-0 items-start justify-between gap-2 sm:items-center sm:gap-3">
                <div className="min-w-0">
                  <h2 className="font-solway text-base font-bold text-[#0A090B] sm:text-lg md:text-xl">
                    Recommended for you
                  </h2>
                  <p className="mt-0.5 font-inter text-xs text-gray-600 sm:text-sm">
                    Highly rated courses you haven&apos;t started yet.
                  </p>
                </div>
                <Link
                  to={PRIVATE_PATHS.COURSES}
                  className="inline-flex shrink-0 items-center gap-1 pt-0.5 font-inter text-xs font-medium text-primary hover:underline sm:text-sm"
                >
                  <span className="sm:hidden">All</span>
                  <span className="hidden sm:inline">Browse all</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {/* 1 col phone → 2 tablet → 3 with sidebar → 4 wide desktop */}
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
            <section aria-label="Wishlist" className="space-y-3">
              <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Heart className="size-4 shrink-0 fill-red-500 text-red-500 sm:size-5" />
                  <h2 className="min-w-0 truncate font-solway text-base font-bold text-[#0A090B] sm:text-lg md:text-xl">
                    From your wishlist
                  </h2>
                </div>
                <Link
                  to={PRIVATE_PATHS.WISHLISTS}
                  className="inline-flex shrink-0 items-center gap-1 font-inter text-xs font-medium text-primary hover:underline sm:text-sm"
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
            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center shadow-sm sm:py-12">
              <BookOpen className="mb-3 size-12 text-gray-300 sm:size-14" />
              <p className="font-solway text-base font-semibold text-gray-900">
                No courses available yet
              </p>
              <p className="mt-1 max-w-sm font-inter text-sm text-gray-600">
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
