import { Code2, Link2, ListChecks, TextCursorInput, ToggleLeft } from "lucide-react";
import type { TestQuestionType } from "../types";

export const TYPE_META: Record<TestQuestionType, { label: string; icon: typeof Code2 }> = {
  code_prediction: { label: "Predict the output", icon: Code2 },
  multiple_choice: { label: "Multiple choice", icon: ListChecks },
  true_false: { label: "True or false", icon: ToggleLeft },
  fill_blank: { label: "Fill in the blank", icon: TextCursorInput },
  match_pairs: { label: "Match the pairs", icon: Link2 },
};

export type CardFeedback = {
  tone: "correct" | "incorrect" | "neutral";
  title: string;
  body?: string | null;
};

/** Option / chip colours shared by every card (guide: idle, correct, incorrect, dim, selected). */
export const VARIANT_CLASS = {
  idle: "border-[#ECE6F0] bg-white text-[#1F1B24] hover:border-primary/40 hover:bg-[#FBF5FC]",
  selected: "border-primary bg-[#FBF5FC] text-[#1F1B24] ring-2 ring-primary/20",
  correct: "border-[#16A34A] bg-[#ECFDF3] text-[#15803D]",
  incorrect: "border-[#DC2626] bg-[#FEF2F2] text-[#B91C1C]",
  dim: "border-[#ECE6F0] bg-[#FAFAFA] text-[#B7B2C0]",
} as const;

export type Variant = keyof typeof VARIANT_CLASS;
