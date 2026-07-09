import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CourseCategory } from "@/data/courseCategories";
import { ChevronRight, FolderOpen, type LucideIcon } from "lucide-react";

type CourseCategoryFolderProps = {
  category: CourseCategory;
  count: number;
  icon: LucideIcon;
  onOpen: () => void;
};

const CourseCategoryFolder = ({
  category,
  count,
  icon: Icon,
  onOpen,
}: CourseCategoryFolderProps) => {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group w-full text-left transition-transform duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
    >
      <Card className="h-full overflow-hidden rounded-2xl border border-gray-100 bg-white p-0 shadow-sm transition-all duration-300 hover:border-primary/25 hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
          <div
            className={cn(
              "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary",
              "size-10 sm:size-12",
            )}
          >
            <FolderOpen
              className="pointer-events-none absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-primary/12 sm:size-8"
              strokeWidth={1.25}
              aria-hidden
            />
            <Icon
              className="relative z-10 size-4 sm:size-5"
              strokeWidth={2}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-solway text-base font-bold leading-tight text-[#0A090B] sm:text-lg">
                {category.title}
              </h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-inter text-[0.65rem] font-semibold text-gray-700 sm:text-xs">
                {count} {count === 1 ? "course" : "courses"}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 font-inter text-xs leading-snug text-gray-600 sm:text-sm">
              {category.subtitle}
            </p>
          </div>
          <ChevronRight
            className="size-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary sm:size-5"
            aria-hidden
          />
        </CardContent>
      </Card>
    </button>
  );
};

export default CourseCategoryFolder;
