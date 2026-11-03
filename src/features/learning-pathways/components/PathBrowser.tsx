import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ApiLearningPath, ApiLearningPathBrowseCategory } from "@/api/learningPaths";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ActiveChip,
  CardRail,
  CategoryTabs,
  FiltersPopover,
  TopicChips,
} from "@/components/browse/BrowseControls";
import { RAIL_CARD_WIDTH } from "@/components/browse/browseStyles";
import { pathwayIcon } from "./icons";
import type { PathProgress } from "../lessonProgress";
import { pathwayId } from "../fromApi";

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

type ProgressFilter = "all" | "not_started" | "in_progress" | "completed";

type PathBrowserProps = {
  categories: ApiLearningPathBrowseCategory[];
  progressByPath: Record<string, PathProgress>;
  onOpenPath: (pathwayId: string) => void;
};

type CardModel = {
  pathwayId: string;
  api: ApiLearningPath;
  categoryTitle: string;
  subcategoryTitle: string;
  level: string | null;
  lessonCount: number;
  blurb: string;
  percent: number;
  started: boolean;
  completed: boolean;
};

function formatLevel(level: string | null | undefined) {
  if (!level) return null;
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function lessonCount(path: ApiLearningPath) {
  return path.units.reduce(
    (n, u) => n + u.steps.reduce((m, s) => m + (s.lessonCount || 0), 0),
    0,
  );
}

function blurbFor(path: ApiLearningPath) {
  const step = path.units.flatMap((u) => u.steps).find((s) => s.description?.trim());
  if (step?.description?.trim()) return step.description.trim();
  const lessons = lessonCount(path);
  if (lessons > 0) return `${lessons} lesson${lessons === 1 ? "" : "s"} across this path.`;
  return "A guided sequence of courses.";
}

function buildCards(
  categories: ApiLearningPathBrowseCategory[],
  progressByPath: Record<string, PathProgress>,
): CardModel[] {
  const out: CardModel[] = [];
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      for (const path of sub.paths) {
        const id = pathwayId(path.id);
        const progress = progressByPath[id];
        const percent = progress?.percent ?? 0;
        const completed =
          !!progress && progress.totalCount > 0 && progress.completedCount === progress.totalCount;
        const started = percent > 0 || (progress?.completedCount ?? 0) > 0;
        out.push({
          pathwayId: id,
          api: path,
          categoryTitle: cat.title,
          subcategoryTitle: sub.title,
          level: path.level ?? null,
          lessonCount: lessonCount(path),
          blurb: blurbFor(path),
          percent,
          started,
          completed,
        });
      }
    }
  }
  return out;
}

