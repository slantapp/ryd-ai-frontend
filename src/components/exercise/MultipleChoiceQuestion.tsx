import type { Question } from "../../data/curriculumData";
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
    <div className="space-y-3 mt-4">
      {question.options.map((option: string, index: number) => {
        const isSelected = selectedAnswer === option;
        return (
          <button
            key={index}
            onClick={() => onSelect(option)}
            disabled={disabled}
            className={`group relative w-full p-4 text-left rounded-xl border-2 transition-all duration-200 transform ${
              disabled
                ? "opacity-60 cursor-not-allowed"
                : "hover:scale-[1.02]"
            } ${
              isSelected
                ? "bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-white border-primary shadow-lg shadow-primary/40"
                : "bg-white/80 backdrop-blur-sm text-gray-700 border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm hover:shadow-md"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`font-medium ${
                  isSelected ? "text-white" : "text-gray-800"
                }`}
              >
                {option}
              </span>
              {isSelected && (
                <CheckCircle2
                  className="ml-2 flex-shrink-0 text-white"
                  size={20}
                  strokeWidth={2.5}
                />
              )}
              {!isSelected && (
                <div className="ml-2 w-5 h-5 rounded-full border-2 border-primary/30 group-hover:border-primary/60 transition-colors" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
