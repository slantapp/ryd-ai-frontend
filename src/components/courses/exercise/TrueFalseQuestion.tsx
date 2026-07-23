import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrueFalseQuestionProps {
  selectedAnswer: boolean | null;
  onSelect: (value: boolean) => void;
  disabled?: boolean;
  /** After submit, reveal which option was right/wrong. */
  isSubmitted?: boolean;
  /** The correct value, used to color the options after submit. */
  correctAnswer?: boolean;
}

export default function TrueFalseQuestion({
  selectedAnswer,
  onSelect,
  disabled = false,
  isSubmitted = false,
  correctAnswer,
}: TrueFalseQuestionProps) {
  const options: boolean[] = [true, false];

  return (
    <div
      className="mt-4 flex w-full min-w-0 flex-col gap-3 sm:mt-6 sm:flex-row sm:gap-4"
      role="radiogroup"
      aria-label="True or false"
    >
      {options.map((value) => {
        const isSelected = selectedAnswer === value;
        const showCorrect =
          isSubmitted && correctAnswer !== undefined && value === correctAnswer;
        const showIncorrect = isSubmitted && isSelected && !showCorrect;

        return (
          <button
            key={String(value)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(value)}
            disabled={disabled}
            className={cn(
              "group relative min-w-0 flex-1 rounded-xl border-2 px-4 py-3 text-base font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:px-8 sm:py-4 sm:text-lg",
              disabled
                ? "cursor-not-allowed"
                : "hover:scale-[1.02] sm:hover:scale-105",
              showCorrect
                ? "border-green-500 bg-green-50 text-green-900 shadow-sm"
                : showIncorrect
                  ? "border-red-500 bg-red-50 text-red-900 shadow-sm"
                  : isSelected
                    ? "border-primary bg-linear-to-br from-primary via-primary/90 to-primary/80 text-white shadow-lg shadow-primary/40"
                    : cn(
                        "border-primary/20 bg-white/80 text-gray-700 shadow-sm backdrop-blur-sm",
                        !disabled &&
                          "hover:border-primary/50 hover:bg-primary/5 hover:shadow-md",
                        disabled && "opacity-60",
                      ),
            )}
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {showCorrect ? (
                <CheckCircle2
                  size={22}
                  strokeWidth={2.5}
                  className="shrink-0 text-green-600 sm:size-6"
                  aria-label="Correct answer"
                />
              ) : showIncorrect ? (
                <XCircle
                  size={22}
                  strokeWidth={2.5}
                  className="shrink-0 text-red-600 sm:size-6"
                  aria-label="Your answer (incorrect)"
                />
              ) : isSelected ? (
                value ? (
                  <CheckCircle2
                    size={22}
                    strokeWidth={2.5}
                    className="shrink-0 text-white sm:size-6"
                  />
                ) : (
                  <XCircle
                    size={22}
                    strokeWidth={2.5}
                    className="shrink-0 text-white sm:size-6"
                  />
                )
              ) : (
                <div className="size-5 shrink-0 rounded-full border-2 border-primary/30 transition-colors group-hover:border-primary/60 sm:size-6" />
              )}
              <span
                className={cn(
                  showCorrect
                    ? "text-green-900"
                    : showIncorrect
                      ? "text-red-900"
                      : isSelected
                        ? "text-white"
                        : "text-gray-800",
                )}
              >
                {value ? "True" : "False"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
