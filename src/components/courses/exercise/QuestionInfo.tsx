import type { Question } from "../../../data/curriculumData";

interface QuestionInfoProps {
  question: Question;
}

export default function QuestionInfo({ question }: QuestionInfoProps) {
  const criteriaHint =
    question.type === "formula_test" &&
    question.testCriteria?.expectedFormula
      ? `Enter your final answer (e.g. ${question.testCriteria.expectedFormula}).`
      : null;

  return (
    <div className="min-w-0">
      {question.type === "code_test" && (
        <h2 className="mb-2 text-base font-bold leading-snug text-gray-900 sm:text-lg lg:text-xl">
          {question.question}
        </h2>
      )}
      {criteriaHint && (
        <p className="mt-2 rounded border border-indigo-200 bg-indigo-50 p-2.5 text-xs text-indigo-900 sm:p-3 sm:text-sm">
          {criteriaHint}
        </p>
      )}
      {question.explanation && question.type === "code_test" && (
        <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800 sm:p-3 sm:text-sm">
          <strong>Hint:</strong> {question.explanation}
        </div>
      )}
    </div>
  );
}
