import { CheckCircle, XCircle } from "lucide-react";
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
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="mb-3 text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
          {question.question}
        </h3>
        <div className="h-1 w-20 rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
      </div>

      {question.type === "multiple_choice" && question.options && (
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const showCorrect = isSubmitted && option === question.answer;
            const showIncorrect = isSubmitted && isSelected && !isCorrect;

            return (
              <button
                key={index}
                type="button"
                onClick={() => !isSubmitted && !disabled && onSelectAnswer(option)}
                disabled={isSubmitted || disabled}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  showCorrect
                    ? "border-green-500 bg-green-50"
                    : showIncorrect
                    ? "border-red-500 bg-red-50"
                    : isSelected
                    ? "border-primary bg-primary/10"
                    : "border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5"
                } ${isSubmitted || disabled ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold ${
                        showCorrect
                          ? "border-green-500 bg-green-500 text-white"
                          : showIncorrect
                          ? "border-red-500 bg-red-500 text-white"
                          : isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-gray-300 text-gray-500"
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="font-medium text-gray-800">{option}</span>
                  </div>
                  {showCorrect && <CheckCircle className="h-6 w-6 text-green-500" />}
                  {showIncorrect && <XCircle className="h-6 w-6 text-red-500" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {question.type === "true_false" && (
        <div className="flex gap-4">
          {[true, false].map((value) => {
            const isSelected = selectedAnswer === value;
            const showCorrect = isSubmitted && value === question.answer;
            const showIncorrect = isSubmitted && isSelected && selectedAnswer !== question.answer;

            return (
              <button
                key={String(value)}
                type="button"
                onClick={() => !isSubmitted && !disabled && onSelectAnswer(value)}
                disabled={isSubmitted || disabled}
                className={`flex-1 rounded-xl border-2 p-6 text-center transition-all ${
                  showCorrect
                    ? "border-green-500 bg-green-50"
                    : showIncorrect
                    ? "border-red-500 bg-red-50"
                    : isSelected
                    ? "border-primary bg-primary/10"
                    : "border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5"
                } ${isSubmitted || disabled ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl font-bold text-gray-800">
                    {value ? "True" : "False"}
                  </span>
                  {showCorrect && <CheckCircle className="h-6 w-6 text-green-500" />}
                  {showIncorrect && <XCircle className="h-6 w-6 text-red-500" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {(question.type === "multiple_choice" || question.type === "true_false") && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onSubmit}
            disabled={selectedAnswer === null || isSubmitted || disabled}
            className={`w-full rounded-xl py-3 px-6 font-semibold text-lg transition-all ${
              selectedAnswer !== null && !isSubmitted && !disabled
                ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSubmitted ? "Answer Submitted" : "Submit Answer"}
          </button>
        </div>
      )}

      {isSubmitted && question.explanation && (
        <div
          className={`mt-6 rounded-xl border-l-4 p-4 ${
            isCorrect
              ? "border-green-500 bg-green-50"
              : "border-red-500 bg-red-50"
          }`}
        >
          <div className="flex items-start gap-3">
            {isCorrect ? (
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            )}
            <div>
              <p className={`font-semibold ${isCorrect ? "text-green-800" : "text-red-800"}`}>
                {isCorrect ? "Correct!" : "Incorrect"}
              </p>
              <p className="mt-1 text-sm text-gray-700">{question.explanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
