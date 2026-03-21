import { useMemo } from "react";
import { DatePicker } from "@/components/shared/DatePicker";
import { useCoursesStore } from "@/stores/coursesStore";

const Dashboard = () => {
  const {
    getAllCourses,
    getCompletedCourses,
    getOngoingCourses,
    wishlist,
  } = useCoursesStore();

  // Calculate dynamic stats
  const stats = useMemo(() => {
    const allCourses = getAllCourses();
    const completedCourses = getCompletedCourses();
    const ongoingCourses = getOngoingCourses();
    // const enrolledCourses = getEnrolledCourses();

    return [
      {
        id: 1,
        label: "Total Courses",
        value: allCourses.length,
        icon: "/images/dashboard/completed-project.png",
      },
      {
        id: 7,
        label: "Completed Courses",
        value: completedCourses.length,
        icon: "/images/dashboard/finished-courses.png",
      },
      {
        id: 2,
        label: "Ongoing Courses",
        value: ongoingCourses.length,
        icon: "/images/dashboard/pending-projects.png",
      },
      {
        id: 5,
        label: "Completed Projects",
        value: 0,
        icon: "/images/dashboard/enrolled-courses.png",
      },
      {
        id: 13,
        label: "Pending Projects",
        value: wishlist.size,
        icon: "/images/dashboard/activities.png",
      },
      {
        id: 14,
        label: "Wishlist",
        value: wishlist.size,
        icon: "/images/dashboard/activities.png",
      },
      {
        id: 8,
        label: "Learning Time",
        value: 0,
        icon: "/images/dashboard/learning-time.png",
      },
      {
        id: 11,
        label: "Total quizzes",
        value: 0,
        icon: "/images/dashboard/activities.png",
      },
    ];
  }, [getAllCourses, getCompletedCourses, getOngoingCourses, wishlist]);

  return (
    <div className="mx-auto min-w-0 max-w-full space-y-4 sm:space-y-6">
      <header className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
        <h1 className="font-solway text-xl font-bold tracking-tight text-[#0A090B] sm:text-2xl md:text-3xl">
          Dashboard
        </h1>
        <DatePicker className="w-full min-w-0 shrink-0 justify-between text-sm min-[480px]:w-auto min-[480px]:max-w-[min(100%,17.5rem)] sm:text-base" />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map(({ id, label, value, icon: Icon }) => (
          <div
            key={`${id}-${label}`}
            className="rounded-xl border bg-white/80 shadow-md transition-shadow hover:shadow-lg"
          >
            <div className="flex flex-col gap-2 p-3 sm:gap-2.5 sm:p-4">
              <div className="flex size-9 shrink-0 items-center justify-center sm:size-11 md:size-12">
                <img
                  src={Icon}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold leading-none tabular-nums sm:text-lg md:text-xl">
                  {value}
                </p>
                <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-snug text-[#666666] sm:min-h-11 sm:text-sm">
                  {label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
