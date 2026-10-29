import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Filter, Search, X } from "lucide-react";
import type { ApiLearningPath, ApiLearningPathBrowseCategory } from "@/api/learningPaths";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [categoryId, setCategoryId] = useState<number | null>(categories[0]?.id ?? null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [topicQuery, setTopicQuery] = useState("");
  const filtersRef = useRef<HTMLDivElement>(null);
  const topicsRef = useRef<HTMLDivElement>(null);

  // Close filter / “More topics” popovers on outside click or Escape.
  useEffect(() => {
    if (!filtersOpen && !topicsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (filtersOpen && filtersRef.current && !filtersRef.current.contains(target)) {
        setFiltersOpen(false);
      }
      if (topicsOpen && topicsRef.current && !topicsRef.current.contains(target)) {
        setTopicsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setFiltersOpen(false);
      setTopicsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filtersOpen, topicsOpen]);

  const activeCategory = categories.find((c) => c.id === categoryId) ?? categories[0] ?? null;
  const topicChips = activeCategory?.subcategories ?? [];
  const visibleTopics = topicChips.slice(0, 5);
  const hasMoreTopics = topicChips.length > 5;

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

  const groups = useMemo(() => {
    const map = new Map<string, CardModel[]>();
    for (const card of filtered) {
      const key = subcategoryId ? card.level || "Paths" : card.subcategoryTitle;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    const levelOrder: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
    return [...map.entries()]
      .map(([title, items]) => ({
        title: formatLevel(title) || title,
        items: [...items].sort(
          (a, b) =>
            (levelOrder[a.level ?? ""] ?? 99) - (levelOrder[b.level ?? ""] ?? 99) ||
            a.api.title.localeCompare(b.api.title),
        ),
      }))
      .sort((a, b) => {
        const la = levelOrder[a.title.toLowerCase()] ?? 50;
        const lb = levelOrder[b.title.toLowerCase()] ?? 50;
        return la - lb || a.title.localeCompare(b.title);
      });
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

  const chipOn = (on: boolean) =>
    cn(
      "inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition-colors",
      on
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-[#EDEAF3] bg-white text-[#132050]/75 hover:border-primary/25 hover:text-[#132050]",
    );

  const topicList = topicChips.filter(
    (t) => !topicQuery.trim() || t.title.toLowerCase().includes(topicQuery.trim().toLowerCase()),
  );

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
          <div className="relative shrink-0" ref={filtersRef}>
            <button
              type="button"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((o) => !o)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md border border-[#EDEAF3] bg-[#F8F8FA] px-2.5 text-xs font-semibold text-[#132050]/75 shadow-none transition-colors hover:bg-white",
                activeFilterCount > 0 && "border-primary/30 bg-primary/5 text-primary",
              )}
            >
              <Filter className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">
                {activeFilterCount ? `Filters · ${activeFilterCount}` : "Filters"}
              </span>
              {activeFilterCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white sm:hidden">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {filtersOpen && (
              <div
                role="dialog"
                aria-label="Filters"
                className="absolute right-0 top-10 z-30 flex w-[min(18rem,calc(100vw-2rem))] flex-col gap-3 rounded-xl border border-[#EDEAF3] bg-white p-3 shadow-[0_12px_28px_rgba(19,32,80,0.12)]"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="app-type-label">Level</span>
                  <div className="flex flex-wrap gap-1.5">
                    {LEVELS.map((lvl) => {
                      const on = levelFilter === lvl.value;
                      return (
                        <button
                          key={lvl.value}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setLevelFilter(on ? null : lvl.value)}
                          className={chipOn(on)}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="app-type-label">Progress</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["all", "All"],
                        ["not_started", "Not started"],
                        ["in_progress", "In progress"],
                        ["completed", "Completed"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={progressFilter === value}
                        onClick={() => setProgressFilter(value)}
                        className={chipOn(progressFilter === value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-8 px-1 text-xs font-semibold text-primary"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="inline-flex h-8 items-center rounded-full bg-[#132050] px-3.5 text-xs font-semibold text-white"
                  >
                    Show {filtered.length}
                  </button>
                </div>
              </div>
            )}
          </div>
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
          <div className="min-w-0 overflow-x-auto border-b border-[#EDEAF3] [-webkit-overflow-scrolling:touch] scrollbar-hide">
            <div role="tablist" aria-label="Category" className="flex min-w-min gap-4 sm:gap-6">
              {categories.map((cat) => {
                const on = activeCategory?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => {
                      setCategoryId(cat.id);
                      setSubcategoryId(null);
                      setTopicsOpen(false);
                    }}
                    className={cn(
                      "mb-[-1px] shrink-0 border-0 border-b-2 bg-transparent pb-2.5 pt-1 text-sm whitespace-nowrap transition-colors",
                      on
                        ? "border-primary font-solway font-bold text-[#132050]"
                        : "border-transparent font-medium text-[#132050]/55 hover:text-[#132050]",
                    )}
                  >
                    {cat.title}
                  </button>
                );
              })}
            </div>
          </div>

          {!!topicChips.length && (
            <div className="relative flex min-w-0 items-center gap-1.5" ref={topicsRef}>
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] scrollbar-hide">
                <button
                  type="button"
                  aria-pressed={subcategoryId == null}
                  onClick={() => setSubcategoryId(null)}
                  className={chipOn(subcategoryId == null)}
                >
                  All
                </button>
                {visibleTopics.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    aria-pressed={subcategoryId === sub.id}
                    onClick={() => setSubcategoryId(subcategoryId === sub.id ? null : sub.id)}
                    className={chipOn(subcategoryId === sub.id)}
                  >
                    {sub.title}
                  </button>
                ))}
                {hasMoreTopics && (
                  <button
                    type="button"
                    aria-expanded={topicsOpen}
                    onClick={() => setTopicsOpen((o) => !o)}
                    className="inline-flex h-8 shrink-0 items-center gap-0.5 px-2 text-xs font-semibold text-primary"
                  >
                    More
                    <ChevronDown
                      className={cn("size-3.5 transition-transform", topicsOpen && "rotate-180")}
                    />
                  </button>
                )}
              </div>
              {topicsOpen && (
                <div
                  role="dialog"
                  aria-label="More topics"
                  className="absolute left-0 top-9 z-20 flex w-[min(17rem,calc(100vw-2rem))] flex-col gap-2 rounded-xl border border-[#EDEAF3] bg-white p-2.5 shadow-[0_12px_28px_rgba(19,32,80,0.12)]"
                >
                  <Input
                    type="search"
                    value={topicQuery}
                    onChange={(e) => setTopicQuery(e.target.value)}
                    placeholder="Filter this list"
                    className="h-8 rounded-md border-[#EDEAF3] bg-[#F8F8FA] text-xs shadow-none"
                  />
                  <div className="flex max-h-56 flex-col overflow-y-auto">
                    {topicList.map((sub) => {
                      const on = subcategoryId === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => {
                            setSubcategoryId(sub.id);
                            setTopicsOpen(false);
                          }}
                          className={cn(
                            "rounded-md px-2.5 py-2 text-left text-xs font-medium",
                            on ? "bg-primary/10 text-primary" : "text-[#132050] hover:bg-[#F8F8FA]",
                          )}
                        >
                          {sub.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

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
            <PathCardSlider
              key={group.title}
              title={group.title}
              items={group.items}
              onOpenPath={onOpenPath}
            />
          ))
        )}
      </section>
    </div>
  );
}

function PathCardSlider({
  title,
  items,
  onOpenPath,
}: {
  title: string;
  items: CardModel[];
  onOpenPath: (pathwayId: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 360);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate font-solway text-base font-bold text-[#132050] sm:text-lg">
          {title}
        </h2>
        <span className="hidden text-xs font-medium tabular-nums text-[#5C5468] sm:inline">
          {items.length} path{items.length === 1 ? "" : "s"}
        </span>
        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            aria-label={`Scroll ${title} left`}
            onClick={() => scrollByCard(-1)}
            className="inline-flex size-8 items-center justify-center rounded-full border border-[#EDEAF3] bg-white text-[#132050]/70 transition hover:border-primary/30 hover:text-primary"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Scroll ${title} right`}
            onClick={() => scrollByCard(1)}
            className="inline-flex size-8 items-center justify-center rounded-full border border-[#EDEAF3] bg-white text-[#132050]/70 transition hover:border-primary/30 hover:text-primary"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 [-webkit-overflow-scrolling:touch] scrollbar-hide sm:-mx-1 sm:gap-3.5 sm:px-1"
      >
        {items.map((item) => (
          <PathCard key={item.pathwayId} item={item} onOpen={() => onOpenPath(item.pathwayId)} />
        ))}
      </div>
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
        "relative flex w-[min(86vw,20.5rem)] shrink-0 snap-start flex-col gap-2 rounded-2xl border bg-white p-4 text-left shadow-[0_1px_3px_rgba(19,32,80,0.05)] transition-all sm:w-[22rem]",
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

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-semibold text-primary"
    >
      {label}
      <X className="size-3" strokeWidth={2.5} aria-hidden />
    </button>
  );
}
