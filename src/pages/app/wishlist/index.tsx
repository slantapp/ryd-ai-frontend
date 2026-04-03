import { useMemo, useState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquarePlus, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCoursesStore, coursesData } from "@/stores/coursesStore";
import { useAuthStore } from "@/stores/authStore";
import CourseCard from "@/components/shared/CourseCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CourseRequestState = {
  name: string;
  courseRequest: string;
  description: string;
};

function CourseRequestFormCard({
  courseRequest,
  setCourseRequest,
  onSubmit,
  className,
  showClose,
  onClose,
}: {
  courseRequest: CourseRequestState;
  setCourseRequest: React.Dispatch<React.SetStateAction<CourseRequestState>>;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
  showClose?: boolean;
  onClose?: () => void;
}) {
  const formIds = useId();
  const nameId = `${formIds}-name`;
  const courseId = `${formIds}-course`;
  const descId = `${formIds}-description`;

  return (
    <Card className={cn("rounded-2xl border border-gray-100 shadow-sm", className)}>
      <CardHeader className="space-y-1.5 px-4 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="font-solway text-base sm:text-lg">
              Request a course
            </CardTitle>
            <CardDescription className="font-sans-serifbookflf text-xs leading-relaxed sm:text-sm">
              Don’t see what you need? Tell us which course you’d like and
              we’ll consider adding it.
            </CardDescription>
          </div>
          {showClose && onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={onClose}
              aria-label="Close request form"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-5 sm:px-6 sm:pb-6">
        <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label
              htmlFor={nameId}
              className="text-sm font-medium sm:text-base"
            >
              Name
            </Label>
            <Input
              id={nameId}
              value={courseRequest.name}
              onChange={(e) =>
                setCourseRequest((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="Your name"
              className="h-10 rounded-lg text-base sm:h-11 sm:text-sm"
              required
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label
              htmlFor={courseId}
              className="text-sm font-medium sm:text-base"
            >
              Course request
            </Label>
            <Input
              id={courseId}
              value={courseRequest.courseRequest}
              onChange={(e) =>
                setCourseRequest((prev) => ({
                  ...prev,
                  courseRequest: e.target.value,
                }))
              }
              placeholder="e.g. Advanced React Patterns"
              className="h-10 rounded-lg text-base sm:h-11 sm:text-sm"
              required
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label
              htmlFor={descId}
              className="text-sm font-medium sm:text-base"
            >
              Description <span className="text-gray-400">(optional)</span>
            </Label>
            <Textarea
              id={descId}
              value={courseRequest.description}
              onChange={(e) =>
                setCourseRequest((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Any details about the course you’d like..."
              className="min-h-[88px] resize-y rounded-lg text-base sm:min-h-[80px] sm:text-sm"
              rows={3}
            />
          </div>
          <Button
            type="submit"
            className="h-11 w-full rounded-lg bg-primary font-medium hover:bg-primary/90 sm:h-12"
          >
            <Send className="mr-2 size-4 shrink-0" />
            Submit request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const WishlistPage = () => {
  const navigate = useNavigate();
  const { wishlist, removeFromWishlist, isInWishlist } = useCoursesStore();
  const user = useAuthStore((state) => state.user);
  const [showRequestFormNarrow, setShowRequestFormNarrow] = useState(false);

  const [courseRequest, setCourseRequest] = useState({
    name: "",
    courseRequest: "",
    description: "",
  });

  // Auto-populate name and email from profile when user is available (only if empty)
  useEffect(() => {
    if (user) {
      setCourseRequest((prev) => ({
        ...prev,
        name: prev.name || `${user.firstName} ${user.lastName}`.trim(),
        // email: prev.email || user.email || prev.email,
      }));
    }
  }, [user]);

  // Get wishlist courses
  const wishlistCourses = useMemo(() => {
    return coursesData.filter((course) => isInWishlist(course.slug));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlist.size]);

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to API or store course requests
    console.log("Course request submitted:", courseRequest);
    setCourseRequest((prev) => ({
      ...prev,
      courseRequest: "",
      description: "",
    }));
    setShowRequestFormNarrow(false);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col space-y-3 sm:space-y-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h2 className="font-solway text-xl font-bold tracking-tight text-[#0A090B] sm:text-2xl lg:text-3xl">
              My Wishlist
            </h2>
            <p className="mt-1 font-sans-serifbookflf text-xs text-gray-600 sm:text-sm">
              {wishlistCourses.length} course
              {wishlistCourses.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <Button
            type="button"
            variant={showRequestFormNarrow ? "outline" : "default"}
            className="w-full shrink-0 gap-2 font-solway sm:w-auto lg:hidden"
            onClick={() => setShowRequestFormNarrow((v) => !v)}
            aria-expanded={showRequestFormNarrow}
            aria-controls="wishlist-request-form-panel"
          >
            {showRequestFormNarrow ? (
              <>
                <X className="size-4 shrink-0" />
                Hide request form
              </>
            ) : (
              <>
                <MessageSquarePlus className="size-4 shrink-0" />
                Request a course
              </>
            )}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {wishlistCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-2 py-12 text-center sm:py-16">
              <Heart className="mb-3 size-14 text-gray-300 sm:mb-4 sm:size-16" />
              <h3 className="mb-2 text-base font-semibold text-gray-700 sm:text-lg">
                Your wishlist is empty
              </h3>
              <p className="mb-6 max-w-sm text-sm text-gray-500 sm:text-base">
                Start adding courses to your wishlist to save them for later.
              </p>
              <Button
                onClick={() => navigate("/courses")}
                className="w-full max-w-xs bg-primary hover:bg-primary/90 sm:w-auto"
              >
                Browse Courses
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
              {wishlistCourses.map((course) => (
                <CourseCard
                  key={course.slug}
                  course={course}
                  showWishlistButton={true}
                  isInWishlist={true}
                  onWishlistToggle={removeFromWishlist}
                  wishlistButtonVariant="remove"
                />
              ))}
            </div>
          )}
        </div>

        {showRequestFormNarrow && (
          <div
            id="wishlist-request-form-panel"
            className="shrink-0 border-t border-gray-200 pt-4 lg:hidden"
          >
            <CourseRequestFormCard
              courseRequest={courseRequest}
              setCourseRequest={setCourseRequest}
              onSubmit={handleSubmitRequest}
              showClose
              onClose={() => setShowRequestFormNarrow(false)}
            />
          </div>
        )}
      </section>

      <aside className="hidden w-full shrink-0 self-stretch lg:block lg:w-[360px] lg:shrink-0 lg:self-start lg:sticky lg:top-24">
        <CourseRequestFormCard
          courseRequest={courseRequest}
          setCourseRequest={setCourseRequest}
          onSubmit={handleSubmitRequest}
        />
      </aside>
    </div>
  );
};

export default WishlistPage;
