import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type CourseProgressResetLinkProps = {
  onReset: () => void;
  /** Shown on the resume/start gate when the learner has saved progress. */
  variant?: "resume" | "completed";
  className?: string;
};

/**
 * Secondary control to wipe course progress and start from lesson 1.
 * Two-step confirm — calm hierarchy under the primary CTA, not a system alert.
 */
export function CourseProgressResetLink({
  onReset,
  variant = "resume",
  className,
}: CourseProgressResetLinkProps) {
  const [confirming, setConfirming] = useState(false);

  const idleLabel =
    variant === "completed"
      ? "Start this course over"
      : "Start from the beginning";

  if (confirming) {
    return (
      <div
        role="group"
        aria-label="Confirm reset progress"
        className={cn("mx-auto mt-5 w-full max-w-sm", className)}
      >
        <div className="rounded-2xl border border-primary/10 bg-white/90 px-4 py-3.5 text-left shadow-sm shadow-primary/5 backdrop-blur-sm transition-all duration-200">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <RotateCcw className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-solway text-sm font-semibold text-gray-900">
                Start over?
              </p>
              <p className="mt-0.5 font-inter text-xs leading-relaxed text-gray-500">
                Your saved progress for this course will be cleared. You can
                always begin again from lesson&nbsp;1.
              </p>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full px-3.5 py-1.5 font-inter text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Keep progress
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onReset();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-1.5 font-inter text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 active:scale-[0.98]"
            >
              <RotateCcw className="size-3" aria-hidden />
              Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={cn(
        "group mt-4 inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 font-inter text-xs font-medium text-gray-500 transition-all",
        "hover:border-primary/15 hover:bg-primary/4 hover:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "active:scale-[0.98]",
        className,
      )}
    >
      <RotateCcw
        className="size-3.5 opacity-70 transition-transform duration-300 group-hover:-rotate-45 group-hover:opacity-100"
        aria-hidden
      />
      <span>{idleLabel}</span>
    </button>
  );
}

export default CourseProgressResetLink;
