import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import MathText from "./MathText";

export type NumberLinePlacePayload = {
  type: "number_line_place";
  question: string;
  min: number;
  max: number;
  step?: number;
  answer: number;
  explanation?: string;
};

interface NumberLinePlaceQuestionProps {
  question: NumberLinePlacePayload;
  disabled?: boolean;
  isSubmitted?: boolean;
  isCorrect?: boolean | null;
  isSpeaking?: boolean;
  onSubmit: (value: number) => void;
}

export default function NumberLinePlaceQuestion({
  question,
  disabled = false,
  isSubmitted = false,
  isCorrect = null,
  isSpeaking = false,
  onSubmit,
}: NumberLinePlaceQuestionProps) {
  const step = question.step && question.step > 0 ? question.step : 1;
  const ticks = useMemo(() => {
    const values: number[] = [];
    for (let n = question.min; n <= question.max + 1e-9; n += step) {
      values.push(Number(n.toFixed(6)));
    }
    return values;
  }, [question.min, question.max, step]);

  const [selected, setSelected] = useState<number | null>(null);
  const locked = disabled || isSubmitted || isSpeaking;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold leading-snug text-gray-900 sm:text-xl">
        <MathText plain>{question.question}</MathText>
      </h3>

      <div className="rounded-2xl border-2 border-primary/15 bg-white p-4 shadow-sm sm:p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary/80">
          Tap a point on the number line
        </p>
        <div className="relative mx-auto max-w-xl px-1 pt-6 pb-2">
          <div className="absolute top-8 right-1 left-1 h-1 rounded-full bg-slate-800" />
          <div className="relative flex justify-between">
            {ticks.map((n) => {
              const active = selected === n;
              const showCorrect =
                isSubmitted && Number(question.answer) === n;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={locked}
                  onClick={() => setSelected(n)}
                  className={cn(
                    "relative z-10 flex flex-col items-center gap-1",
                    locked && "cursor-not-allowed opacity-80",
                  )}
                  aria-label={`Number ${n}`}
                  aria-pressed={active}
                >
                  <span
                    className={cn(
                      "size-4 rounded-full border-2 transition-transform",
                      active || showCorrect
                        ? "scale-125 border-primary bg-primary"
                        : "border-slate-700 bg-white",
                      showCorrect && isCorrect === false && "border-emerald-600 bg-emerald-500",
                      active && isSubmitted && isCorrect === false && "border-rose-600 bg-rose-500",
                    )}
                  />
                  <span className="text-xs font-semibold text-slate-800 sm:text-sm">
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!isSubmitted && (
        <button
          type="button"
          disabled={selected == null || locked}
          onClick={() => selected != null && onSubmit(selected)}
          className={cn(
            "w-full rounded-xl py-3 text-base font-bold transition-all sm:text-lg",
            selected != null && !locked
              ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
              : "cursor-not-allowed bg-gray-200 text-gray-500",
          )}
        >
          Check my answer
        </button>
      )}

      {isSubmitted && isCorrect !== null && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border-2 p-3 sm:p-4",
            isCorrect
              ? "border-emerald-200 bg-emerald-50"
              : "border-rose-200 bg-rose-50",
          )}
        >
          {isCorrect ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          )}
          <div>
            <p
              className={cn(
                "text-sm font-bold",
                isCorrect ? "text-emerald-800" : "text-rose-800",
              )}
            >
              {isCorrect ? "Correct! Great work." : "Not quite."}
            </p>
            {!isCorrect && (
              <p className="mt-1 text-xs text-rose-700 sm:text-sm">
                Your answer: {selected ?? "—"} · Right answer: {question.answer}
              </p>
            )}
            {question.explanation ? (
              <p className="mt-1 text-xs text-gray-600 sm:text-sm">
                {question.explanation}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
