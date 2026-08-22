import { useState } from "react";
import { cn } from "@/lib/utils";

type CourseProgressResetLinkProps = {
  onReset: () => void;
  /** Shown on the resume/start gate when the learner has saved progress. */
  variant?: "resume" | "completed";
  className?: string;
};

/**
 * Low-profile control to wipe course progress and start from lesson 1.
 * Two-step confirm so it is not triggered accidentally.
 */
export function CourseProgressResetLink({
  onReset,
  variant = "resume",
  className,
}: CourseProgressResetLinkProps) {
  const [confirming, setConfirming] = useState(false);

  const label =
    variant === "completed"
      ? "Reset progress and start over"
      : "Start from the beginning";

  if (confirming) {
    return (
      <div
        className={cn(
          "mt-4 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-center",
          className,
        )}
      >
        <p className="font-inter text-xs text-amber-950/80">
          Reset all progress for this course? This cannot be undone.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-md px-2.5 py-1 font-inter text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              onReset();
            }}
            className="rounded-md bg-amber-600 px-2.5 py-1 font-inter text-xs font-semibold text-white hover:bg-amber-700"
          >
            Yes, reset progress
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={cn(
        "mt-4 font-inter text-xs text-gray-400 underline-offset-2 transition-colors hover:text-gray-600 hover:underline",
        className,
      )}
    >
      {label}
    </button>
  );
}

export default CourseProgressResetLink;
