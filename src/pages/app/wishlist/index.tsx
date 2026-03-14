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
    <div className="flex flex-col h-full p-4 gap-6 lg:flex-row lg:gap-8">
      {/* Left: Wishlist content */}
      <section className="flex flex-col h-full space-y-4 flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-2xl font-solway">My Wishlist</h2>
            <p className="text-sm text-gray-600 mt-1 font-sans-serifbookflf">
              {wishlistCourses.length} course
              {wishlistCourses.length !== 1 ? "s" : ""} saved
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {wishlistCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Heart className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Your wishlist is empty
              </h3>
              <p className="text-gray-500 mb-6">
                Start adding courses to your wishlist to save them for later.
              </p>
              <Button
                onClick={() => navigate("/courses")}
                className="bg-primary hover:bg-primary/90"
              >
                Browse Courses
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
              {wishlistCourses.map((course, i) => (
                <CourseCard
                  key={i}
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

      {/* Right: Course request form */}
      <aside className="w-full lg:w-[360px] lg:shrink-0 lg:sticky lg:top-24 self-start">
        <Card className="rounded-2xl shadow-sm border border-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="font-solway text-lg">
              Request a course
            </CardTitle>
            <CardDescription className="font-sans-serifbookflf text-sm">
              Don’t see what you need? Tell us which course you’d like and we’ll
              consider adding it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmitRequest}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="request-name" className="font-medium">
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
                  className="rounded-lg"
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
              <div className="space-y-2">
                <Label htmlFor="request-course" className="font-medium">
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
                  className="rounded-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-description" className="font-medium">
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
                  className="rounded-lg min-h-[80px] resize-y"
                  rows={3}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 rounded-lg font-medium"
              >
                <Send className="w-4 h-4 mr-2" />
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
