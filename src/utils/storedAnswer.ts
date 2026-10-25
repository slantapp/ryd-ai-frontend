/** Wrong submits allowed before the avatar states the stored answer. */
export const ANSWER_ATTEMPT_LIMIT = 2;

export function wrongAttemptOutcome(
  used: number,
  max = ANSWER_ATTEMPT_LIMIT,
): { next: number; exhausted: boolean; hint: string } {
  const next = used + 1;
  const left = Math.max(0, max - next);
  const hint =
    left === 1
      ? "Not quite. You have one more try."
      : `Not quite. You have ${left} more tries.`;
  return { next, exhausted: next >= max, hint };
}

type StoredCriteria = {
  expectedCode?: string;
  expectedHTML?: string;
  expectedCSS?: string;
  expectedJS?: string;
  expectedFormula?: string;
  expectedVariable?: string;
  expectedValue?: unknown;
  expectedFunction?: string;
};

export type StoredAnswerQuestion = {
  type: string;
  answer?: string | boolean;
  code_example?: { code?: string };
  testCriteria?: StoredCriteria;
};

export type StoredAnswer = {
  spoken: string | null;
  code?: string;
  formula?: string;
  web?: { html?: string; css?: string; javascript?: string };
};

/** Spoken after a code question is missed. The source stays in the editor. */
export const CODE_SOLUTION_SPEECH =
  "Take a look at the editor. That is the correct answer. Try to understand it yourself.";

/** The answer the author stored. Nothing is invented when that answer is missing. */
export function describeStoredAnswer(question: StoredAnswerQuestion): StoredAnswer {
  if (question.type === "multiple_choice") {
    const answer = typeof question.answer === "string" ? question.answer.trim() : "";
    return { spoken: answer ? `The right answer is ${answer}.` : null };
  }

  if (question.type === "true_false") {
    if (typeof question.answer !== "boolean") return { spoken: null };
    return {
      spoken: `The right answer is ${question.answer ? "true" : "false"}.`,
    };
  }

  if (question.type === "formula_test") {
    const formula = question.testCriteria?.expectedFormula?.trim() ?? "";
    if (!formula) return { spoken: null };
    return { spoken: `The right answer is ${formula}.`, formula };
  }

  if (question.type !== "code_test") return { spoken: null };

  const criteria = question.testCriteria;
  const web = {
    html: criteria?.expectedHTML?.trim() || undefined,
    css: criteria?.expectedCSS?.trim() || undefined,
    javascript: criteria?.expectedJS?.trim() || undefined,
  };
  const hasWeb = !!(web.html || web.css || web.javascript);
  let code = "";
  if (criteria?.expectedCode && !criteria.expectedCode.startsWith("regex:")) {
    code = criteria.expectedCode.trim();
  } else if (question.code_example?.code?.trim()) {
    code = question.code_example.code.trim();
  }

  if (!code && !hasWeb && criteria?.expectedVariable) {
    const value =
      criteria.expectedValue !== undefined
        ? ` set to ${String(criteria.expectedValue)}`
        : "";
    return {
      spoken: `The right answer uses a variable named ${criteria.expectedVariable}${value}.`,
    };
  }

  if (!code && !hasWeb && criteria?.expectedFunction) {
    return {
      spoken: `The right answer includes a function named ${criteria.expectedFunction}.`,
    };
  }

  if (!code && !hasWeb) return { spoken: null };

  return {
    spoken: CODE_SOLUTION_SPEECH,
    code: code || undefined,
    web: hasWeb ? web : undefined,
  };
}
