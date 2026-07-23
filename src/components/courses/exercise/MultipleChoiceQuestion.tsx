import type { Question } from "../../../data/curriculumData";
import { CheckCircle2, XCircle } from "lucide-react";
import MathText from "@/components/courses/math/MathText";
import { cn } from "@/lib/utils";

interface MultipleChoiceQuestionProps {
  question: Question;
  selectedAnswer: string | null;
  onSelect: (option: string) => void;
  disabled?: boolean;
  /** After submit, reveal which option was right/wrong. */
  isSubmitted?: boolean;
}

export default function MultipleChoiceQuestion({
  question,
  selectedAnswer,
  onSelect,
  disabled = false,
  isSubmitted = false,
}: MultipleChoiceQuestionProps) {
  if (question.type !== "multiple_choice" || !question.options) {
    return null;
  }

  const correctAnswer =
    typeof question.answer === "string" ? question.answer : undefined;

  return (
    <div
      className="mt-4 w-full min-w-0 space-y-2.5 sm:space-y-3"
      role="radiogroup"
      aria-label="Answer choices"
    >
      {question.options.map((option: string, index: number) => {
        const isSelected = selectedAnswer === option;
        const showCorrect =
          isSubmitted && correctAnswer !== undefined && option === correctAnswer;
        const showIncorrect = isSubmitted && isSelected && !showCorrect;

        return (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(option)}
            disabled={disabled}
            className={cn(
              "group relative w-full min-w-0 rounded-xl border-2 p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:p-4",
              disabled
                ? "cursor-not-allowed"
                : "hover:scale-[1.01] sm:hover:scale-[1.02]",
              showCorrect
                ? "border-green-500 bg-green-50 text-green-900 shadow-sm"
                : showIncorrect
                  ? "border-red-500 bg-red-50 text-red-900 shadow-sm"
                  : isSelected
                    ? "border-primary bg-linear-to-r from-primary via-primary/90 to-primary/80 text-white shadow-lg shadow-primary/40"
                    : cn(
                        "border-primary/20 bg-white/80 text-gray-700 shadow-sm backdrop-blur-sm",
                        !disabled &&
                          "hover:border-primary/50 hover:bg-primary/5 hover:shadow-md",
                        disabled && "opacity-60",
                      ),
            )}
          >
            <div className="flex items-start justify-between gap-2 sm:items-center sm:gap-3">
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm font-medium leading-snug wrap-break-word sm:text-base",
                  showCorrect
                    ? "text-green-900"
                    : showIncorrect
                      ? "text-red-900"
                      : isSelected
                        ? "text-white"
                        : "text-gray-800",
                )}
              >
                <MathText>{option}</MathText>
              </span>
              {showCorrect ? (
                <CheckCircle2
                  className="ml-1 shrink-0 text-green-600"
                  size={20}
                  strokeWidth={2.5}
                  aria-label="Correct answer"
                />
              ) : showIncorrect ? (
                <XCircle
                  className="ml-1 shrink-0 text-red-600"
                  size={20}
                  strokeWidth={2.5}
                  aria-label="Your answer (incorrect)"
                />
              ) : isSelected ? (
                <CheckCircle2
                  className="ml-1 shrink-0 text-white"
                  size={20}
                  strokeWidth={2.5}
                />
              ) : (
                <div className="ml-1 size-5 shrink-0 rounded-full border-2 border-primary/30 transition-colors group-hover:border-primary/60" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
