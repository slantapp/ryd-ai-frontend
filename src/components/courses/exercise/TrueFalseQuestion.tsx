import { CheckCircle2, XCircle } from "lucide-react";

interface TrueFalseQuestionProps {
  selectedAnswer: boolean | null;
  onSelect: (value: boolean) => void;
  disabled?: boolean;
}

export default function TrueFalseQuestion({
  selectedAnswer,
  onSelect,
  disabled = false,
}: TrueFalseQuestionProps) {
  return (
    <div className="mt-4 flex w-full min-w-0 flex-col gap-3 sm:mt-6 sm:flex-row sm:gap-4">
      <button
        type="button"
        onClick={() => onSelect(true)}
        disabled={disabled}
        className={`group relative min-w-0 flex-1 rounded-xl border-2 px-4 py-3 text-base font-semibold transition-all duration-200 sm:px-8 sm:py-4 sm:text-lg ${
          disabled ? "cursor-not-allowed opacity-60" : "hover:scale-[1.02] sm:hover:scale-105"
        } ${
          selectedAnswer === true
            ? "border-primary bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white shadow-lg shadow-primary/40"
            : "border-primary/20 bg-white/80 text-gray-700 shadow-sm backdrop-blur-sm hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {selectedAnswer === true ? (
            <CheckCircle2
              size={22}
              strokeWidth={2.5}
              className="shrink-0 text-white sm:size-6"
            />
          ) : (
            <div className="size-5 shrink-0 rounded-full border-2 border-primary/30 transition-colors group-hover:border-primary/60 sm:size-6" />
          )}
          <span
            className={selectedAnswer === true ? "text-white" : "text-gray-800"}
          >
            True
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onSelect(false)}
        disabled={disabled}
        className={`group relative min-w-0 flex-1 rounded-xl border-2 px-4 py-3 text-base font-semibold transition-all duration-200 sm:px-8 sm:py-4 sm:text-lg ${
          disabled ? "cursor-not-allowed opacity-60" : "hover:scale-[1.02] sm:hover:scale-105"
        } ${
          selectedAnswer === false
            ? "border-primary/70 bg-gradient-to-br from-primary/70 via-primary/60 to-primary/50 text-white shadow-lg shadow-primary/30"
            : "border-primary/20 bg-white/80 text-gray-700 shadow-sm backdrop-blur-sm hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {selectedAnswer === false ? (
            <XCircle
              size={22}
              strokeWidth={2.5}
              className="shrink-0 text-white sm:size-6"
            />
          ) : (
            <div className="size-5 shrink-0 rounded-full border-2 border-primary/30 transition-colors group-hover:border-primary/60 sm:size-6" />
          )}
          <span
            className={
              selectedAnswer === false ? "text-white" : "text-gray-800"
            }
          >
            False
          </span>
        </div>
      </button>
    </div>
  );
}
