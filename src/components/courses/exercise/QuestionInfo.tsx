import type { Question } from "../../../data/curriculumData";

interface QuestionInfoProps {
  question: Question;
}

export default function QuestionInfo({ question }: QuestionInfoProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-2">{question.question}</h2>
      {question.explanation && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <strong>Hint:</strong> {question.explanation}
        </div>
      )}
      {question.testCriteria && (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
          <strong>Requirements:</strong>
          <pre className="mt-2 text-xs">
            {JSON.stringify(question.testCriteria, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
