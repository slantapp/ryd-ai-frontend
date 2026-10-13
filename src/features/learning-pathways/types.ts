import type { LearningBadgeIcon } from "@/api/learningStats";

export type PathNodeType =
  | "lesson"
  | "practice"
  | "story"
  | "build"
  | "chest"
  | "checkpoint";

/**
 * - `locked`: not reachable yet
 * - `current`: up next / in progress (lesson content not finished)
 * - `learned`: lesson content done, practice questions still pending
 * - `completed`: content and practice done
 */
export type PathNodeState = "completed" | "learned" | "current" | "locked";

export type UnitPalette = {
  /** Main fill for nodes and banner. */
  base: string;
  /** Darker shade used for the 3D "lip" under nodes. */
  shade: string;
  /** Pale tint for backgrounds and chips. */
  soft: string;
  /** Second gradient stop for the unit banner. */
  accent: string;
};

export type PathNode = {
  id: string;
  type: PathNodeType;
  title: string;
  description: string;
  /** Rough time to finish, in minutes. */
  minutes: number;
  /** Course (curriculum) slug this node opens; set for paths that come from the API. */
  slug?: string;
  /** Lesson position in its course (flat index across modules) and id. */
  flatIndex?: number;
  lessonId?: string;
  /** Short label shown above the title, e.g. "Module 2 · Lesson 3". */
  kindLabel?: string;
};

export type PathUnit = {
  id: string;
  title: string;
  description: string;
  palette: UnitPalette;
  nodes: PathNode[];
  /** "Unit N": set on the first course of each unit only, so the label isn't repeated. */
  sectionTitle?: string;
  /** Course (curriculum) slug when this unit is a course band. */
  courseSlug?: string;
};

export type Pathway = {
  id: string;
  title: string;
  language: string;
  /** Emoji-free icon key, resolved in the UI. */
  /** Icon key (see components/icons.ts PATHWAY_ICONS). */
  icon: string;
  palette: UnitPalette;
  units: PathUnit[];
};

export type Badge = {
  id: string;
  title: string;
  description: string;
  icon: LearningBadgeIcon;
  unlocked: boolean;
};
