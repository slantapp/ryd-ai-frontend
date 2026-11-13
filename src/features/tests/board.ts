import type { LearnerTestCard } from "./types";

export type SquareStatus = "passed" | "failed" | "halfway" | "next" | "fresh";

export type NumberedTest = { test: LearnerTestCard; number: number };

export type TestStep = {
  index: number;
  title: string;
  from: number;
  to: number;
  tests: NumberedTest[];
};

export type LanguageBoard = {
  id: number;
  title: string;
  categoryId: number | null;
  categoryTitle: string;
  tests: NumberedTest[];
  steps: TestStep[];
  passed: number;
  failed: number;
  fresh: number;
  halfway: number;
  focus: NumberedTest | null;
};

const OTHER = "other";

export function categoryKey(test: LearnerTestCard): string {
  return test.category ? String(test.category.id) : OTHER;
}

/** The test the learner should pick up: an open attempt, otherwise the first one not yet passed. */
export function focusTest(tests: LearnerTestCard[]): LearnerTestCard | null {
  return tests.find((test) => test.openAttemptId != null) ?? tests.find((test) => !test.best?.passed) ?? null;
}

export function squareStatus(test: LearnerTestCard, focusId: number | null): SquareStatus {
  if (test.openAttemptId != null) return "halfway";
  if (test.best?.passed) return "passed";
  if (test.best) return "failed";
  if (test.id === focusId) return "next";
  return "fresh";
}

function stepsFrom(tests: NumberedTest[]): TestStep[] {
  const steps: TestStep[] = [];
  for (const item of tests) {
    const title = item.test.courseTitle?.trim() || "Tests";
    const last = steps[steps.length - 1];
    if (last && last.title === title) last.tests.push(item);
    else steps.push({ index: steps.length + 1, title, from: item.number, to: item.number, tests: [item] });
    const current = steps[steps.length - 1];
    current.to = item.number;
  }
  return steps;
}

/** One language (subcategory), tests numbered in the order the API already returns. */
export function languageBoards(tests: LearnerTestCard[]): LanguageBoard[] {
  const groups = new Map<number, LearnerTestCard[]>();
  for (const test of tests) {
    const id = test.subcategory?.id;
    if (id == null) continue;
    const list = groups.get(id) ?? [];
    list.push(test);
    groups.set(id, list);
  }
  return [...groups.entries()].map(([id, items]) => {
    const numbered = items.map((test, index) => ({ test, number: index + 1 }));
    const focus = focusTest(items);
    const focusItem = numbered.find((item) => item.test.id === focus?.id) ?? null;
    const sub = items[0].subcategory!;
    return {
      id,
      title: sub.title,
      categoryId: items[0].category?.id ?? null,
      categoryTitle: items[0].category?.title ?? "Tests",
      tests: numbered,
      steps: stepsFrom(numbered),
      passed: items.filter((test) => test.best?.passed).length,
      failed: items.filter((test) => test.best && !test.best.passed).length,
      fresh: items.filter((test) => !test.best && !test.openAttemptId).length,
      halfway: items.filter((test) => test.openAttemptId != null).length,
      focus: focusItem,
    };
  });
}

export function lowestScore(tests: LearnerTestCard[]): LearnerTestCard | null {
  const scored = tests.filter((test) => test.best);
  if (!scored.length) return null;
  return [...scored].sort((a, b) => (a.best?.percent ?? 0) - (b.best?.percent ?? 0))[0];
}

export function languageStarted(board: LanguageBoard): boolean {
  return board.tests.some((item) => item.test.attemptsUsed > 0 || item.test.openAttemptId != null || item.test.best);
}
