export interface FormulaExample {
  formula: string;
  subject?: string;
  description?: string;
  explanation?: string;
  autoRun?: boolean;
  typingSpeed?: number;
}

export interface CodeExample {
  code: string;
  language: string;
  description?: string;
  explanation?: string;
  autoRun?: boolean;
  typingSpeed?: number;
  /**
   * Seeded into the editor on student practice handoff (after the worked example).
   * Prefer a skeleton with comments — not the full solution.
   */
  starterCode?: string;
}

export interface Question {
  id?: string;
  type: "multiple_choice" | "true_false" | "code_test" | "formula_test";
  question: string;
  options?: string[];
  answer?: string | boolean;
  explanation?: string;
  code_example?: CodeExample;
  formula_example?: FormulaExample;
  testCriteria?: {
    expectedVariable?: string;
    expectedValue?: unknown;
    expectedValues?: unknown[];
    expectedFunction?: string;
    expectedHTML?: string;
    expectedCSS?: string;
    expectedJS?: string;
    expectedCode?: string;
    /** Math: expected final answer or expression (flexible match). */
    expectedFormula?: string;
    testCases?: Array<{
      input: unknown[];
      expected: unknown;
    }>;
  };
}

export interface Lesson {
  id: string;
  title: string;
  body: string;
  avatar_script: string;
  media: {
    image?: string;
    video?: string;
  };
  /** Lesson-level worked example for mathematics curricula only. */
  formula_example?: FormulaExample;
  /** Optional lesson demo after the avatar script — coding curricula only, not mathematics. */
  code_example?: CodeExample;
  questions: Question[];
  next_lesson_id: string | null;
}

/** Category label for grouping courses in the library folder view (any non-empty string). */
export type CurriculumCategory = string;

export interface Curriculum {
  slug: string;
  curriculum: {
    title: string;
    description: string;
    language: string;
    /** Category for folder grouping on the course listing page. */
    category: CurriculumCategory;
    /** Minimum recommended learner age (years), used for course listing filters. */
    age: number;
    /** Local school class, e.g. "Primary 5" or "JSS 1". */
    class: string;
    /** Optional international grade number (shown as Gr. N next to class). */
    grade?: number;
    /** Estimated time to complete, e.g. "6 weeks". */
    duration?: string;
    /** Difficulty label shown on course cards. */
    level?: "Beginner" | "Intermediate" | "Advanced";
    /** Display rating from 0 to 5. */
    rating?: number;
    modules: Array<{
      id: string;
      title: string;
      prerequisite: string | null;
      lessons: Lesson[];
    }>;
  };
}

// Helper function to find a lesson by ID in a specific curriculum
export function findLessonById(
  lessonId: string,
  curriculum: Curriculum["curriculum"],
): Lesson | null {
  for (const module of curriculum.modules) {
    const lesson = module.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      return lesson as Lesson;
    }
  }
  return null;
}

// Helper function to find the next lesson - handles both lesson IDs and module IDs
// If next_lesson_id is a module ID, returns the first lesson of that module
// NOTE: Lesson IDs can be duplicated across modules (e.g. css_lesson_01 in each module).
// Prefer getNextLessonInOrder(currentLesson, curriculum) when you have the current lesson object.
export function findNextLesson(
  nextLessonId: string,
  curriculum: Curriculum["curriculum"],
): Lesson | null {
  // First, try to find a lesson with this ID
  const lesson = findLessonById(nextLessonId, curriculum);
  if (lesson) {
    return lesson;
  }

  // If not found as a lesson, check if it's a module ID
  const module = curriculum.modules.find((m) => m.id === nextLessonId);
  if (module && module.lessons.length > 0) {
    return module.lessons[0] as Lesson;
  }

  return null;
}

// Get the next lesson in curriculum order by position (not by ID).
// Use this when lesson IDs are reused across modules so we don't jump to the wrong module.
export function getNextLessonInOrder(
  currentLesson: Lesson,
  curriculum: Curriculum["curriculum"],
): Lesson | null {
  for (let modIndex = 0; modIndex < curriculum.modules.length; modIndex++) {
    const mod = curriculum.modules[modIndex];
    const lessonIndex = mod.lessons.findIndex((l) => l === currentLesson);
    if (lessonIndex !== -1) {
      // Next lesson in same module
      if (lessonIndex + 1 < mod.lessons.length) {
        return mod.lessons[lessonIndex + 1] as Lesson;
      }
      // Last lesson in module: next is first lesson of next module
      if (modIndex + 1 < curriculum.modules.length) {
        const nextMod = curriculum.modules[modIndex + 1];
        if (nextMod.lessons.length > 0) {
          return nextMod.lessons[0] as Lesson;
        }
      }
      return null;
    }
  }
  return null;
}

// Get the previous lesson in curriculum order by position (not by ID).
// Use this to navigate backward through lessons/modules.
export function getPreviousLessonInOrder(
  currentLesson: Lesson,
  curriculum: Curriculum["curriculum"],
): Lesson | null {
  for (let modIndex = 0; modIndex < curriculum.modules.length; modIndex++) {
    const mod = curriculum.modules[modIndex];
    const lessonIndex = mod.lessons.findIndex((l) => l === currentLesson);
    if (lessonIndex !== -1) {
      // Previous lesson in same module
      if (lessonIndex > 0) {
        return mod.lessons[lessonIndex - 1] as Lesson;
      }
      // First lesson in module: previous is last lesson of previous module
      if (modIndex > 0) {
        const prevMod = curriculum.modules[modIndex - 1];
        if (prevMod.lessons.length > 0) {
          return prevMod.lessons[prevMod.lessons.length - 1] as Lesson;
        }
      }
      return null;
    }
  }
  return null;
}

