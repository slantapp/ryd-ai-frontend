import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Question } from "../types";

interface PreviewQuestionProps {
  question: Question;
  selectedAnswer: string | boolean | null;
  onSelectAnswer: (answer: string | boolean) => void;
  isSubmitted: boolean;
  onSubmit: () => void;
  disabled?: boolean;
}

export function PreviewQuestion({
  question,
  selectedAnswer,
  onSelectAnswer,
  isSubmitted,
  onSubmit,
  disabled = false,
}: PreviewQuestionProps) {
  const isCorrect = selectedAnswer === question.answer;

  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0">
        <h3 className="mb-2 text-base font-semibold leading-snug text-gray-900 sm:text-lg">
          {question.question}
        </h3>
        <div className="h-0.5 w-14 rounded-full bg-linear-to-r from-primary via-primary/80 to-primary/60" />
      </div>

      {question.type === "multiple_choice" && question.options && (
        <div className="min-w-0 space-y-2">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const showCorrect = isSubmitted && option === question.answer;
            const showIncorrect = isSubmitted && isSelected && !isCorrect;

            return (
              <button
                key={index}
                type="button"
                onClick={() =>
                  !isSubmitted && !disabled && onSelectAnswer(option)
                }
                disabled={isSubmitted || disabled}
                className={cn(
                  "w-full min-w-0 rounded-lg border-2 p-2.5 text-left transition-all sm:p-3",
                  showCorrect
                    ? "border-green-500 bg-green-50"
                    : showIncorrect
                      ? "border-red-500 bg-red-50"
                      : isSelected
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5",
                  isSubmitted || disabled
                    ? "cursor-default"
                    : "cursor-pointer",
                )}
              >
                <div className="flex items-start justify-between gap-2 sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                        showCorrect
                          ? "border-green-500 bg-green-500 text-white"
                          : showIncorrect
                            ? "border-red-500 bg-red-500 text-white"
                            : isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-gray-300 text-gray-500",
                      )}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="min-w-0 flex-1 text-sm font-medium leading-snug wrap-break-word text-gray-800">
                      {option}
                    </span>
                  </div>
                  {showCorrect && (
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                  )}
                  {showIncorrect && (
                    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {question.type === "true_false" && (
        <div className="flex w-full min-w-0 flex-col gap-2.5 sm:flex-row sm:gap-3">
          {[true, false].map((value) => {
            const isSelected = selectedAnswer === value;
            const showCorrect = isSubmitted && value === question.answer;
            const showIncorrect =
              isSubmitted && isSelected && selectedAnswer !== question.answer;

            return (
              <button
                key={String(value)}
                type="button"
                onClick={() =>
                  !isSubmitted && !disabled && onSelectAnswer(value)
                }
                disabled={isSubmitted || disabled}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-center transition-all sm:py-3",
                  showCorrect
                    ? "border-green-500 bg-green-50"
                    : showIncorrect
                      ? "border-red-500 bg-red-50"
                      : isSelected
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5",
                  isSubmitted || disabled
                    ? "cursor-default"
                    : "cursor-pointer",
                )}
              >
                <span className="text-sm font-semibold text-gray-800 sm:text-base">
                  {value ? "True" : "False"}
                </span>
                {showCorrect && (
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                )}
                {showIncorrect && (
                  <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {(question.type === "multiple_choice" ||
        question.type === "true_false") && (
        <div className="sticky bottom-0 z-10 -mx-1 border-t border-gray-100 bg-white/95 px-1 py-3 backdrop-blur-sm supports-backdrop-filter:bg-white/90 sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <button
            type="button"
            onClick={onSubmit}
            disabled={selectedAnswer === null || isSubmitted || disabled}
            className={cn(
              "w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all sm:w-auto sm:py-2",
              selectedAnswer !== null && !isSubmitted && !disabled
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.99]"
                : "cursor-not-allowed bg-gray-200 text-gray-500",
            )}
          >
            {isSubmitted ? "Answer Submitted" : "Submit Answer"}
          </button>
        </div>
      )}

      {isSubmitted && question.explanation && (
        <div
          className={cn(
            "rounded-lg border-l-4 p-3",
            isCorrect
              ? "border-green-500 bg-green-50"
              : "border-red-500 bg-red-50",
          )}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            {isCorrect ? (
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            )}
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isCorrect ? "text-green-800" : "text-red-800",
                )}
              >
                {isCorrect ? "Correct!" : "Incorrect"}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-700">
                {question.explanation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
