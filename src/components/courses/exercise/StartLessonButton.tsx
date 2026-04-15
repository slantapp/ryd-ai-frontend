interface StartLessonButtonProps {
  onStart: () => void;
  className?: string;
}

export default function StartLessonButton({
  onStart,
  className = "",
}: StartLessonButtonProps) {
  return (
    <button
      onClick={onStart}
      className={`px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow transition-colors ${className}`}
    >
      Start Lesson
    </button>
  );
}
