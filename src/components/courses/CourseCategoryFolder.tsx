import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CourseCategory } from "@/data/courseCategories";
import { ChevronRight, type LucideIcon } from "lucide-react";

type CourseCategoryFolderProps = {
  category: CourseCategory;
  count: number;
  icon: LucideIcon;
  onOpen: () => void;
  /** Compact chip for dashboard horizontal scroll. */
  variant?: "default" | "compact";
  className?: string;
};

const CourseCategoryFolder = ({
  category,
  count,
  icon: Icon,
  onOpen,
  variant = "default",
  className,
}: CourseCategoryFolderProps) => {
  const countLabel = `${count} ${count === 1 ? "course" : "courses"}`;

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group flex h-full w-[9.5rem] shrink-0 flex-col rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm transition-all sm:w-auto",
          "hover:border-primary/30 hover:shadow-md active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          className,
        )}
      >
        <span className="mb-2.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/10">
          <Icon className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-solway text-sm font-semibold text-gray-900">
            {category.title}
          </span>
          <span className="mt-1 block truncate font-inter text-xs text-gray-500">
            {countLabel}
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex h-full w-full min-h-[8.5rem] text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      )}
    >
      <Card
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-0 shadow-sm",
          "transition-all duration-300 hover:border-primary/25 hover:shadow-md",
        )}
      >
        <CardContent className="flex h-full flex-col p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl",
                "bg-linear-to-br from-primary/15 via-primary/10 to-primary/5 text-primary",
                "ring-1 ring-primary/10 transition-transform duration-300 group-hover:scale-105",
              )}
            >
              <Icon className="size-5" strokeWidth={2} aria-hidden />
            </div>
            <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 font-inter text-[0.65rem] font-semibold text-gray-700 sm:text-xs">
              {countLabel}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className="truncate font-solway text-base font-bold leading-tight text-[#0A090B] sm:text-lg"
              title={category.title}
            >
              {category.title}
            </h3>
            <p
              className="mt-1.5 line-clamp-2 min-h-[2.5rem] font-inter text-xs leading-snug text-gray-600 sm:text-sm"
              title={category.subtitle}
            >
              {category.subtitle}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <span className="truncate font-inter text-xs font-medium text-primary/80 group-hover:text-primary">
              Browse courses
            </span>
            <ChevronRight
              className="size-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
              aria-hidden
            />
          </div>
        </CardContent>
      </Card>
    </button>
  );
};

export default CourseCategoryFolder;