export function PathBrowser({ categories, progressByPath, onOpenPath }: PathBrowserProps) {
  const allCards = useMemo(() => buildCards(categories, progressByPath), [categories, progressByPath]);

  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [categoryId, setCategoryId] = useState<number | null>(categories[0]?.id ?? null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);

  const activeCategory = categories.find((c) => c.id === categoryId) ?? categories[0] ?? null;
  const topicChips = activeCategory?.subcategories ?? [];

  const continueCard = useMemo(() => {
    const started = allCards.filter((c) => c.started && !c.completed);
    if (!started.length) return null;
    return [...started].sort((a, b) => b.percent - a.percent)[0];
  }, [allCards]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeCat = categories.find((c) => c.id === categoryId) ?? categories[0];
    const allowedIds = new Set<number>();
    if (activeCat) {
      for (const sub of activeCat.subcategories) {
        if (subcategoryId != null && sub.id !== subcategoryId) continue;
        for (const p of sub.paths) allowedIds.add(p.id);
      }
    }
    return allCards.filter((card) => {
      if (activeCat && !allowedIds.has(card.api.id)) return false;
      if (levelFilter && card.level !== levelFilter) return false;
      if (progressFilter === "not_started" && card.started) return false;
      if (progressFilter === "in_progress" && (!card.started || card.completed)) return false;
      if (progressFilter === "completed" && !card.completed) return false;
      if (q) {
        const hay =
          `${card.api.title} ${card.subcategoryTitle} ${card.categoryTitle} ${card.blurb} ${card.level ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allCards, categoryId, subcategoryId, levelFilter, progressFilter, query, categories]);

  // The API sends subcategories in the admin's order and each subcategory's paths by level, then
  // the admin's order. "All" keeps that: one row per subcategory, in the same order as the chips.
  // One subcategory: one row per level (Beginner → Advanced).
  const groups = useMemo(() => {
    const map = new Map<string, CardModel[]>();
    for (const card of filtered) {
      const key = subcategoryId ? card.level || "Paths" : card.subcategoryTitle;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    const rows = [...map.entries()].map(([title, items]) => ({
      title: subcategoryId ? formatLevel(title) || title : title,
      key: title,
      items,
    }));
    if (!subcategoryId) return rows;
    const levelOrder: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
    return rows.sort((a, b) => (levelOrder[a.key] ?? 50) - (levelOrder[b.key] ?? 50));
  }, [filtered, subcategoryId]);

  const activeFilterCount = (levelFilter ? 1 : 0) + (progressFilter !== "all" ? 1 : 0);
  const searchPlaceholder = activeCategory?.example
    ? `Try ${activeCategory.example}`
    : "Search paths…";

  const clearFilters = () => {
    setLevelFilter(null);
    setProgressFilter("all");
  };

  const clearAll = () => {
    setQuery("");
    clearFilters();
    setSubcategoryId(null);
  };

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3 font-inter text-[#132050] sm:gap-4">
      {/* Header + compact search (matches Courses Collection) */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="app-type-eyebrow mb-1">Learning Path</p>
          <h1 className="app-type-page-title">Choose a path</h1>
          <p className="app-type-page-subtitle mt-1.5">
            Pick a path, take a quick look inside, and start.
          </p>
        </div>
        <div className="relative flex w-full items-center gap-2 sm:max-w-xs lg:max-w-sm">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#132050]/35"
              aria-hidden
            />
            <Input
              id="lp-browse-q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Search paths"
              className="h-9 rounded-md border border-[#EDEAF3] bg-[#F8F8FA] pl-8 font-inter text-sm shadow-none transition-colors focus-visible:border-primary/25 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
          <FiltersPopover
            activeCount={activeFilterCount}
            resultCount={filtered.length}
            onReset={clearFilters}
            sections={[
              {
                label: "Level",
                options: LEVELS.map((l) => ({ value: l.value, label: l.label })),
                value: levelFilter ?? "",
                onChange: (v) => setLevelFilter(levelFilter === v ? null : v),
              },
              {
                label: "Progress",
                options: [
                  { value: "all", label: "All" },
                  { value: "not_started", label: "Not started" },
                  { value: "in_progress", label: "In progress" },
                  { value: "completed", label: "Completed" },
                ],
                value: progressFilter,
                onChange: (v) => setProgressFilter(v as ProgressFilter),
              },
            ]}
          />
        </div>
      </div>

      {continueCard && (
        <section
          aria-label="Continue learning"
          className="flex flex-col gap-3 rounded-xl border border-[#EDEAF3] bg-white p-3 shadow-[0_1px_2px_rgba(19,32,80,0.04)] sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-[#5C5468]">Continue where you left off</p>
            <p className="mt-0.5 truncate font-solway text-sm font-bold text-[#132050]">
              {continueCard.api.title}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 max-w-[9rem] flex-1 overflow-hidden rounded-full bg-[#F3ECFE] sm:max-w-[11rem]">
                <div
                  className="h-1.5 min-w-1 rounded-full bg-primary"
                  style={{ width: `${Math.max(4, continueCard.percent)}%` }}
                />
              </div>
              <span className="text-[11px] font-medium tabular-nums text-[#5C5468]">
                {continueCard.percent}%
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenPath(continueCard.pathwayId)}
            className="inline-flex h-9 w-full shrink-0 items-center justify-center rounded-full bg-primary px-5 font-solway text-sm font-bold text-white sm:w-auto"
          >
            Resume
          </button>
        </section>
      )}

      <section aria-label="Browse paths" className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-2.5">
          <CategoryTabs
            options={categories.map((cat) => ({ value: String(cat.id), label: cat.title }))}
            value={activeCategory ? String(activeCategory.id) : null}
            onChange={(value) => {
              setCategoryId(Number(value));
              setSubcategoryId(null);
            }}
          />

          <TopicChips
            key={activeCategory?.id ?? "none"}
            options={topicChips.map((sub) => ({ value: String(sub.id), label: sub.title }))}
            value={subcategoryId == null ? null : String(subcategoryId)}
            onChange={(value) => setSubcategoryId(value == null ? null : Number(value))}
          />

          {(levelFilter || progressFilter !== "all" || subcategoryId != null || query) && (
            <div className="flex flex-wrap gap-1.5">
              {query && <ActiveChip label={`“${query}”`} onClear={() => setQuery("")} />}
              {subcategoryId != null && (
                <ActiveChip
                  label={topicChips.find((t) => t.id === subcategoryId)?.title || "Topic"}
                  onClear={() => setSubcategoryId(null)}
                />
              )}
              {levelFilter && (
                <ActiveChip label={formatLevel(levelFilter)!} onClear={() => setLevelFilter(null)} />
              )}
              {progressFilter !== "all" && (
                <ActiveChip
                  label={
                    progressFilter === "not_started"
                      ? "Not started"
                      : progressFilter === "in_progress"
                        ? "In progress"
                        : "Completed"
                  }
                  onClear={() => setProgressFilter("all")}
                />
              )}
            </div>
          )}
        </div>

        {!filtered.length ? (
          <div className="rounded-xl border border-dashed border-[#EDEAF3] px-4 py-12 text-center text-sm text-[#5C5468]">
            No paths match that. Try another word, or{" "}
            <button
              type="button"
              onClick={clearAll}
              className="font-semibold text-primary underline underline-offset-2"
            >
              clear everything
            </button>
            .
          </div>
        ) : (
          groups.map((group) => (
            <CardRail key={group.key} title={group.title} count={group.items.length} noun="path">
              {group.items.map((item) => (
                <PathCard key={item.pathwayId} item={item} onOpen={() => onOpenPath(item.pathwayId)} />
              ))}
            </CardRail>
          ))
        )}
      </section>
    </div>
  );
}

function PathCard({ item, onOpen }: { item: CardModel; onOpen: () => void }) {
  const Icon = pathwayIcon(item.api.icon);
  return (
    <button
      type="button"
      aria-label={`Open ${item.api.title}`}
      onClick={onOpen}
      className={cn(
        RAIL_CARD_WIDTH,
        "relative flex flex-col gap-2 rounded-2xl border bg-white p-4 text-left shadow-[0_1px_3px_rgba(19,32,80,0.05)] transition-all",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-10px_rgba(170,70,142,0.28)]",
        item.started ? "border-primary/45" : "border-[#EDEAF3]",
      )}
    >
      <span
        className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary"
        aria-hidden
      >
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
      <span className="pr-10 text-[11px] font-semibold tracking-wide text-[#5C5468]">
        {item.subcategoryTitle}
        {item.level ? ` · ${formatLevel(item.level)}` : ""}
      </span>
      <span className="line-clamp-2 pr-2 font-solway text-[15px] font-bold leading-snug text-[#132050] sm:text-base">
        {item.api.title}
      </span>
      <span className="line-clamp-2 text-xs leading-relaxed text-[#5C5468] sm:text-[13px]">
        {item.blurb}
      </span>
      <span className="mt-auto pt-1">
        {item.started ? (
          <span className="flex w-full items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F3ECFE]">
              <span
                className="block h-1.5 min-w-1 rounded-full bg-primary"
                style={{ width: `${Math.max(4, item.percent)}%` }}
              />
            </span>
            <span className="text-[11px] font-bold tabular-nums text-[#5E1352]">{item.percent}%</span>
          </span>
        ) : (
          <span className="text-[11px] font-medium text-[#5C5468]">
            {item.lessonCount > 0
              ? `${item.lessonCount} lesson${item.lessonCount === 1 ? "" : "s"}`
              : "Not started"}
          </span>
        )}
      </span>
    </button>
  );
}
