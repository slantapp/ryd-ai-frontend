import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Search, ChevronLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCoursesStore } from "@/stores/coursesStore";
import CourseCard from "@/components/shared/CourseCard";
import CourseCategoryFolder from "@/components/courses/CourseCategoryFolder";
import {
  listCategoriesWithCounts,
  getCategoryMeta,
  getCategoryIcon,
  isAgeClassFilterableCategory,
  isLevelFilterableCategory,
  normalizeCategoryId,
  COURSE_LEVEL_FILTER_OPTIONS,
  type CourseCategoryId,
  type CourseLevelFilter,
} from "@/data/courseCategories";
import {
  buildSchoolClassFilterOptions,
  getSchoolClassFilterKey,
} from "@/utils/schoolClass";

const CoursesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  /** Learner age (years): show courses where learner meets the course minimum age. */
  const [ageFilter, setAgeFilter] = useState<
    "all" | "6" | "8" | "10" | "12" | "14" | "16"
  >("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<"all" | CourseLevelFilter>(
    "all",
  );
  const categoryFromUrl = searchParams.get("category");
  const selectedCategoryId: CourseCategoryId | null = categoryFromUrl
    ? normalizeCategoryId(categoryFromUrl)
    : null;

  const openCategory = useCallback(
    (id: CourseCategoryId | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) {
            next.set("category", id);
          } else {
            next.delete("category");
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const {
    toggleWishlist,
    isInWishlist,
    getAllCourses,
    getOngoingCourses,
    getCompletedCourses,
    courseImagesRevision,
    curriculaRevision,
    curriculaLoading,
    curriculaFetched,
    fetchVisibleCurriculums,
  } = useCoursesStore();

  useEffect(() => {
    void fetchVisibleCurriculums();
  }, [fetchVisibleCurriculums]);

  const showAgeClassFilters =
    selectedCategoryId !== null &&
    isAgeClassFilterableCategory(selectedCategoryId);
  const showLevelFilter =
    selectedCategoryId !== null &&
    isLevelFilterableCategory(selectedCategoryId);

  const classFilterOptions = useMemo(
    () =>
      buildSchoolClassFilterOptions(
        getAllCourses().filter((c) => isAgeClassFilterableCategory(c.categoryId)),
      ),
    [getAllCourses],
  );

  const filteredCourses = useMemo(() => {
    let courses;
    if (activeTab === "all") {
      courses = getAllCourses();
    } else if (activeTab === "ongoing") {
      courses = getOngoingCourses();
    } else if (activeTab === "completed") {
      courses = getCompletedCourses();
    } else {
      courses = getAllCourses();
    }
    const withCompletedProgress = courses.map((course) =>
      course.status === "completed"
        ? { ...course, progress: 100 }
        : course
    );

    let result = withCompletedProgress;

    if (showAgeClassFilters && ageFilter !== "all") {
      const learnerAge = Number(ageFilter);
      result = result.filter((c) => {
        if (c.minAge == null) return true;
        return learnerAge >= c.minAge;
      });
    }

    if (showAgeClassFilters && classFilter !== "all") {
      result = result.filter(
        (c) => getSchoolClassFilterKey(c.class, c.grade) === classFilter,
      );
    }

    if (showLevelFilter && levelFilter !== "all") {
      result = result.filter((c) => (c.level ?? "Beginner") === levelFilter);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((c) => {
        const haystack = [
          c.title,
          c.desc,
          c.level,
          c.class,
          c.duration,
          getCategoryMeta(c.categoryId)?.title,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return result;
  }, [
    activeTab,
    searchQuery,
    ageFilter,
    classFilter,
    levelFilter,
    showAgeClassFilters,
    showLevelFilter,
    getAllCourses,
    getOngoingCourses,
    getCompletedCourses,
    courseImagesRevision,
    curriculaRevision,
  ]);

  const coursesInCategory = useMemo(() => {
    if (!selectedCategoryId) return [];
    return filteredCourses.filter((c) => c.categoryId === selectedCategoryId);
  }, [filteredCourses, selectedCategoryId]);

  const categoryFolders = useMemo(
    () => listCategoriesWithCounts(filteredCourses),
    [filteredCourses]
  );

  const isSearching = searchQuery.trim().length > 0;
  const prevActiveTabRef = useRef(activeTab);

  useEffect(() => {
    if (prevActiveTabRef.current === activeTab) return;
    prevActiveTabRef.current = activeTab;
    openCategory(null);
  }, [activeTab, openCategory]);

  useEffect(() => {
    if (showAgeClassFilters) return;
    setAgeFilter("all");
    setClassFilter("all");
  }, [showAgeClassFilters]);

  useEffect(() => {
    if (showLevelFilter) return;
    setLevelFilter("all");
  }, [showLevelFilter]);

  useEffect(() => {
    if (
      classFilter !== "all" &&
      !classFilterOptions.some((o) => o.key === classFilter)
    ) {
      setClassFilter("all");
    }
  }, [classFilter, classFilterOptions]);

  const hasActiveFilters =
    (showAgeClassFilters && (ageFilter !== "all" || classFilter !== "all")) ||
    (showLevelFilter && levelFilter !== "all");

  useEffect(() => {
    if (!selectedCategoryId) return;
    // Wait until curricula are loaded so we don't clear a deep-linked category early.
    if (!curriculaFetched || curriculaLoading) return;
    // Keep the category open when filters simply match nothing — show empty state.
    if (hasActiveFilters || isSearching) return;
    if (!categoryFolders.some((f) => f.category.id === selectedCategoryId)) {
      openCategory(null);
    }
  }, [
    categoryFolders,
    curriculaFetched,
    curriculaLoading,
    hasActiveFilters,
    isSearching,
    openCategory,
    selectedCategoryId,
  ]);

  const tabTriggerClass = cn(
    "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4 sm:py-2 sm:text-sm md:px-6",
    "font-solway whitespace-nowrap",
    "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md",
    "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
  );

  const activeCategoryMeta = selectedCategoryId
    ? getCategoryMeta(selectedCategoryId)
    : null;

  const resetFilters = () => {
    setAgeFilter("all");
    setClassFilter("all");
    setLevelFilter("all");
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col">
      <section className="flex min-h-0 flex-1 flex-col space-y-3 sm:space-y-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-solway text-xl font-bold tracking-tight text-[#0A090B] sm:text-2xl lg:text-3xl">
              Courses Collection
            </h2>
            <p className="mt-1 font-inter text-sm text-gray-600 sm:text-base">
              {selectedCategoryId
                ? `Courses in ${activeCategoryMeta?.title ?? "this category"}.`
                : isSearching
                  ? "Showing courses that match your search."
                  : "Browse by category, then open a course to start learning."}
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-lg border-primary/20 bg-white pl-9 font-inter text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="Search courses"
            />
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] scrollbar-hide">
              <TabsList className="inline-flex h-auto min-w-min gap-1 rounded-xl bg-gray-100/50 p-1 sm:w-fit">
                <TabsTrigger className={tabTriggerClass} value="all">
                  All ({getAllCourses().length})
                </TabsTrigger>
                <TabsTrigger className={tabTriggerClass} value="ongoing">
                  Ongoing ({getOngoingCourses().length})
                </TabsTrigger>
                <TabsTrigger className={tabTriggerClass} value="completed">
                  Completed ({getCompletedCourses().length})
                </TabsTrigger>
              </TabsList>
            </div>

            {showAgeClassFilters && (
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <label className="font-inter text-xs font-medium text-gray-600">
                    Learner age
                  </label>
                  <div className="min-w-[min(100%,11rem)] sm:min-w-[10rem]">
                    <Select
                      value={ageFilter}
                      onValueChange={(v) =>
                        setAgeFilter(
                          v as "all" | "6" | "8" | "10" | "12" | "14" | "16",
                        )
                      }
                    >
                      <SelectTrigger className="h-10 shadow-none">
                        <SelectValue placeholder="All ages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All ages</SelectItem>
                        <SelectItem value="6">6 years</SelectItem>
                        <SelectItem value="8">8 years</SelectItem>
                        <SelectItem value="10">10 years</SelectItem>
                        <SelectItem value="12">12 years</SelectItem>
                        <SelectItem value="14">14 years</SelectItem>
                        <SelectItem value="16">16+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <label className="font-inter text-xs font-medium text-gray-600">
                    Class
                  </label>
                  <div className="min-w-[min(100%,11rem)] sm:min-w-[12rem]">
                    <Select value={classFilter} onValueChange={setClassFilter}>
                      <SelectTrigger className="h-10 shadow-none">
                        <SelectValue placeholder="All classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All classes</SelectItem>
                        {classFilterOptions.map(({ key, label }) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0 font-inter shadow-none"
                    onClick={resetFilters}
                  >
                    Reset filters
                  </Button>
                )}
              </div>
            )}

            {showLevelFilter && (
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <label className="font-inter text-xs font-medium text-gray-600">
                    Level
                  </label>
                  <div className="min-w-[min(100%,11rem)] sm:min-w-[12rem]">
                    <Select
                      value={levelFilter}
                      onValueChange={(v) =>
                        setLevelFilter(v as "all" | CourseLevelFilter)
                      }
                    >
                      <SelectTrigger className="h-10 shadow-none">
                        <SelectValue placeholder="All levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All levels</SelectItem>
                        {COURSE_LEVEL_FILTER_OPTIONS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0 font-inter shadow-none"
                    onClick={resetFilters}
                  >
                    Reset filters
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {curriculaLoading && !curriculaFetched ? (
              <div className="flex flex-col items-center justify-center px-2 py-16 text-center">
                <Loader2 className="mb-3 size-10 animate-spin text-primary" />
                <p className="font-inter text-sm text-gray-600">
                  Loading courses…
                </p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-2 py-12 text-center sm:py-16">
                <BookOpen className="mb-3 size-14 text-gray-300 sm:mb-4 sm:size-16" />
                <h3 className="mb-2 text-base font-semibold text-gray-700 sm:text-lg">
                  No courses found
                </h3>
                <p className="max-w-sm text-sm text-gray-500 sm:text-base">
                  {isSearching
                    ? "Nothing matches your search. Try a different title or keyword."
                    : activeTab === "ongoing"
                      ? "You don't have any ongoing courses yet."
                      : activeTab === "completed"
                        ? "You haven't completed any courses yet."
                        : "No courses available."}
                </p>
                {isSearching ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 font-inter"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search
                  </Button>
                ) : null}
              </div>
            ) : !selectedCategoryId && isSearching ? (
              <div className="space-y-4 pb-4 sm:space-y-5">
                <p className="font-inter text-sm font-medium text-gray-800">
                  {filteredCourses.length}{" "}
                  {filteredCourses.length === 1 ? "result" : "results"}
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                  {filteredCourses.map((course) => (
                    <CourseCard
                      key={course.slug}
                      course={course}
                      showWishlistButton={true}
                      isInWishlist={isInWishlist(course.slug)}
                      onWishlistToggle={toggleWishlist}
                      wishlistButtonVariant="toggle"
                    />
                  ))}
                </div>
              </div>
            ) : !selectedCategoryId ? (
              <div className="space-y-4 pb-4 sm:space-y-5">
                <p className="font-inter text-sm font-medium text-gray-800">
                  Categories
                </p>
                <div className="grid auto-rows-fr grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 lg:gap-4">
                  {categoryFolders.map(({ category, count }) => (
                    <CourseCategoryFolder
                      key={category.id}
                      category={category}
                      count={count}
                      icon={getCategoryIcon(category.id)}
                      onOpen={() => openCategory(category.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-4 sm:space-y-5">
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-fit gap-1 px-2 font-inter text-gray-700"
                    onClick={() => openCategory(null)}
                  >
                    <ChevronLeft className="size-4 shrink-0" aria-hidden />
                    All categories
                  </Button>
                  {activeCategoryMeta && (
                    <div>
                      <h3 className="font-solway text-lg font-bold text-[#0A090B] sm:text-xl">
                        {activeCategoryMeta.title}
                      </h3>
                      <p className="mt-0.5 font-inter text-sm text-gray-600">
                        {activeCategoryMeta.subtitle}
                      </p>
                    </div>
                  )}
                </div>

                {coursesInCategory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-12 text-center">
                    <BookOpen className="mb-3 size-12 text-gray-300" />
                    <h4 className="font-solway text-base font-semibold text-gray-800">
                      No courses found
                    </h4>
                    <p className="mt-1 max-w-sm font-inter text-sm text-gray-600">
                      {isSearching
                        ? "Nothing in this category matches your search."
                        : hasActiveFilters
                          ? "Nothing matches your current filters. Try another level, age, or class — or clear the filters."
                          : "No courses in this category yet."}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      {isSearching ? (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="font-inter"
                          onClick={() => setSearchQuery("")}
                        >
                          Clear search
                        </Button>
                      ) : null}
                      {hasActiveFilters ? (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="font-inter"
                          onClick={resetFilters}
                        >
                          Reset filters
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant={
                          hasActiveFilters || isSearching ? "outline" : "link"
                        }
                        size="sm"
                        className="font-inter"
                        onClick={() => openCategory(null)}
                      >
                        Pick another category
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                    {coursesInCategory.map((course) => (
                      <CourseCard
                        key={course.slug}
                        course={course}
                        showWishlistButton={true}
                        isInWishlist={isInWishlist(course.slug)}
                        onWishlistToggle={toggleWishlist}
                        wishlistButtonVariant="toggle"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Tabs>
      </section>
    </div>
  );
};

export default CoursesPage;
