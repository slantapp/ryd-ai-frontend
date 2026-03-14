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
        id: 13,
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
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-solway">Dashboard</h1>
        <DatePicker />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map(({ id, label, value, icon: Icon }) => (
          <div
            key={id}
            className="shadow-md hover:shadow-lg transition rounded-xl border"
          >
            <div className="flex items-center gap-3 p-4">
              <img src={Icon} alt={label} className="w-14 h-14" />

              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-[#666666]">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Dashboard;
