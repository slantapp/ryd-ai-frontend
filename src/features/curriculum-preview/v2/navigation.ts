import type { CurriculumV2Data, LessonV2, ModuleV2 } from "./types";

export function getFirstLessonV2(curriculum: CurriculumV2Data): LessonV2 | null {
  const mod = curriculum.modules[0];
  return mod?.lessons[0] ?? null;
}

export function findLessonV2ById(
  curriculum: CurriculumV2Data,
  lessonId: string,
): LessonV2 | null {
  for (const mod of curriculum.modules) {
    const lesson = mod.lessons.find((l) => l.id === lessonId);
    if (lesson) return lesson;
  }
  return null;
}

export function getModuleForLessonV2(
  curriculum: CurriculumV2Data,
  lesson: LessonV2,
): ModuleV2 | null {
  return (
    curriculum.modules.find((m) => m.lessons.some((l) => l.id === lesson.id)) ??
    null
  );
}

export function getNextLessonV2(
  curriculum: CurriculumV2Data,
  current: LessonV2,
): LessonV2 | null {
  for (let mi = 0; mi < curriculum.modules.length; mi++) {
    const mod = curriculum.modules[mi];
    const li = mod.lessons.findIndex((l) => l.id === current.id);
    if (li === -1) continue;
    if (li + 1 < mod.lessons.length) return mod.lessons[li + 1];
    const nextMod = curriculum.modules[mi + 1];
    return nextMod?.lessons[0] ?? null;
  }
  return null;
}

export function getPreviousLessonV2(
  curriculum: CurriculumV2Data,
  current: LessonV2,
): LessonV2 | null {
  for (let mi = 0; mi < curriculum.modules.length; mi++) {
    const mod = curriculum.modules[mi];
    const li = mod.lessons.findIndex((l) => l.id === current.id);
    if (li === -1) continue;
    if (li > 0) return mod.lessons[li - 1];
    const prevMod = curriculum.modules[mi - 1];
    if (!prevMod || prevMod.lessons.length === 0) return null;
    return prevMod.lessons[prevMod.lessons.length - 1];
  }
  return null;
}

export function countLessonsV2(curriculum: CurriculumV2Data): number {
  return curriculum.modules.reduce((sum, m) => sum + m.lessons.length, 0);
}

export function flattenLessonsV2(
  curriculum: CurriculumV2Data,
): Array<{ module: ModuleV2; lesson: LessonV2; index: number }> {
  const out: Array<{ module: ModuleV2; lesson: LessonV2; index: number }> = [];
  let index = 0;
  for (const module of curriculum.modules) {
    for (const lesson of module.lessons) {
      out.push({ module, lesson, index });
      index++;
    }
  }
  return out;
}
