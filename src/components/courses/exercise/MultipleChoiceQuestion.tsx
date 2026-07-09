import type { Question } from "../../../data/curriculumData";
import { CheckCircle2 } from "lucide-react";

interface MultipleChoiceQuestionProps {
  question: Question;
  selectedAnswer: string | null;
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export default function MultipleChoiceQuestion({
  question,
  selectedAnswer,
  onSelect,
  disabled = false,
}: MultipleChoiceQuestionProps) {
  if (question.type !== "multiple_choice" || !question.options) {
    return null;
  }

  return (
    <div className="mt-4 w-full min-w-0 space-y-2.5 sm:space-y-3">
      {question.options.map((option: string, index: number) => {
        const isSelected = selectedAnswer === option;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(option)}
            disabled={disabled}
            className={`group relative w-full min-w-0 rounded-xl border-2 p-3 text-left transition-all duration-200 sm:p-4 ${
              disabled
                ? "cursor-not-allowed opacity-60"
                : "hover:scale-[1.01] sm:hover:scale-[1.02]"
            } ${
              isSelected
                ? "border-primary bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-white shadow-lg shadow-primary/40"
                : "border-primary/20 bg-white/80 text-gray-700 shadow-sm backdrop-blur-sm hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
            }`}
          >
            <div className="flex items-start justify-between gap-2 sm:items-center sm:gap-3">
              <span
                className={`min-w-0 flex-1 text-sm font-medium leading-snug break-words sm:text-base ${
                  isSelected ? "text-white" : "text-gray-800"
                }`}
              >
                {option}
              </span>
              {isSelected ? (
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
