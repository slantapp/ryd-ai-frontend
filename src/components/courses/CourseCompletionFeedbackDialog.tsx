import { useEffect, useState } from "react";
import { PartyPopper, Star } from "lucide-react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getCourseFeedbackApiErrorMessage,
  submitCourseFeedback,
} from "@/api/courseFeedback";
import {
  markCourseFeedbackSubmitted,
  markFirstModuleFeedbackSkipped,
} from "@/utils/courseFeedbackStorage";
import type { CourseFeedbackVariant } from "@/hooks/useCourseCompletionFeedback";

type CourseCompletionFeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: CourseFeedbackVariant;
  courseSlug: string;
  courseTitle: string;
  curriculumId: number | null;
};

const RATING_LABELS = [
  "Not great",
  "Could be better",
  "Good",
  "Really good",
  "Loved it!",
] as const;

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div
      className="flex flex-col items-center gap-2"
      role="radiogroup"
      aria-label="Rate this course"
    >
      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= active;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              className={cn(
                "rounded-lg p-1 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                !disabled && "hover:scale-110 active:scale-95",
                disabled && "cursor-not-allowed opacity-60",
              )}
              onMouseEnter={() => !disabled && setHover(star)}
              onMouseLeave={() => !disabled && setHover(0)}
              onFocus={() => !disabled && setHover(star)}
              onBlur={() => !disabled && setHover(0)}
              onClick={() => !disabled && onChange(star)}
            >
              <Star
                className={cn(
                  "size-9 sm:size-10",
                  filled
                    ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                    : "fill-transparent text-gray-300",
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      <p className="min-h-[1.25rem] text-center text-sm font-medium text-gray-600">
        {active > 0 ? RATING_LABELS[active - 1] : "Tap a star to rate"}
      </p>
    </div>
  );
}

export function CourseCompletionFeedbackDialog({
  open,
  onOpenChange,
  variant,
  courseSlug,
  courseTitle,
  curriculumId,
}: CourseCompletionFeedbackDialogProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isFirstModule = variant === "first_module";

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setComment("");
    setSubmitting(false);
    setSubmitted(false);
  }, [open, courseSlug, variant]);

  const handleDismiss = () => {
    if (!submitted && isFirstModule) {
      markFirstModuleFeedbackSkipped(courseSlug);
    }
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleDismiss();
      return;
    }
    onOpenChange(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating < 1) {
      toast.error("Please select a star rating.");
      return;
    }

    if (curriculumId == null) {
      toast.error(
        "We could not identify this course. Please try again from the courses page.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitCourseFeedback({
        curriculumId,
        courseSlug,
        rating,
        comment: comment.trim(),
      });

      if (res.status === false) {
        throw new Error(
          typeof res.message === "string"
            ? res.message
            : "Could not send feedback.",
        );
      }

      markCourseFeedbackSubmitted(courseSlug);
      setSubmitted(true);
      toast.success("Thanks for your feedback!");
    } catch (err) {
      toast.error(getCourseFeedbackApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!submitting}
        className="max-w-md gap-0 overflow-hidden rounded-2xl border-0 p-0 sm:max-w-lg"
        overlayClassName="z-[85]"
      >
        <div className="bg-linear-to-br from-primary/15 via-[#F8F4FF] to-white px-6 pb-2 pt-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-white shadow-lg shadow-primary/20 ring-4 ring-primary/10">
            <PartyPopper className="size-8 text-primary" aria-hidden />
          </div>
          <DialogHeader className="space-y-2 text-center sm:text-center">
            <DialogTitle className="font-solway text-2xl font-bold text-gray-900">
              {submitted
                ? "Thank you!"
                : isFirstModule
                  ? "Module 1 complete!"
                  : "You did it!"}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              {submitted
                ? "Your feedback helps us build better lessons for every learner."
                : isFirstModule
                  ? `Nice work on the first module of ${courseTitle}. How is it going so far?`
                  : `You finished ${courseTitle}. How was your experience?`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-6">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "size-6",
                      star <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-200",
                    )}
                    aria-hidden
                  />
                ))}
              </div>
              <Button
                type="button"
                className="w-full rounded-xl"
                onClick={handleDismiss}
              >
                Continue
              </Button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <StarRating
                value={rating}
                onChange={setRating}
                disabled={submitting}
              />

              <div className="space-y-2">
                <Label
                  htmlFor="course-feedback-comment"
                  className="text-sm font-medium text-gray-700"
                >
                  Anything else you&apos;d like to share?{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </Label>
                <Textarea
                  id="course-feedback-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you enjoy? What could we improve?"
                  disabled={submitting}
                  rows={4}
                  maxLength={2000}
                  className="resize-none rounded-xl border-gray-200 bg-[#F8F8FA] text-sm shadow-none focus-visible:ring-primary/30"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={submitting || rating < 1}
                  className="h-11 w-full rounded-xl font-semibold"
                >
                  {submitting ? "Sending…" : "Share feedback"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-gray-500 hover:text-gray-700"
                  disabled={submitting}
                  onClick={handleDismiss}
                >
                  Maybe later
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
