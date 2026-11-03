import { cn } from "@/lib/utils";

/** Rounded filter chip (subcategories, filter options). */
export const chipClass = (on: boolean) =>
  cn(
    "inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition-colors",
    on
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-[#EDEAF3] bg-white text-[#132050]/75 hover:border-primary/25 hover:text-[#132050]",
  );

/** Width of a card inside a CardRail. */
export const RAIL_CARD_WIDTH = "w-[min(86vw,20.5rem)] shrink-0 snap-start sm:w-[22rem]";
