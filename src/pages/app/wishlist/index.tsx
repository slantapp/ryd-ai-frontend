import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Send } from "lucide-react";
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

const WishlistPage = () => {
  const navigate = useNavigate();
  const { wishlist, removeFromWishlist, isInWishlist } = useCoursesStore();
  const user = useAuthStore((state) => state.user);

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
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col space-y-3 sm:space-y-4">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-solway text-xl font-bold tracking-tight text-[#0A090B] sm:text-2xl lg:text-3xl">
              My Wishlist
            </h2>
            <p className="mt-1 font-sans-serifbookflf text-xs text-gray-600 sm:text-sm">
              {wishlistCourses.length} course
              {wishlistCourses.length !== 1 ? "s" : ""} saved
            </p>
          </div>
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
      </section>

      <aside className="w-full shrink-0 self-stretch lg:w-[360px] lg:shrink-0 lg:self-start lg:sticky lg:top-24">
        <Card className="rounded-2xl border border-gray-100 shadow-sm">
          <CardHeader className="space-y-1.5 px-4 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
            <CardTitle className="font-solway text-base sm:text-lg">
              Request a course
            </CardTitle>
            <CardDescription className="font-sans-serifbookflf text-xs leading-relaxed sm:text-sm">
              Don’t see what you need? Tell us which course you’d like and we’ll
              consider adding it.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-5 sm:px-6 sm:pb-6">
            <form
              onSubmit={handleSubmitRequest}
              className="space-y-3 sm:space-y-4"
            >
              <div className="space-y-1.5 sm:space-y-2">
                <Label
                  htmlFor="request-name"
                  className="text-sm font-medium sm:text-base"
                >
                  Name
                </Label>
                <Input
                  id="request-name"
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
              {/* <div className="space-y-2">
                <Label htmlFor="request-email" className="font-medium">
                  Email
                </Label>
                <Input
                  id="request-email"
                  type="email"
                  value={courseRequest.email}
                  onChange={(e) =>
                    setCourseRequest((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="you@example.com"
                  className="rounded-lg bg-gray-50"
                  required
                />
                <p className="text-xs text-gray-500">
                  Auto-filled from your profile
                </p>
              </div> */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label
                  htmlFor="request-course"
                  className="text-sm font-medium sm:text-base"
                >
                  Course request
                </Label>
                <Input
                  id="request-course"
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
                  htmlFor="request-description"
                  className="text-sm font-medium sm:text-base"
                >
                  Description <span className="text-gray-400">(optional)</span>
                </Label>
                <Textarea
                  id="request-description"
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
      </aside>
    </div>
  );
};

export default WishlistPage;
