import { CheckCircle2, PenLine, XCircle } from "lucide-react";
import MathText from "./MathText";
import { cn } from "@/lib/utils";

interface MathAnswerWorkspaceProps {
  question: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  disabled?: boolean;
  isSubmitted?: boolean;
  isCorrect?: boolean | null;
  expectedAnswer?: string;
  /** Show the expected answer on a miss (default true for v1 one-shot checks). */
  showExpected?: boolean;
  triesLeft?: number;
  speakingWait?: boolean;
  compact?: boolean;
}

export default function MathAnswerWorkspace({
  question,
  value,
  onChange,
  onSubmit,
  canSubmit,
  disabled = false,
  isSubmitted = false,
  isCorrect = null,
  expectedAnswer,
  showExpected = true,
  triesLeft,
  speakingWait = false,
  compact = false,
}: MathAnswerWorkspaceProps) {
  return (
    <div className={cn("min-w-0", compact ? "space-y-3" : "space-y-4 sm:space-y-5")}>
      <div className="min-w-0">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-primary/80">
          Your turn
        </p>
        <h3 className="text-lg font-bold leading-snug text-gray-900 sm:text-xl">
          <MathText>{question}</MathText>
        </h3>
      </div>

      <div className="rounded-2xl border-2 border-primary/15 bg-white p-4 shadow-sm sm:p-5">
        <label
          htmlFor="math-answer"
          className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <PenLine className="size-4 shrink-0" aria-hidden />
          Write your answer
        </label>
        <input
          id="math-answer"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) onSubmit();
          }}
          disabled={disabled || isSubmitted}
          placeholder="e.g. 34, 3:5, 30 km, or $165"
          className={cn(
            "w-full min-w-0 rounded-xl border-2 px-3 py-3 text-base font-medium text-gray-900 outline-none transition-colors sm:px-4 sm:py-3.5 sm:text-lg",
            "border-primary/20 focus:border-primary focus:ring-4 focus:ring-primary/10",
            (disabled || isSubmitted) && "cursor-not-allowed bg-gray-50 opacity-80",
          )}
        />
        <p className="mt-2 text-xs text-gray-500">
          Enter a number, ratio (e.g. 3:5), expression, or answer with units if needed.
        </p>
        {typeof triesLeft === "number" && triesLeft > 0 && !isSubmitted ? (
          <p className="mt-1 text-xs font-medium text-gray-500">
            {triesLeft} {triesLeft === 1 ? "try" : "tries"} left if this is wrong.
          </p>
        ) : null}
      </div>

      {!isSubmitted && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className={cn(
              "w-full rounded-xl py-3 text-base font-bold transition-all sm:text-lg",
              canSubmit
                ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
                : "cursor-not-allowed bg-gray-200 text-gray-500",
            )}
          >
            Check my answer
          </button>
          {speakingWait ? (
            <p className="text-center text-xs font-medium text-primary">
              Wait for your instructor, then check.
            </p>
          ) : null}
        </div>
      )}

      {isSubmitted && isCorrect !== null && (
        <div
          className={cn(
            "flex min-w-0 items-start gap-3 rounded-xl border-2 p-3 sm:p-4",
            isCorrect
              ? "border-emerald-200 bg-emerald-50"
              : "border-rose-200 bg-rose-50",
          )}
        >
          {isCorrect ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 sm:size-6" />
          ) : (
            <XCircle className="mt-0.5 size-5 shrink-0 text-rose-600 sm:size-6" />
          )}
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-bold sm:text-base",
                isCorrect ? "text-emerald-800" : "text-rose-800",
              )}
            >
              {isCorrect
                ? "Correct! Great work."
                : typeof triesLeft === "number" && triesLeft > 0
                  ? "Not quite — try again."
                  : "Not quite — let's look at the idea together."}
            </p>
            {!isCorrect && showExpected && expectedAnswer && (
              <p className="mt-1 break-words text-xs text-rose-700 sm:text-sm">
                Expected answer:{" "}
                <MathText className="font-semibold">{expectedAnswer}</MathText>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
