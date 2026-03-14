import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Clock,
  CheckCircle2,
  PlayCircle,
  BookOpen,
  Star,
  Heart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { type Course } from "@/stores/coursesStore";

interface CourseCardProps {
  course: Course;
  showWishlistButton?: boolean;
  isInWishlist?: boolean;
  onWishlistToggle?: (slug: string) => void;
  wishlistButtonVariant?: "toggle" | "remove"; // toggle = can add/remove, remove = always shows as removed
}

const CourseCard = ({
  course,
  showWishlistButton = true,
  isInWishlist = false,
  onWishlistToggle,
  wishlistButtonVariant = "toggle",
}: CourseCardProps) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: Course["status"]) => {
    switch (status) {
      case "ongoing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Clock className="w-3 h-3" />
            Ongoing
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <BookOpen className="w-3 h-3" />
            Not Started
          </span>
        );
    }
  };

  const getLevelColor = (level?: string) => {
    switch (level) {
      case "Beginner":
        return "bg-green-100 text-green-700";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-700";
      case "Advanced":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWishlistToggle) {
      onWishlistToggle(course.slug);
    }
  };

  return (
    <Card className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border-0 bg-white">
      {/* Image Container */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={course.img}
          alt={course.title}
          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          {getStatusBadge(course.status)}
        </div>

        {/* Wishlist Button */}
        {showWishlistButton && onWishlistToggle && (
          <Button
            onClick={handleWishlistClick}
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 h-9 w-9 p-0 bg-white/90 hover:bg-white transition-colors rounded-full shadow-md"
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-all",
                wishlistButtonVariant === "remove" || isInWishlist
                  ? "text-red-500 fill-red-500"
                  : "text-gray-600"
              )}
            />
          </Button>
        )}

        {/* Progress Bar for Ongoing Courses */}
        {course.status === "ongoing" && course.progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4 py-0">
        {/* Level Badge */}
        {course.level && (
          <div className="mb-2">
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                getLevelColor(course.level)
              )}
            >
              {course.level}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="font-bold text-base font-solway text-gray-900 mb-1.5 line-clamp-1">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-600 mb-3 line-clamp-2 font-sans-serifbookflf">
          {course.desc}
        </p>

        {/* Course Meta */}
        <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
          {course.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{course.duration}</span>
            </div>
          )}
          {course.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{course.rating}</span>
            </div>
          )}
        </div>

        {/* Progress for Ongoing */}
        {course.status === "ongoing" && course.progress !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
              <span>Progress</span>
              <span className="font-semibold">{course.progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={() => navigate(`/courses/${course.slug}`)}
          className={cn(
            "w-full font-semibold transition-all h-12 text-sm",
            course.status === "completed"
              ? "bg-green-600 hover:bg-green-700"
              : course.status === "ongoing"
              ? "bg-primary hover:bg-primary/90"
              : "bg-primary hover:bg-primary/90"
          )}
        >
          {course.status === "completed" ? (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Completed Course
            </>
          ) : course.status === "ongoing" ? (
            <>
              <PlayCircle className="w-5 h-5 mr-2" />
              Continue Learning
            </>
          ) : (
            <>
              <PlayCircle className="w-5 h-5 mr-2" />
              Start Course
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CourseCard;
