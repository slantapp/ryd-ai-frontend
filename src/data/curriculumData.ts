import beginnerDetailed from "./beginner_detailed.json";
import htmlcssJavascriptCurriculum from "./htmlcss-jacascript-curriculum.json";
import intermediateDetailed from "./intermediate_detailed.json";
import professionalDetailed from "./professional_detailed.json";
import pythonBeginner from "./python-beginner.json";
import pythonIntermediate from "./python-intermediate.json";
import pythonAdvance from "./python-advance.json";
import cssFlexGridLessons from "./css_flex_grid_lessons.json";
import webDevelopmentBasics from "./web-development-basics.json";
import cssBasics from "./css-basics.json";
import htmlCssCombined from "./html-css-combined.json";
import grade9Maths from "./grade9-maths.json";

export interface FormulaExample {
  formula: string;
  subject?: string;
  description?: string;
  explanation?: string;
  autoRun?: boolean;
  typingSpeed?: number;
}

export interface Question {
  id?: string;
  type: "multiple_choice" | "true_false" | "code_test" | "formula_test";
  question: string;
  options?: string[];
  answer?: string | boolean;
  explanation?: string;
  code_example?: {
    code: string;
    language: string;
    description?: string;
    explanation?: string;
    autoRun?: boolean;
    typingSpeed?: number;
  };
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
  /** Lesson-level worked example for mathematics curricula. */
  formula_example?: FormulaExample;
  questions: Question[];
  next_lesson_id: string | null;
}

/** Category for grouping courses in the library folder view. */
export type CurriculumCategory =
  | "coding"
  | "design"
  | "data"
  | "careers"
  | "mathematics";

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

// Helper function to get curriculum by slug
export function getCurriculumBySlug(slug: string): Curriculum | null {
  return curriculaData.find((curriculum) => curriculum.slug === slug) || null;
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

// Course `age` and `class` live on each curriculum object in JSON / `curriculaData`.
// Images, duration, level, and rating remain in `defaultCourseMetadata` in coursesStore.

export const curriculaData: Curriculum[] = [
  webDevelopmentBasics as Curriculum,
  cssBasics as Curriculum,
  htmlCssCombined as Curriculum,
  beginnerDetailed as Curriculum,
  htmlcssJavascriptCurriculum as Curriculum,
  intermediateDetailed as Curriculum,
  professionalDetailed as Curriculum,
  pythonBeginner as Curriculum,
  pythonIntermediate as Curriculum,
  pythonAdvance as Curriculum,
  cssFlexGridLessons as Curriculum,
  grade9Maths as Curriculum,
];

// Legacy export for backward compatibility (uses first curriculum)
export const curriculumData = curriculaData[0];