// Get the module index that contains this lesson (by reference). Used to detect module boundaries.
export function getModuleIndexForLesson(
  lesson: Lesson,
  curriculum: Curriculum["curriculum"],
): number {
  for (let i = 0; i < curriculum.modules.length; i++) {
    if (curriculum.modules[i].lessons.includes(lesson)) return i;
  }
  return -1;
}

// Flat index of lesson in curriculum (all modules, in order). Used for progress so we restore the right lesson when IDs repeat.
export function getLessonIndexInCurriculum(
  lesson: Lesson,
  curriculum: Curriculum["curriculum"],
): number {
  let index = 0;
  for (const mod of curriculum.modules) {
    for (let i = 0; i < mod.lessons.length; i++) {
      if (mod.lessons[i] === lesson) return index;
      index++;
    }
  }
  return -1;
}

// Get lesson by flat index in curriculum (for restoring progress when lesson IDs are duplicated).
export function getLessonByIndex(
  index: number,
  curriculum: Curriculum["curriculum"],
): Lesson | null {
  let count = 0;
  for (const mod of curriculum.modules) {
    for (const lesson of mod.lessons) {
      if (count === index) return lesson as Lesson;
      count++;
    }
  }
  return null;
}

// Helper function to get the first lesson in a curriculum
export function getFirstLesson(
  curriculum: Curriculum["curriculum"],
): Lesson | null {
  const firstModule = curriculum.modules[0];
  if (firstModule && firstModule.lessons.length > 0) {
    return firstModule.lessons[0] as Lesson;
  }
  return null;
}

import jokeMachineSneakPeekCurriculum from "./joke-machine-sneak-peek-curriculum.json";
import type {
  CurriculumV2,
  CurriculumV2Data,
} from "@/features/curriculum-preview/v2/types";

/** Bundled sneak-peek demo (not from the visible-curricula API). */
export const DEMO_COURSE_SLUG = "sneak-peek-joke-machine-html";

/**
 * API / store entry may be classic v1 or flow v2. Keep `curriculum` loosely typed
 * so visible-curricula payloads are not forced through the v1 Lesson shape.
 */
export type CurriculumEntry = {
  slug: string;
  schema_version?: number;
  curriculum: Curriculum["curriculum"] | CurriculumV2Data | Record<string, unknown>;
};

/** Schema v2 flow curriculum used by the free sneak-peek lesson player. */
export function getDemoCurriculumV2(): CurriculumV2 {
  return jokeMachineSneakPeekCurriculum as CurriculumV2;
}

export function isDemoCourseSlug(slug: string | null | undefined): boolean {
  return slug === DEMO_COURSE_SLUG;
}

/** Curricula loaded from `/parent/curriculum/visible`. */
let remoteCurricula: CurriculumEntry[] = [];

export function setRemoteCurricula(curricula: CurriculumEntry[]): void {
  remoteCurricula = curricula;
}

/** Visible curriculums from the API only (no bundled local JSON). */
export function getAllCurricula(): Curriculum[] {
  return remoteCurricula as Curriculum[];
}

/** Raw entry by slug — includes bundled demo v2 and API v1/v2 payloads. */
export function getCurriculumEntryBySlug(slug: string): CurriculumEntry | null {
  if (isDemoCourseSlug(slug)) {
    return getDemoCurriculumV2();
  }
  return remoteCurricula.find((curriculum) => curriculum.slug === slug) || null;
}

// Helper function to get curriculum by slug (bundled demo is v2 — use getDemoCurriculumV2)
export function getCurriculumBySlug(slug: string): Curriculum | null {
  if (isDemoCourseSlug(slug)) {
    return null;
  }
  const entry = remoteCurricula.find((curriculum) => curriculum.slug === slug);
  return (entry as Curriculum | undefined) || null;
}

// Helper to find the module containing a lesson and whether it's the last lesson in that module
export function getModuleInfoForLesson(
  lessonId: string,
  curriculum: Curriculum["curriculum"],
): {
  module: { id: string; title: string; lessons: Lesson[] };
  isLastLessonInModule: boolean;
  moduleTotalQuestions: number;
} | null {
  for (const mod of curriculum.modules) {
    const lessonIndex = mod.lessons.findIndex((l) => l.id === lessonId);
    if (lessonIndex !== -1) {
      const isLastLessonInModule = lessonIndex === mod.lessons.length - 1;
      const moduleTotalQuestions = mod.lessons.reduce(
        (sum, l) => sum + (l.questions?.length || 0),
        0,
      );
      return {
        module: mod,
        isLastLessonInModule,
        moduleTotalQuestions,
      };
    }
  }
  return null;
}

// Check if next_lesson_id points to a different module (vs next lesson in same module)
export function isNextModule(
  nextLessonId: string | null,
  curriculum: Curriculum["curriculum"],
): boolean {
  if (!nextLessonId) return true; // End of curriculum = end of module
  return curriculum.modules.some((m) => m.id === nextLessonId);
}

// Course `age`, `class`, `duration`, `level`, and `rating` live on each curriculum from the API.
// Card images are resolved from curriculum title via `src/utils/courseImage.ts`.
