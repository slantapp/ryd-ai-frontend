import {
  BookOpen,
  Bot,
  CalendarCheck,
  Dumbbell,
  Flame,
  Footprints,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Hammer,
  Star,
  Target,
  Terminal,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { Badge, PathNodeType, Pathway } from "../types";

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

export const PATHWAY_ICONS: Record<Pathway["icon"], LucideIcon> = {
  python: Terminal,
  web: Globe,
  game: Gamepad2,
  ai: Bot,
};

export const BADGE_ICONS: Record<Badge["icon"], LucideIcon> = {
  footprints: Footprints,
  flame: Flame,
  calendar: CalendarCheck,
  trophy: Trophy,
  target: Target,
  graduation: GraduationCap,
};
