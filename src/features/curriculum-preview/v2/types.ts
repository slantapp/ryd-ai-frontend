import type {
  CodeExample,
  FormulaExample,
  CurriculumCategory,
  CurriculumLevel,
  Question,
} from "../types";

export type { CodeExample, FormulaExample, Question };

export type BeatAdvance = "auto" | "manual" | "on_answer";

export type BeatPhase = "hook" | "teach" | "assess" | "practice" | "reflect";

export type BeatType =
  | "speak"
  | "display"
  | "media"
  | "code_demo"
  | "formula_demo"
  | "question"
  | "pause"
  | "recap"
  | "bridge";

export interface QuestionRetry {
  /** Wrong attempts allowed before advancing (default in student sim: 2). */
  max?: number;
  /** Spoken after a wrong answer when retries remain. */
  hint?: string;
  /** After retries exhausted: continue to next beat (default). */
  on_exhausted?: "continue";
}

/** Swap a spoken island in the live subtitle without changing TTS. */
export interface AvatarShowReplacement {
  /** Exact phrase as it appears in the spoken line (e.g. "2 times 3"). */
  say: string;
  /** What learners should read in the subtitle (e.g. "2 × 3"). */
  as: string;
}

export interface BeatAvatarLines {
  text?: string;
  /**
   * Phrase swaps for the live subtitle. The avatar still speaks `text`;
   * when a `say` phrase is fully spoken, the subtitle shows `as` instead.
   */
  show?: AvatarShowReplacement[];
  timing?: "with_display" | "before_display" | "after_display";
  on_ask?: string;
  on_correct?: string;
  on_wrong?: string;
  before_demo?: string;
  handoff?: string;
}

interface BeatBase {
  id: string;
  phase?: BeatPhase;
  advance: BeatAdvance;
  avatar?: BeatAvatarLines;
}

export interface SpeakBeat extends BeatBase {
  type: "speak";
  avatar: BeatAvatarLines & { text: string };
}

export interface DisplayBeat extends BeatBase {
  type: "display";
  title?: string;
  body: string;
  /**
   * When false, show body on screen but do not read the full body aloud
   * (avatar.text / title only). Default: true (student-friendly authors should set false for long bodies).
   */
  speak_body?: boolean;
}

export interface MediaBeat extends BeatBase {
  type: "media";
  media: {
    image?: string;
    video?: string;
    alt?: string;
  };
}

export interface CodeDemoBeat extends BeatBase {
  type: "code_demo";
  code_example: CodeExample;
}

export interface FormulaDemoBeat extends BeatBase {
  type: "formula_demo";
  formula_example: FormulaExample;
}

export interface QuestionBeat extends BeatBase {
  type: "question";
  question: Question;
  advance: "on_answer";
  /** Student retry loop — wrong answers stay on the beat until max attempts. */
  retry?: QuestionRetry;
}

export interface PauseBeat extends BeatBase {
  type: "pause";
  min_seconds?: number;
  advance: "manual";
  /** Keep previous demo/example visible (default true when previous beat was a demo). */
  keep_previous?: boolean;
}

export interface RecapBeat extends BeatBase {
  type: "recap";
  points: string[];
}

export interface BridgeBeat extends BeatBase {
  type: "bridge";
  next: string | null;
}

export type Beat =
  | SpeakBeat
  | DisplayBeat
  | MediaBeat
  | CodeDemoBeat
  | FormulaDemoBeat
  | QuestionBeat
  | PauseBeat
  | RecapBeat
  | BridgeBeat;

export interface LessonV2 {
  id: string;
  title: string;
  goal?: string;
  estimated_minutes?: number;
  flow: Beat[];
}

export interface ModuleUnlock {
  requires: string;
}

export interface ModuleV2 {
  id: string;
  title: string;
  unlock?: ModuleUnlock | null;
  lessons: LessonV2[];
}

export interface AvatarDefaults {
  intro_template?: string;
  continue_prompt?: string;
  start_questions_prompt?: string;
  handoff_to_practice?: string;
  lesson_complete_template?: string;
  correct_feedback?: string;
  incorrect_feedback?: string;
}

export interface CurriculumDefaults {
  avatar?: AvatarDefaults;
  advance?: {
    pause_min_seconds?: number;
  };
  /** Default student retry policy when a question beat omits `retry`. */
  question_retry?: QuestionRetry;
}

export interface CurriculumV2Data {
  title: string;
  description: string;
  language: string;
  category: CurriculumCategory;
  age: number;
  class: string;
  grade?: number;
  duration?: string;
  level?: CurriculumLevel;
  rating?: number;
  defaults?: CurriculumDefaults;
  modules: ModuleV2[];
}

export interface CurriculumV2 {
  slug: string;
  schema_version: 2;
  curriculum: CurriculumV2Data;
}

export type PreviewLoadResult =
  | { version: 1; data: import("../types").CurriculumData; file: File }
  | { version: 2; data: CurriculumV2Data; file: File; slug?: string };
