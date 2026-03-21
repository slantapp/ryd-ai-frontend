import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoursesStore } from "@/stores/coursesStore";
import CourseCard from "@/components/shared/CourseCard";

const CoursesPage = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 6;
  const {
    toggleWishlist,
    isInWishlist,
    getAllCourses,
    getOngoingCourses,
    getCompletedCourses,
  } = useCoursesStore();

  // Filter courses based on active tab; ensure progress is correct for listing (completed = 100%)
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
    // Ensure completed courses always show 100% progress in the listing
    return courses.map((course) =>
      course.status === "completed"
        ? { ...course, progress: 100 }
        : course
    );
  }, [activeTab, getAllCourses, getOngoingCourses, getCompletedCourses]);

  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const startIndex = (currentPage - 1) * coursesPerPage;
  const endIndex = startIndex + coursesPerPage;
  const currentCourses = filteredCourses.slice(startIndex, endIndex);

  // Reset to page 1 when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const tabTriggerClass = cn(
    "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4 sm:py-2 sm:text-sm md:px-6",
    "font-solway whitespace-nowrap",
    "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md",
    "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900",
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col">
      <section className="flex min-h-0 flex-1 flex-col space-y-3 sm:space-y-4">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-solway text-xl font-bold tracking-tight text-[#0A090B] sm:text-2xl lg:text-3xl">
            Courses Collection
          </h2>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setCurrentPage(1);
          }}
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4"
        >
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

          <div className="min-h-0 flex-1 overflow-y-auto">
            {currentCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-2 py-12 text-center sm:py-16">
                <BookOpen className="mb-3 size-14 text-gray-300 sm:mb-4 sm:size-16" />
                <h3 className="mb-2 text-base font-semibold text-gray-700 sm:text-lg">
                  No courses found
                </h3>
                <p className="max-w-sm text-sm text-gray-500 sm:text-base">
                  {activeTab === "ongoing"
                    ? "You don't have any ongoing courses yet."
                    : activeTab === "completed"
                      ? "You haven't completed any courses yet."
                      : "No courses available."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                {currentCourses.map((course) => (
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
        </Tabs>

        {totalPages > 1 && (
          <div className="flex shrink-0 flex-col gap-3 border-t border-gray-200 pt-3 sm:flex-row sm:items-center sm:justify-between sm:pt-4">
            <p className="text-center text-xs text-gray-600 font-sans-serifbookflf sm:text-left sm:text-sm">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredCourses.length)} of{" "}
              {filteredCourses.length} courses
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="size-9 shrink-0 rounded-full border-none bg-primary text-white shadow disabled:bg-gray-200 disabled:text-gray-400 sm:size-10"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "min-w-8 px-2 text-xs sm:min-w-9 sm:px-3 sm:text-sm",
                        currentPage === page
                          ? "bg-primary text-white"
                          : "bg-white hover:bg-gray-100",
                      )}
                    >
                      {page}
                    </Button>
                  ),
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="size-9 shrink-0 rounded-full border-none bg-primary text-white shadow disabled:bg-gray-200 disabled:text-gray-400 sm:size-10"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default CoursesPage;
