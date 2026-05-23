import type { FormulaExample, Question } from "@/data/curriculumData";

export function isCodeTestQuestion(
  question: Question | null | undefined,
): question is Question & { type: "code_test" } {
  return question?.type === "code_test";
}

export function isFormulaTestQuestion(
  question: Question | null | undefined,
): question is Question & { type: "formula_test" } {
  return question?.type === "formula_test";
}

export function isInteractiveExerciseQuestion(
  question: Question | null | undefined,
): boolean {
  return isCodeTestQuestion(question) || isFormulaTestQuestion(question);
}

export function getQuestionFormulaExample(
  question: Question,
): FormulaExample | undefined {
  if (question.type === "formula_test") {
    return question.formula_example;
  }
  return undefined;
}

export function getQuestionCodeExample(question: Question) {
  if (question.type === "code_test") {
    return question.code_example;
  }
  return undefined;
}
