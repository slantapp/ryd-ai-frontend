import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Flame, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TestQuestionType } from "../types";
import { TYPE_META, type CardFeedback } from "./cardStyles";

interface CardShellProps {
  type: TestQuestionType;
  index: number;
  total: number;
  /** null hides the streak pill (exam mode). */
  streak: number | null;
  /** Answered state of each card, for the progress dots. */
  dots: ("done" | "todo")[];
  children: ReactNode;
  feedback?: CardFeedback | null;
  onNext?: (() => void) | null;
  nextLabel?: string;
  nextDisabled?: boolean;
  footer?: ReactNode;
}

export function CardShell({
  type,
  index,
  total,
  streak,
  dots,
  children,
  feedback,
  onNext,
  nextLabel = "Next",
  nextDisabled,
  footer,
}: CardShellProps) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5 rounded-[28px] bg-white p-5 shadow-[0_24px_60px_-24px_rgba(170,70,142,0.3)] sm:p-9">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#F6E9FB] px-3.5 py-2 text-[13px] font-bold text-primary">
          <Icon className="size-4" aria-hidden />
          {meta.label}
        </span>
        {streak != null ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-extrabold text-white"
            aria-label={`${streak} correct in a row`}
          >
            <Flame className="size-4" aria-hidden />
            {streak} streak
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-center gap-2" aria-label={`Card ${index + 1} of ${total}`}>
        {dots.map((d, i) => (
          <span
            key={i}
            className={cn(
              "h-2 rounded-full transition-all",
              i === index ? "w-[22px] bg-primary" : d === "done" ? "w-2 bg-primary/40" : "w-2 bg-[#E9E0EF]",
            )}
          />
        ))}
      </div>

      {children}

      {feedback ? (
        <div
          role="status"
          className={cn(
            "flex flex-col gap-3 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:px-5",
            feedback.tone === "correct" && "bg-[#ECFDF3] text-[#15803D]",
            feedback.tone === "incorrect" && "bg-[#FEF2F2] text-[#B91C1C]",
            feedback.tone === "neutral" && "bg-[#F6F3FA] text-[#4B4458]",
          )}
        >
          <div className="flex flex-1 items-start gap-3">
            {feedback.tone === "correct" ? (
              <CheckCircle2 className="mt-0.5 size-[22px] shrink-0 text-[#16A34A]" aria-hidden />
            ) : feedback.tone === "incorrect" ? (
              <XCircle className="mt-0.5 size-[22px] shrink-0 text-[#DC2626]" aria-hidden />
            ) : null}
            <div className="flex flex-col gap-1">
              <strong className="text-sm">{feedback.title}</strong>
              {feedback.body ? <span className="text-[13px] font-medium opacity-85">{feedback.body}</span> : null}
            </div>
          </div>
          {onNext ? <NextButton onClick={onNext} label={nextLabel} disabled={nextDisabled} /> : null}
        </div>
      ) : onNext ? (
        <div className="flex justify-end">
          <NextButton onClick={onNext} label={nextLabel} disabled={nextDisabled} />
        </div>
      ) : null}

      <p className="m-0 text-center text-xs text-[#9C96A6]">
        {footer ?? `Card ${index + 1} of ${total}`}
      </p>
    </div>
  );
}

function NextButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex shrink-0 items-center justify-center gap-1.5 self-end rounded-full bg-primary px-4 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
    >
      {label}
      <ArrowRight className="size-4" aria-hidden />
    </button>
  );
}
