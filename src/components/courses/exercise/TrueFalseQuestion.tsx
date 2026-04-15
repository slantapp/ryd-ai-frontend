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
    <div className="flex gap-4 mt-6">
      <button
        onClick={() => onSelect(true)}
        disabled={disabled}
        className={`group relative p-4 px-10 text-lg font-semibold rounded-xl border-2 transition-all duration-200 transform ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:scale-105"
        } ${
          selectedAnswer === true
            ? "bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white border-primary shadow-lg shadow-primary/40"
            : "bg-white/80 backdrop-blur-sm text-gray-700 border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-center gap-3">
          {selectedAnswer === true ? (
            <CheckCircle2 size={24} strokeWidth={2.5} className="text-white" />
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-primary/30 group-hover:border-primary/60 transition-colors" />
          )}
          <span
            className={selectedAnswer === true ? "text-white" : "text-gray-800"}
          >
            True
          </span>
        </div>
      </button>
      <button
        onClick={() => onSelect(false)}
        disabled={disabled}
        className={`group relative p-4 px-10 text-lg font-semibold rounded-xl border-2 transition-all duration-200 transform ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:scale-105"
        } ${
          selectedAnswer === false
            ? "bg-gradient-to-br from-primary/70 via-primary/60 to-primary/50 text-white border-primary/70 shadow-lg shadow-primary/30"
            : "bg-white/80 backdrop-blur-sm text-gray-700 border-primary/20 hover:border-primary/50 hover:bg-primary/5 shadow-sm hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-center gap-3">
          {selectedAnswer === false ? (
            <XCircle size={24} strokeWidth={2.5} className="text-white" />
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-primary/30 group-hover:border-primary/60 transition-colors" />
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
