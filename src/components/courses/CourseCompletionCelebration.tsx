import { Link } from "react-router-dom";
import {
  ArrowRight,
  PartyPopper,
  Sparkles,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CourseProgressResetLink } from "@/components/courses/CourseProgressResetLink";

interface CourseCompletionCelebrationProps {
  courseTitle: string;
  instructorMessage?: string;
  currentSubtitle?: string;
  isSpeaking?: boolean;
  avatarSlot?: React.ReactNode;
  onRestart?: () => void;
  className?: string;
}

/**
 * Full celebration view when a learner finishes every lesson in a course.
 */
export function CourseCompletionCelebration({
  courseTitle,
  instructorMessage,
  currentSubtitle,
  isSpeaking = false,
  avatarSlot,
  onRestart,
  className,
}: CourseCompletionCelebrationProps) {
  const speech =
    currentSubtitle?.trim() ||
    instructorMessage?.trim() ||
    "You finished the whole course — amazing work!";

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl",
        className,
      )}
    >
      {/* Soft celebratory backdrop */}
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-[#F3ECFE] via-[#FFF5F8] to-[#F0F9FF]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-8 top-8 h-32 w-32 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-6 bottom-12 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl"
        aria-hidden
      />

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-lg text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm backdrop-blur">
            <Sparkles className="size-3.5" aria-hidden />
            Course complete
          </div>

          <div className="relative mx-auto mb-5 flex size-20 items-center justify-center sm:size-24">
            <div className="absolute inset-0 animate-ping rounded-full bg-amber-300/25" />
            <div className="relative flex size-full items-center justify-center rounded-full bg-linear-to-br from-amber-300 via-amber-400 to-orange-400 shadow-lg shadow-amber-300/40">
              <Trophy className="size-10 text-white sm:size-12" aria-hidden />
            </div>
            <PartyPopper
              className="absolute -right-1 -top-1 size-7 text-primary sm:size-8"
              aria-hidden
            />
          </div>

          <h2 className="font-solway text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            You did it!
          </h2>
          <p className="mt-2 font-inter text-base font-medium text-primary sm:text-lg">
            {courseTitle}
          </p>
          <p className="mt-3 font-inter text-sm leading-relaxed text-gray-600 sm:text-base">
            Every lesson finished. That takes focus, curiosity, and grit — and
            you showed up for all of it.
          </p>

          {avatarSlot ? (
            <div className="mx-auto mt-6 w-full max-w-[220px] sm:max-w-[260px]">
              <div className="aspect-square overflow-hidden rounded-2xl border border-primary/15 bg-linear-to-b from-primary/10 to-white shadow-inner">
                {avatarSlot}
              </div>
              <div
                className={cn(
                  "mt-3 rounded-xl border px-3 py-2.5 text-left shadow-sm",
                  isSpeaking
                    ? "border-primary/25 bg-white/90"
                    : "border-primary/15 bg-white/70",
                )}
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary/70">
                  {isSpeaking ? "Your instructor" : "Message from your instructor"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  {speech}
                </p>
              </div>
            </div>
          ) : instructorMessage ? (
            <blockquote className="mx-auto mt-6 max-w-md rounded-2xl border border-primary/15 bg-white/80 px-4 py-3 text-sm italic leading-relaxed text-gray-700 shadow-sm backdrop-blur">
              “{instructorMessage}”
            </blockquote>
          ) : null}

          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to="/courses"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-primary via-primary to-primary/90 px-8 py-3.5 font-solway text-sm font-bold text-white shadow-lg shadow-primary/30 transition hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
            >
              Explore more courses
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            {onRestart ? (
              <CourseProgressResetLink
                variant="completed"
                onReset={onRestart}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseCompletionCelebration;
