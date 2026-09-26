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
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isAgeClassFilterableCategory } from "@/data/courseCategories";
import { type Course } from "@/stores/coursesStore";
import { getCourseImageFallback } from "@/utils/courseImage";

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
  const [imgSrc, setImgSrc] = useState(course.img);

  useEffect(() => {
    setImgSrc(course.img);
  }, [course.img]);

  const handleImageError = () => {
    setImgSrc(getCourseImageFallback(course.title, course.categoryId));
  };

  const getStatusBadge = (status: Course["status"]) => {
    switch (status) {
      case "ongoing":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
            <Clock className="size-3" />
            Ongoing
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
            <CheckCircle2 className="size-3" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            <BookOpen className="size-3" />
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

  const showAgeClassMeta = isAgeClassFilterableCategory(course.categoryId);

  const ageLabel =
    showAgeClassMeta &&
    typeof course.minAge === "number" &&
    Number.isFinite(course.minAge)
      ? `${course.minAge}+`
      : null;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWishlistToggle) {
      onWishlistToggle(course.slug);
    }
  };

  const showProgress =
    course.status === "ongoing" && course.progress !== undefined;

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden rounded-lg border bg-white shadow-none transition-all duration-300 hover:shadow-md">
      {/* Image Container */}
      <div className="relative h-36 shrink-0 overflow-hidden sm:h-40">
        <img
          src={imgSrc}
          alt={course.title}
          onError={handleImageError}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
          {getStatusBadge(course.status)}
        </div>

        {showWishlistButton && onWishlistToggle && (
          <Button
            onClick={handleWishlistClick}
            size="icon"
            variant="ghost"
            className="absolute right-2.5 top-2.5 size-7 rounded-full bg-white/90 p-0 shadow-md transition-colors hover:bg-white sm:right-3 sm:top-3 sm:size-8"
          >
            <Heart
              className={cn(
                "size-4 transition-all",
                wishlistButtonVariant === "remove" || isInWishlist
                  ? "fill-red-500 text-red-500"
                  : "text-gray-600",
              )}
            />
          </Button>
        )}

        {showProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col px-3 pb-3 pt-2.5 sm:px-3.5">
        {/* Top: badges + title + meta (+ reserved progress slot) */}
        <div className="flex min-h-5 flex-wrap gap-1.5">
          {course.level ? (
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                getLevelColor(course.level),
              )}
            >
              {course.level}
            </span>
          ) : null}
          {ageLabel ? (
            <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              {ageLabel}
            </span>
          ) : null}
        </div>

        <h3 className="app-type-card-title mt-1.5 line-clamp-2 min-h-10 text-sm leading-snug">
          {course.title}
        </h3>

        <div className="app-type-meta mt-1.5 flex min-h-4 items-center justify-between gap-2">
          {course.duration ? (
            <div className="flex min-w-0 items-center gap-1">
              <Clock className="size-3 shrink-0" />
              <span className="truncate">{course.duration}</span>
            </div>
          ) : (
            <span />
          )}
          {course.rating ? (
            <div className="flex shrink-0 items-center gap-1">
              <Star className="size-3 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{course.rating}</span>
            </div>
          ) : null}
        </div>

        {/* Reserve progress height so all cards match */}
        <div className="mt-1.5 min-h-8">
          {showProgress ? (
            <>
              <div className="app-type-meta mb-1.5 flex items-center justify-between">
                <span>Progress</span>
                <span className="font-semibold">{course.progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Bottom-pinned: description + action */}
        <div className="mt-auto flex flex-col gap-2.5 pt-2">
          <p className="app-type-meta line-clamp-2 min-h-8 leading-relaxed">
            {course.desc || "\u00A0"}
          </p>

          <Button
            onClick={() => navigate(`/courses/${course.slug}`)}
            className={cn(
              "h-9 w-full shrink-0 text-sm font-semibold transition-all",
              course.status === "completed"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-primary hover:bg-primary/90",
            )}
          >
            {course.status === "completed" ? (
              <>
                <CheckCircle2 className="mr-2 size-5" />
                Completed Course
              </>
            ) : course.status === "ongoing" ? (
              <>
                <PlayCircle className="mr-2 size-5" />
                Continue Learning
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 size-5" />
                Start Course
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseCard;
