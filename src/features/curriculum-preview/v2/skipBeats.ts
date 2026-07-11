import type { Beat, LessonV2, Question } from "./types";

export type V2SkipTarget = { type: "beat"; index: number };

export type V2SkipPanelItem = {
  id: string;
  label: string;
  target: V2SkipTarget;
};

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

function shouldIncludeBeat(beat: Beat, index: number): boolean {
  switch (beat.type) {
    case "pause":
      return false;
    case "speak":
      // Keep hook / first listen step; skip intermediate narration beats.
      return beat.phase === "hook" || index === 0;
    case "display":
    case "media":
    case "code_demo":
    case "formula_demo":
    case "question":
    case "recap":
    case "bridge":
      return true;
    default:
      return false;
  }
}

function beatSkipLabel(beat: Beat, questionOrdinal: number): string {
  switch (beat.type) {
    case "speak":
      return beat.phase === "hook" ? "Lesson intro" : "Listen";
    case "display":
      return beat.title?.trim() || "Learn";
    case "media":
      return "Look";
    case "code_demo":
      return "Code example";
    case "formula_demo":
      return "Formula example";
    case "question":
      return `Question ${questionOrdinal} (${questionTypeLabel(beat.question)})`;
    case "recap":
      return "Recap";
    case "bridge":
      return beat.next ? "Next lesson" : "Finish";
    default:
      return "Step";
  }
}

/** Build skip-to-section chips for a V2 lesson flow (mirrors classic PreviewSkipPanel). */
export function buildV2SkipPanelItems(lesson: LessonV2): V2SkipPanelItem[] {
  let questionOrdinal = 0;
  const items: V2SkipPanelItem[] = [];

  lesson.flow.forEach((beat, index) => {
    if (beat.type === "question") questionOrdinal += 1;
    if (!shouldIncludeBeat(beat, index)) return;
    items.push({
      id: beat.id,
      label: beatSkipLabel(beat, questionOrdinal),
      target: { type: "beat", index },
    });
  });

  return items;
}
