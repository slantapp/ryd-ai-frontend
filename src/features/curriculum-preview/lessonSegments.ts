import type { CodingLesson, Lesson, Question } from "./types";

export type TeachingSegmentKind =
  | "intro"
  | "body"
  | "avatar_script"
  | "code_example"
  | "formula_example";

export type LessonPreviewMode = "coding" | "math";

export type LessonJumpTarget =
  | { type: "teaching"; segment: TeachingSegmentKind }
  | { type: "question"; index: number };

export type SkipPanelItem = {
  id: string;
  label: string;
  target: LessonJumpTarget;
};

function teachingSegmentLabel(segment: TeachingSegmentKind): string {
  switch (segment) {
    case "intro":
      return "Lesson intro";
    case "body":
      return "Body text";
    case "avatar_script":
      return "Avatar script";
    case "code_example":
      return "Code example";
    case "formula_example":
      return "Formula example";
  }
}

function questionTypeLabel(question: Question): string {
  switch (question.type) {
    case "code_test":
      return "Code test";
    case "true_false":
      return "True / false";
    case "formula_test":
      return "Formula test";
    default:
      return "Multiple choice";
  }
}

export function getTeachingSegments(
  lesson: Lesson,
  mode: LessonPreviewMode = "coding",
): TeachingSegmentKind[] {
  const segments: TeachingSegmentKind[] = ["intro"];
  if (lesson.body?.trim()) segments.push("body");
  if (lesson.avatar_script?.trim()) segments.push("avatar_script");
  if (mode === "math") {
    if (lesson.formula_example) segments.push("formula_example");
  } else if (
    (lesson as CodingLesson).code_example
  ) {
    segments.push("code_example");
  }
  return segments;
}

export function buildSkipPanelItems(
  lesson: Lesson,
  mode: LessonPreviewMode = "coding",
): SkipPanelItem[] {
  const items: SkipPanelItem[] = getTeachingSegments(lesson, mode).map(
    (segment) => ({
      id: `teaching-${segment}`,
      label: teachingSegmentLabel(segment),
      target: { type: "teaching", segment },
    }),
  );

  lesson.questions.forEach((question, index) => {
    items.push({
      id: `question-${index}`,
      label: `Question ${index + 1} (${questionTypeLabel(question)})`,
      target: { type: "question", index },
    });
  });

  return items;
}
