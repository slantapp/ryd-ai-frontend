import type { ReactNode } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

type LessonStartGateProps = {
  heading: string;
  courseOrLessonTitle: string;
  description: ReactNode;
  ctaLabel: string;
  onStart: () => void;
  /** Desktop instructor preview; hidden on small screens. */
  avatarSlot?: ReactNode;
  showAvatar?: boolean;
  /** e.g. CourseProgressResetLink */
  footer?: ReactNode;
  chips?: string[];
  className?: string;
};

const DEFAULT_CHIPS = ["Interactive lessons", "Fun quizzes", "Hands-on practice"];

/**
 * Shared start / continue gate for paid courses and sneak peek.
 * Compact, responsive proportions — not oversized CTAs.
 */
export function LessonStartGate({
  heading,
  courseOrLessonTitle,
  description,
  ctaLabel,
  onStart,
  avatarSlot,
  showAvatar = false,
  footer,
  chips = DEFAULT_CHIPS,
  className,
}: LessonStartGateProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden bg-linear-to-br from-[#F3ECFE] via-[#F8F4FF] to-white lg:flex-row",
        className,
      )}
    >
      {showAvatar && avatarSlot ? (
        <div className="hidden min-h-0 flex-1 items-center justify-center p-4 lg:flex lg:p-6 xl:p-8">
          <div className="aspect-square w-full max-h-[min(42vh,17.5rem)] max-w-[17.5rem] overflow-hidden rounded-xl border border-primary/15 bg-linear-to-b from-primary/10 to-white shadow-inner xl:max-h-[min(48vh,20rem)] xl:max-w-[20rem]">
            {avatarSlot}
          </div>
        </div>
      ) : null}

      {/* Keep avatar mounted off-screen on mobile for audio unlock / warm-up */}
      {!showAvatar && avatarSlot ? (
        <div
          className="pointer-events-none fixed bottom-0 right-0 z-0 size-px overflow-hidden opacity-0"
          aria-hidden
        >
          {avatarSlot}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto w-full max-w-[22rem] text-center sm:max-w-sm">
          <div className="relative mb-4 inline-flex items-center justify-center sm:mb-5">
            <div className="absolute size-14 animate-ping rounded-full bg-primary/10 sm:size-16" />
            <div className="absolute size-11 animate-pulse rounded-full bg-primary/15 sm:size-12" />
            <div className="relative flex size-12 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/85 shadow-md shadow-primary/25 sm:size-14">
              <Play className="size-5 fill-white text-white sm:size-6" aria-hidden />
            </div>
          </div>

          <h2 className="font-solway text-xl font-bold tracking-tight text-[#0A090B] sm:text-2xl">
            {heading}
          </h2>
          <p className="mt-1.5 truncate font-inter text-sm font-medium text-[#4F4D55]">
            {courseOrLessonTitle}
          </p>
          <p className="mt-2 font-inter text-sm leading-relaxed text-[#666666]">
            {description}
          </p>

          <button
            type="button"
            onClick={onStart}
            className={cn(
              "mx-auto mt-5 flex h-11 w-full max-w-[16.5rem] items-center justify-center gap-2 rounded-lg",
              "bg-primary px-4 font-solway text-sm font-semibold text-white",
              "shadow-[0_6px_16px_rgba(170,70,142,0.28)] transition-all",
              "hover:bg-primary/90 active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
              "sm:mt-6 sm:h-12 sm:max-w-[18rem] sm:text-[0.9375rem]",
            )}
          >
            <Play className="size-4 shrink-0 fill-white" aria-hidden />
            <span className="truncate">{ctaLabel}</span>
          </button>

          {footer ? <div className="mt-1">{footer}</div> : null}

          {chips.length > 0 ? (
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 font-inter text-[11px] text-[#888] sm:mt-7 sm:text-xs">
              {chips.map((chip) => (
                <li key={chip} className="inline-flex items-center gap-1.5">
                  <span className="size-1 shrink-0 rounded-full bg-primary/40" aria-hidden />
                  <span>{chip}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default LessonStartGate;
