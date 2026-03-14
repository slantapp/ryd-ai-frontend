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

  return (
    <div className="flex flex-col h-full p-4">
      {/* Courses Collection */}
      <section className="flex flex-col h-full space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-2xl font-solway">Courses Collection</h2>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setCurrentPage(1); // Reset to first page when tab changes
          }}
        >
          <TabsList className="bg-gray-100/50 p-1 rounded-xl gap-1">
            <TabsTrigger
              className={cn(
                "px-6 py-2 rounded-lg font-solway font-semibold transition-all",
                "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md",
                "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
              )}
              value="all"
            >
              All ({getAllCourses().length})
            </TabsTrigger>
            <TabsTrigger
              className={cn(
                "px-6 py-2 rounded-lg font-solway font-semibold transition-all",
                "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md",
                "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
              )}
              value="ongoing"
            >
              Ongoing ({getOngoingCourses().length})
            </TabsTrigger>
            <TabsTrigger
              className={cn(
                "px-6 py-2 rounded-lg font-solway font-semibold transition-all",
                "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md",
                "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
              )}
              value="completed"
            >
              Completed ({getCompletedCourses().length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex-1 overflow-y-auto">
          {currentCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No courses found
              </h3>
              <p className="text-gray-500">
                {activeTab === "ongoing"
                  ? "You don't have any ongoing courses yet."
                  : activeTab === "completed"
                  ? "You haven't completed any courses yet."
                  : "No courses available."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
              {currentCourses.map((course, i) => (
                <CourseCard
                  key={i}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600 font-sans-serifbookflf">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredCourses.length)} of{" "}
              {filteredCourses.length} courses
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="rounded-full bg-primary text-white border-none shadow disabled:bg-gray-200 disabled:text-gray-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={
                        currentPage === page
                          ? "bg-primary text-white"
                          : "bg-white hover:bg-gray-100"
                      }
                    >
                      {page}
                    </Button>
                  )
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="rounded-full bg-primary text-white border-none shadow disabled:bg-gray-200 disabled:text-gray-400"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default CoursesPage;
