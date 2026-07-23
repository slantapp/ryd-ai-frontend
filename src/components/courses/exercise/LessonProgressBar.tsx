import { cn } from "@/lib/utils";

interface LessonProgressBarProps {
  /** Completion percentage, 0–100. */
  value: number;
  /** Optional position label, e.g. "Question 2 of 5". */
  label?: string;
  /** Hide the numeric percentage (keeps just the bar + label). */
  hidePercent?: boolean;
  className?: string;
}

/**
 * Slim, accessible lesson progress indicator. Purely presentational so it can
 * be dropped into any learning environment header.
 */
export function LessonProgressBar({
  value,
  label,
  hidePercent = false,
  className,
}: LessonProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className={cn("w-full", className)}>
      {(label || !hidePercent) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          {label ? (
            <span className="truncate text-[0.65rem] font-semibold uppercase tracking-wide text-primary/70 sm:text-xs">
              {label}
            </span>
          ) : (
            <span />
          )}
          {!hidePercent && (
            <span className="shrink-0 text-[0.65rem] font-semibold text-primary/70 sm:text-xs">
              {pct}%
            </span>
          )}
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Lesson progress"}
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-primary via-primary/90 to-primary/70 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default LessonProgressBar;
