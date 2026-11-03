import { useState } from "react";
import { ArrowRight, Eye, Loader2 } from "lucide-react";
import type { AnswerReview } from "@/utils/answerReview";
import AnswerCompareDialog from "./AnswerCompareDialog";

/** Set by the lesson once a code question's tries are used up. */
export type AnswerReviewControls = {
  review: AnswerReview;
  /** Moves to the next question or lesson. */
  onContinue: () => void;
  /** False while the tutor is still talking about the answer. */
  canContinue: boolean;
  continueLabel?: string;
};

/**
 * Editor toolbar buttons that replace Run/Submit after the last wrong try:
 * "View correct answer" (side-by-side comparison) and "Continue".
 */
export function AnswerReviewActions({ controls, compact = false }: { controls: AnswerReviewControls; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const label = controls.continueLabel ?? "Continue";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Compare your code with the correct answer"
        className="flex shrink-0 items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 sm:gap-2 sm:px-3 sm:text-sm"
      >
        <Eye size={14} aria-hidden />
        {compact ? "Answer" : "View correct answer"}
      </button>
      <button
        type="button"
        onClick={controls.onContinue}
        disabled={!controls.canContinue}
        title={controls.canContinue ? label : "Continue unlocks when the tutor finishes speaking"}
        className={`flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold text-white sm:gap-2 sm:px-3 sm:text-sm ${
          controls.canContinue ? "bg-primary hover:bg-primary/85" : "cursor-not-allowed bg-gray-400"
        }`}
      >
        {controls.canContinue ? <ArrowRight size={14} aria-hidden /> : <Loader2 size={14} className="animate-spin" aria-hidden />}
        {label}
      </button>
      {open ? (
        <AnswerCompareDialog
          review={controls.review}
          onClose={() => setOpen(false)}
          continueLabel={label}
          onContinue={
            controls.canContinue
              ? () => {
                  setOpen(false);
                  controls.onContinue();
                }
              : null
          }
        />
      ) : null}
    </>
  );
}
