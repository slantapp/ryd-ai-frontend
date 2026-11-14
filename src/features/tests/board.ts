import type { LearnerTestCard } from "./types";

export type SquareStatus = "passed" | "failed" | "halfway" | "next" | "fresh";

export type NumberedTest = {
  test: LearnerTestCard;
  /** Position in this language, 1…n. */
  number: number;
  /** Shown on the square. A title like "2.1 If statements" keeps "2.1". */
  label: string;
  stepNumber: number;
};

export type TestStep = {
  index: number;
  title: string;
  from: string;
  to: string;
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

/** The finished test with the latest attempt. An open attempt that was never submitted does not count. */
export function lastCompletedTest(tests: NumberedTest[]): NumberedTest | null {
  const finished = tests.filter((item) => item.test.best);
  if (!finished.length) return null;
  return [...finished].sort((a, b) => {
    const left = Date.parse(a.test.lastAttemptAt || "") || 0;
    const right = Date.parse(b.test.lastAttemptAt || "") || 0;
    return right - left || b.number - a.number;
  })[0];
}

export function squareStatus(test: LearnerTestCard, focusId: number | null): SquareStatus {
  if (test.openAttemptId != null) return "halfway";
  if (test.best?.passed) return "passed";
  if (test.best) return "failed";
  if (test.id === focusId) return "next";
  return "fresh";
}

/** "1.1 Print" and "2.1 If" are step 1 item 1 and step 2 item 1. */
export function testCode(title: string): { step: number; item: number; label: string } | null {
  const match = title.trim().match(/^(\d+)\.(\d+)\b/);
  if (!match) return null;
  return { step: Number(match[1]), item: Number(match[2]), label: `${match[1]}.${match[2]}` };
}

function stepsFrom(tests: NumberedTest[]): TestStep[] {
  const steps: TestStep[] = [];
  for (const item of tests) {
    const course = item.test.courseTitle?.trim() || "";
    const last = steps[steps.length - 1];
    const sameStep = last && last.index === item.stepNumber;
    if (sameStep) {
      last.tests.push(item);
      if (!last.title && course) last.title = course;
    } else {
      steps.push({
        index: item.stepNumber,
        title: course,
        from: item.label,
        to: item.label,
        tests: [item],
      });
    }
    const current = steps[steps.length - 1];
    current.to = item.label;
  }
  for (const step of steps) {
    if (step.title) continue;
    const names = step.tests.map((item) => item.test.description?.trim() || "");
    if (names.length > 0 && names.every((name) => name && name === names[0])) step.title = names[0];
  }
  return steps;
}

/** "1.1 Print hello" → "Python 1.1 · Print hello" for banners. */
export function displayTestTitle(language: string, title: string): string {
  const code = testCode(title);
  if (!code) return title;
  const rest = title.slice(code.label.length).replace(/^[\s·:\-–]+/, "");
  return rest ? `${language} ${code.label} · ${rest}` : `${language} ${code.label}`;
}

/** "1.1 Print hello" → "1.1 · Print hello" for a language card. */
export function shortTestTitle(title: string): string {
  const code = testCode(title);
  if (!code) return title;
  const rest = title.slice(code.label.length).replace(/^[\s·:\-–]+/, "");
  return rest ? `${code.label} · ${rest}` : code.label;
}

function orderTests(tests: LearnerTestCard[]): LearnerTestCard[] {
  const coded = tests.filter((test) => testCode(test.title));
  if (coded.length < Math.ceil(tests.length / 2)) return tests;
  return [...tests].sort((a, b) => {
    const left = testCode(a.title);
    const right = testCode(b.title);
    if (left && right && (left.step !== right.step || left.item !== right.item)) {
      return left.step - right.step || left.item - right.item;
    }
    if (left && !right) return -1;
    if (!left && right) return 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id;
  });
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
    const ordered = orderTests(items);
    const numbered = ordered.map((test, index) => {
      const code = testCode(test.title);
      return {
        test,
        number: index + 1,
        label: code?.label ?? String(index + 1),
        stepNumber: code?.step ?? index + 1,
      };
    });
    const plain = numbered.filter((item) => !testCode(item.test.title));
    if (plain.length === numbered.length) {
      let step = 1;
      numbered.forEach((item, index) => {
        const course = item.test.courseTitle?.trim() || "";
        const previous = index > 0 ? numbered[index - 1].test.courseTitle?.trim() || "" : course;
        if (index > 0 && course !== previous) step += 1;
        item.stepNumber = step;
        item.label = String(index + 1);
      });
    } else if (plain.length) {
      const nextStep = Math.max(...numbered.map((item) => item.stepNumber)) + 1;
      plain.forEach((item) => {
        item.stepNumber = nextStep;
      });
    }
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
