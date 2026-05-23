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
    <div>
      {question.type === "code_test" && (
        <h2 className="mb-2 text-xl font-bold">{question.question}</h2>
      )}
      {criteriaHint && (
        <p className="mt-2 rounded border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
          {criteriaHint}
        </p>
      )}
      {question.explanation && question.type === "code_test" && (
        <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <strong>Hint:</strong> {question.explanation}
        </div>
      )}
    </div>
  );
}
