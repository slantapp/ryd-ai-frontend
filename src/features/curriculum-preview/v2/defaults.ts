import type { AvatarDefaults, CurriculumV2Data, LessonV2 } from "./types";

export const FALLBACK_AVATAR_DEFAULTS: Required<AvatarDefaults> = {
  intro_template:
    "Welcome! In this lesson, you will be learning about {{lesson_title}}.",
  continue_prompt: "Tap Continue when you're ready to keep going.",
  start_questions_prompt: "Great! When you're ready, tap Start Questions.",
  handoff_to_practice:
    "Now it's your turn! Finish the challenge in the workspace.",
  lesson_complete_template: "In this lesson, you learned about {{lesson_title}}.",
  correct_feedback: "That's correct! Well done.",
  incorrect_feedback: "Not quite — let's look at that again.",
};

export function resolveAvatarDefaults(
  curriculum: CurriculumV2Data,
): Required<AvatarDefaults> {
  return {
    ...FALLBACK_AVATAR_DEFAULTS,
    ...curriculum.defaults?.avatar,
  };
}

export function fillTemplate(
  template: string,
  vars: { lesson_title?: string; module_title?: string },
): string {
  return template
    .replace(/\{\{\s*lesson_title\s*\}\}/g, vars.lesson_title ?? "")
    .replace(/\{\{\s*module_title\s*\}\}/g, vars.module_title ?? "");
}

export function pauseMinSeconds(
  curriculum: CurriculumV2Data,
  beatMin?: number,
): number {
  if (typeof beatMin === "number" && beatMin >= 0) return beatMin;
  return curriculum.defaults?.advance?.pause_min_seconds ?? 2;
}

export function lessonGoalLabel(lesson: LessonV2): string | null {
  return lesson.goal?.trim() || null;
}
