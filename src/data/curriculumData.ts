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
   * Text the program reads when it starts (`cin`, `input()`, `Scanner`, and the rest).
   * Fills the Input box under the editor. Omit it when the program reads nothing.
   */
  stdin?: string;
  /**
   * Seeded into the editor on student practice handoff (after the worked example).
   * Prefer a skeleton with comments — not the full solution.
   */
  starterCode?: string;
  /**
   * Optional companion code in another web-workspace pane (e.g. HTML to style when
   * `language` is `css`). Shown during demos and kept visible for practice.
   */
  supportingCode?: string;
  /** Language of `supportingCode` (defaults: html when language is css, css when html). */
  supportingLanguage?: string;
  /** `web` opens the page preview. Missing means the language runs on Judge0. */
  runtime?: "node" | "web";
  /** Page markup for a JavaScript lesson that runs in the preview. */
  html?: string;
  css?: string;
  starterHtml?: string;
  starterCss?: string;
  /** Panes the learner can read but not edit. */
  lockedTabs?: Array<"html" | "css" | "javascript">;
  /** Extra files sent with the program. The main `code` is the file that runs. */
  files?: Record<string, string>;
  /** Prefer a Judge0 runtime whose name contains this text. */
  version?: string;
  /** SQL statements that run before the learner query. */
  setupSql?: string;
  /** Replaces fetch for these paths inside the page preview. */
  mocks?: Record<string, unknown>;
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
  /**
   * Input for this question when it must differ from `code_example.stdin`.
   * When omitted, the example's `stdin` is used.
   */
  stdin?: string;
  testCriteria?: {
    expectedVariable?: string;
    expectedValue?: unknown;
    expectedValues?: unknown[];
    expectedFunction?: string;
    expectedHTML?: string;
    expectedCSS?: string;
    expectedJS?: string;
    expectedCode?: string;
    expectedOutput?: string;
    expectedRows?: string[][];
    tests?: Array<{ call: string; expect: string }>;
    domChecks?: Array<Record<string, unknown>>;
    turtleChecks?: import("@/utils/codeExecution/turtleChecks").TurtleCheck[];
    htmlChecks?: Array<Record<string, unknown>>;
    cssChecks?: Array<Record<string, unknown>>;
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
  /**
   * Optional subtitle phrase swaps for this lesson. The avatar still speaks
   * `avatar_script`; finished `say` islands render as `as` in the live subtitle.
   */
  avatar_show?: Array<{ say: string; as: string }>;
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
export function getFlatLessonIndex(
  lesson: Lesson,
  curriculum: Curriculum["curriculum"],
  preferredFlatIndex?: number,
): number {
  let index = 0;
  for (const mod of curriculum.modules) {
    for (const l of mod.lessons) {
      if (l === lesson) return index;
      index++;
    }
  }

  if (typeof preferredFlatIndex === "number" && preferredFlatIndex >= 0) {
    const atIndex = getLessonByIndex(preferredFlatIndex, curriculum);
    if (atIndex && atIndex.id === lesson.id) return preferredFlatIndex;
  }

  return -1;
}

export function getNextLessonInOrder(
  currentLesson: Lesson,
  curriculum: Curriculum["curriculum"],
  preferredFlatIndex?: number,
): Lesson | null {
  const flatIndex = getFlatLessonIndex(
    currentLesson,
    curriculum,
    preferredFlatIndex,
  );
  if (flatIndex < 0) return null;

  const total = curriculum.modules.reduce((sum, mod) => sum + mod.lessons.length, 0);
  if (flatIndex >= total - 1) return null;
  return getLessonByIndex(flatIndex + 1, curriculum);
}

// Get the previous lesson in curriculum order by flat index (not by ID).
// Use this to navigate backward through lessons/modules when IDs repeat.
export function getPreviousLessonInOrder(
  currentLesson: Lesson,
  curriculum: Curriculum["curriculum"],
  preferredFlatIndex?: number,
): Lesson | null {
  const flatIndex = getFlatLessonIndex(
    currentLesson,
    curriculum,
    preferredFlatIndex,
  );
  if (flatIndex <= 0) return null;
  return getLessonByIndex(flatIndex - 1, curriculum);
}

// Get the module index that contains this lesson. Uses flat index when IDs repeat.
export function getModuleIndexForLesson(
  lesson: Lesson,
  curriculum: Curriculum["curriculum"],
  preferredFlatIndex?: number,
): number {
  const flatIndex = getFlatLessonIndex(
    lesson,
    curriculum,
    preferredFlatIndex,
  );
  if (flatIndex < 0) return -1;

  let count = 0;
  for (let mi = 0; mi < curriculum.modules.length; mi++) {
    count += curriculum.modules[mi].lessons.length;
    if (flatIndex < count) return mi;
  }
  return -1;
}

// Flat index of lesson in curriculum (all modules, in order). Used for progress so we restore the right lesson when IDs repeat.
export function getLessonIndexInCurriculum(
  lesson: Lesson,
  curriculum: Curriculum["curriculum"],
  preferredFlatIndex?: number,
): number {
  return getFlatLessonIndex(lesson, curriculum, preferredFlatIndex);
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
  /** Numeric id from `/parent/curriculum/visible` when provided by the API. */
  curriculumId?: number;
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

/**
 * One course card from `/parent/curriculum/visible?view=summary`: card fields and counts,
 * with no modules or lessons. Load the full course with `GET /parent/curriculum/slug/:slug`.
 */
export type CurriculumSummary = {
  slug: string;
  curriculumId?: number;
  schema_version?: number;
  /** Last content edit (falls back to updatedAt); a newer value means a cached course is stale. */
  contentUpdatedAt?: string | null;
  curriculum: Pick<
    Curriculum["curriculum"],
    "title" | "description" | "language" | "category" | "age" | "class"
  > &
    Partial<
      Pick<Curriculum["curriculum"], "grade" | "duration" | "level" | "rating">
    >;
  moduleCount?: number;
  lessonCount?: number;
  questionCount?: number;
  totalMinutes?: number | null;
};

/** Course list (summaries) from `/parent/curriculum/visible?view=summary`. */
let remoteCurricula: CurriculumSummary[] = [];
/** Full courses loaded one at a time by slug (course player, learning paths). */
const fullCurricula = new Map<string, CurriculumEntry>();

function normalizeCurriculumId<T extends { curriculumId?: number }>(entry: T): T {
  const raw = entry as T & {
    id?: number;
    curriculum_id?: number;
  };
  const curriculumId =
    typeof entry.curriculumId === "number"
      ? entry.curriculumId
      : typeof raw.id === "number"
        ? raw.id
        : typeof raw.curriculum_id === "number"
          ? raw.curriculum_id
          : undefined;
  return curriculumId !== undefined ? { ...entry, curriculumId } : entry;
}

export function setRemoteCurricula(curricula: CurriculumSummary[]): void {
  remoteCurricula = curricula.map(normalizeCurriculumId);
}

/** Stores a full course from `GET /parent/curriculum/slug/:slug`. */
export function setFullCurriculum(entry: CurriculumEntry): void {
  fullCurricula.set(entry.slug, normalizeCurriculumId(entry));
}

export function getCurriculumSummaryBySlug(slug: string): CurriculumSummary | null {
  return remoteCurricula.find((curriculum) => curriculum.slug === slug) || null;
}

/** Resolves the API curriculum id for feedback and other parent endpoints. */
export function getCurriculumIdBySlug(slug: string): number | null {
  const id =
    getCurriculumSummaryBySlug(slug)?.curriculumId ??
    fullCurricula.get(slug)?.curriculumId;
  return typeof id === "number" && Number.isFinite(id) ? id : null;
}

export function getCourseTitleBySlug(slug: string): string {
  const entry = getCurriculumSummaryBySlug(slug) ?? getCurriculumEntryBySlug(slug);
  if (!entry) return slug;
  const data = entry.curriculum as { title?: string };
  return typeof data.title === "string" && data.title.trim()
    ? data.title.trim()
    : slug;
}

/** Visible course list from the API (card fields and counts only, no lessons). */
export function getCurriculumSummaries(): CurriculumSummary[] {
  return remoteCurricula;
}

/** True when the full course is loaded and not older than the list says. */
export function isFullCurriculumFresh(slug: string): boolean {
  const full = fullCurricula.get(slug) as
    | (CurriculumEntry & { contentUpdatedAt?: string | null; updatedAt?: string | null })
    | undefined;
  if (!full) return false;
  const listed = getCurriculumSummaryBySlug(slug)?.contentUpdatedAt;
  if (!listed) return true;
  const loaded = full.contentUpdatedAt ?? full.updatedAt;
  return !loaded || new Date(loaded).getTime() >= new Date(listed).getTime();
}

/**
 * Full course by slug: the bundled demo, or a course already loaded with `ensureCurriculum`.
 * Returns null until the course is loaded; list summaries are never returned here.
 */
export function getCurriculumEntryBySlug(slug: string): CurriculumEntry | null {
  if (isDemoCourseSlug(slug)) {
    return getDemoCurriculumV2();
  }
  return fullCurricula.get(slug) ?? null;
}

// Helper function to get curriculum by slug (bundled demo is v2 — use getDemoCurriculumV2)
export function getCurriculumBySlug(slug: string): Curriculum | null {
  if (isDemoCourseSlug(slug)) {
    return null;
  }
  return (fullCurricula.get(slug) as Curriculum | undefined) ?? null;
}

// Helper to find the module containing a lesson and whether it's the last lesson in that module
export function getModuleInfoForLesson(
  lessonId: string,
  curriculum: Curriculum["curriculum"],
  preferredFlatIndex?: number,
): {
  module: { id: string; title: string; lessons: Lesson[] };
  isLastLessonInModule: boolean;
  moduleTotalQuestions: number;
} | null {
  if (typeof preferredFlatIndex === "number" && preferredFlatIndex >= 0) {
    const flatLesson = getLessonByIndex(preferredFlatIndex, curriculum);
    if (flatLesson?.id === lessonId) {
      let count = 0;
      for (const mod of curriculum.modules) {
        const lessonIndex = preferredFlatIndex - count;
        if (lessonIndex >= 0 && lessonIndex < mod.lessons.length) {
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
        count += mod.lessons.length;
      }
    }
  }

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

export interface CourseDurationMeta {
  /** Free-text estimate from the curriculum, e.g. "6 weeks". Never invented. */
  duration?: string;
  lessonCount?: number;
  /** Sum of v2 `estimated_minutes`; only set when at least one lesson has it. */
  totalMinutes?: number;
}

type DurationSource = {
  duration?: string;
  // v1 lessons have no estimated_minutes; v2 lessons may.
  modules?: ReadonlyArray<{ lessons?: ReadonlyArray<object> }>;
};

/** Duration, lesson count and lesson minutes for the start / continue gate (v1, v2 and maths). */
export function getCourseDurationMeta(curriculum: DurationSource | null | undefined): CourseDurationMeta {
  if (!curriculum) return {};
  const duration = typeof curriculum.duration === "string" ? curriculum.duration.trim() : "";
  let lessonCount = 0;
  let totalMinutes = 0;
  for (const mod of curriculum.modules ?? []) {
    for (const lesson of mod?.lessons ?? []) {
      lessonCount++;
      const minutes = Number((lesson as { estimated_minutes?: unknown }).estimated_minutes);
      if (Number.isFinite(minutes) && minutes > 0) totalMinutes += minutes;
    }
  }
  return {
    duration: duration || undefined,
    lessonCount: lessonCount || undefined,
    totalMinutes: totalMinutes ? Math.round(totalMinutes) : undefined,
  };
}

/** "3 h 20 min", "45 min". */
export function formatLessonMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
