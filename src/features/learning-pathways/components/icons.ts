import {
  Atom,
  Blocks,
  BookOpen,
  Bot,
  Braces,
  Brain,
  Calculator,
  CalendarCheck,
  Camera,
  ChartLine,
  Clapperboard,
  Cloud,
  Code,
  Cpu,
  Database,
  Dna,
  Dumbbell,
  Flame,
  FlaskConical,
  Footprints,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Hammer,
  Languages,
  Leaf,
  Lightbulb,
  Map as MapIcon,
  Microscope,
  Music,
  Palette,
  Pencil,
  PenTool,
  Puzzle,
  Rocket,
  Shapes,
  ShieldCheck,
  Sigma,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Telescope,
  Terminal,
  Trophy,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Badge, PathNodeType } from "../types";

export const NODE_ICONS: Record<PathNodeType, LucideIcon> = {
  lesson: Star,
  practice: Dumbbell,
  story: BookOpen,
  build: Hammer,
  chest: Gift,
  checkpoint: Trophy,
};

export const NODE_LABELS: Record<PathNodeType, string> = {
  lesson: "Lesson",
  practice: "Practice",
  story: "Story",
  build: "Build project",
  chest: "Reward",
  checkpoint: "Checkpoint",
};

/**
 * Path icons by key. The keys match the API (models/model.learning_path.js: LEARNING_PATH_ICONS)
 * and the admin icon picker (src/pages/ManageAi/LearningPathMetaFields.js), which shows these same icons.
 */
export const PATHWAY_ICONS = {
  // Coding & tech
  python: Terminal,
  web: Globe,
  code: Code,
  braces: Braces,
  database: Database,
  cpu: Cpu,
  cloud: Cloud,
  smartphone: Smartphone,
  shield: ShieldCheck,
  blocks: Blocks,
  wrench: Wrench,
  // AI
  ai: Bot,
  brain: Brain,
  sparkles: Sparkles,
  // Creative & games
  game: Gamepad2,
  puzzle: Puzzle,
  palette: Palette,
  music: Music,
  camera: Camera,
  film: Clapperboard,
  pen: PenTool,
  shapes: Shapes,
  pencil: Pencil,
  // Maths & science
  calculator: Calculator,
  sigma: Sigma,
  chart: ChartLine,
  atom: Atom,
  flask: FlaskConical,
  microscope: Microscope,
  dna: Dna,
  telescope: Telescope,
  leaf: Leaf,
  map: MapIcon,
  // General
  book: BookOpen,
  languages: Languages,
  lightbulb: Lightbulb,
  rocket: Rocket,
  trophy: Trophy,
  graduation: GraduationCap,
  star: Star,
} satisfies Record<string, LucideIcon>;

export type PathwayIconKey = keyof typeof PATHWAY_ICONS;

/** Icon for a path; a key this app doesn't know yet (newer admin) shows a graduation cap. */
export function pathwayIcon(key: string): LucideIcon {
  return (PATHWAY_ICONS as Record<string, LucideIcon>)[key] ?? GraduationCap;
}

export const BADGE_ICONS: Record<Badge["icon"], LucideIcon> = {
  footprints: Footprints,
  flame: Flame,
  calendar: CalendarCheck,
  trophy: Trophy,
  target: Target,
  graduation: GraduationCap,
};
