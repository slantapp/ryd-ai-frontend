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
      <Card className="h-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-primary/25 hover:shadow-md p-0">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
          <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary sm:size-16">
            <FolderOpen
              className="pointer-events-none absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 text-primary/15 sm:size-14"
              strokeWidth={1.25}
              aria-hidden
            />
            <Icon className="relative z-10 size-7 sm:size-8" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-solway text-lg font-bold text-[#0A090B] sm:text-xl">
                {category.title}
              </h3>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-inter text-xs font-semibold text-gray-700">
                {count} {count === 1 ? "course" : "courses"}
              </span>
            </div>
            <p className="mt-1.5 font-inter text-sm leading-snug text-gray-600">
              {category.subtitle}
            </p>
          </div>
          <ChevronRight
            className="size-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary sm:size-6"
            aria-hidden
          />
        </CardContent>
      </Card>
    </button>
  );
};

export default CourseCategoryFolder;
