import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, ClipboardList, Clock, Loader2, RotateCcw, Search, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ActiveChip,
  CardRail,
  CategoryTabs,
  FiltersPopover,
  TopicChips,
} from "@/components/browse/BrowseControls";
import { RAIL_CARD_WIDTH } from "@/components/browse/browseStyles";
import { fetchResultHistory, fetchVisibleTests } from "../api";
import { formatDuration, testAttemptPath, testIntroPath, testResultPath } from "../paths";
import { GradeBadge, MetaChip, TypeChips } from "../components/TestBits";
import { Pager } from "../components/Pager";
import type { LearnerTestCard, ResultHistoryRow, TaxonomyLink, TestLevel } from "../types";

const LEVELS: TestLevel[] = ["Beginner", "Intermediate", "Advanced"];
const RESULTS_PER_PAGE = 10;

type StatusFilter = "all" | "not_taken" | "in_progress" | "passed";
const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  not_taken: "Not taken",
  in_progress: "In progress",
  passed: "Passed",
};

/** Same segmented-tab look as the Courses page (Available / My results). */
const segmentClass = cn(
  "h-8 shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-all sm:px-3",
  "font-solway whitespace-nowrap",
  "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm",
  "data-[state=inactive]:text-[#132050]/65 data-[state=inactive]:hover:text-[#132050]",
);
const segmentListClass =
  "inline-flex h-9 min-w-min gap-0.5 rounded-md border border-[#EDEAF3] bg-[#F8F8FA] p-0.5 sm:w-fit";

/** Tests with no category are grouped as "Other". */
const OTHER = "other";

type CategoryGroup = {
  key: string;
  title: string;
  sortOrder: number;
  subcategories: { id: number; title: string; sortOrder: number }[];
};

function categoryKey(t: LearnerTestCard): string {
  return t.category ? String(t.category.id) : OTHER;
}

const byOrder = (a: { sortOrder: number; title: string }, b: { sortOrder: number; title: string }) =>
  a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);

/** Categories and subcategories that have tests, in the admin's order (as on the Learning Path page). */
function categoriesOf(tests: LearnerTestCard[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();
  for (const t of tests) {
    const key = categoryKey(t);
    let group = groups.get(key);
    if (!group) {
      const cat: TaxonomyLink | null = t.category;
      group = { key, title: cat?.title ?? "Other", sortOrder: cat?.sortOrder ?? 0, subcategories: [] };
      groups.set(key, group);
    }
    const sub = t.subcategory;
    if (sub && !group.subcategories.some((s) => s.id === sub.id)) {
      group.subcategories.push({ id: sub.id, title: sub.title, sortOrder: sub.sortOrder ?? 0 });
    }
  }
  const list = [...groups.values()];
  for (const g of list) g.subcategories.sort(byOrder);
  return list.sort((a, b) => Number(a.key === OTHER) - Number(b.key === OTHER) || byOrder(a, b));
}

function matchesStatus(t: LearnerTestCard, status: StatusFilter): boolean {
  if (status === "not_taken") return t.attemptsUsed === 0;
  if (status === "in_progress") return t.openAttemptId != null;
  if (status === "passed") return Boolean(t.best?.passed);
  return true;
}

export default function TestsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<LearnerTestCard[] | null>(null);
  const [history, setHistory] = useState<ResultHistoryRow[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<TestLevel | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [categoryChoice, setCategoryChoice] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [tab, setTab] = useState("available");
  const [resultPage, setResultPage] = useState(1);

  const goToAttempt = (test: LearnerTestCard) => {
    if (test.openAttemptId) {
      navigate(testAttemptPath(test.id, test.openAttemptId));
      return;
    }
    if (test.attemptsLeft === 0) {
      navigate(testIntroPath(test.id));
      return;
    }
    navigate(testIntroPath(test.id, { start: true }));
  };

  useEffect(() => {
    let cancelled = false;
    fetchVisibleTests()
      .then((data) => !cancelled && setTests(Array.isArray(data) ? data : []))
      .catch(() => !cancelled && setError(true));
    fetchResultHistory()
      .then((data) => !cancelled && setHistory(Array.isArray(data) ? data : []))
      .catch(() => !cancelled && setHistory([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => categoriesOf(tests ?? []), [tests]);
  // Like the Learning Path page: the first category is open until the learner picks another.
  const activeCategory = categories.find((c) => c.key === categoryChoice) ?? categories[0] ?? null;
  const showCategoryTabs = categories.length > 1 || (categories.length === 1 && categories[0].key !== OTHER);
  const topics = useMemo(() => activeCategory?.subcategories ?? [], [activeCategory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // The API returns tests in the admin's display order; filtering keeps that order.
    return (tests ?? []).filter((t) => {
      if (activeCategory && categoryKey(t) !== activeCategory.key) return false;
      if (subcategoryId != null && t.subcategory?.id !== subcategoryId) return false;
      if (level && t.level !== level) return false;
      if (!matchesStatus(t, status)) return false;
      if (!q) return true;
      return [t.title, t.description, t.courseTitle, t.language, t.category?.title, t.subcategory?.title].some(
        (v) => v && v.toLowerCase().includes(q),
      );
    });
  }, [tests, query, level, status, activeCategory, subcategoryId]);

  // "All": one row per subcategory, in the same order as the chips. One subcategory (or a category
  // without subcategories): one row per level, Beginner → Advanced.
  const rows = useMemo(() => {
    const bySubcategory = subcategoryId == null && topics.length > 0;
    const map = new Map<string, LearnerTestCard[]>();
    if (bySubcategory) for (const s of topics) map.set(s.title, []);
    for (const t of filtered) {
      const key = bySubcategory ? t.subcategory?.title ?? "More tests" : t.level ?? "More tests";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    const list = [...map.entries()]
      .filter(([, items]) => items.length > 0)
      .map(([title, items]) => ({ title, items }));
    if (bySubcategory) return list;
    const rank = (title: string) => {
      const i = LEVELS.indexOf(title as TestLevel);
      return i < 0 ? LEVELS.length : i;
    };
    return list.sort((a, b) => rank(a.title) - rank(b.title));
  }, [filtered, subcategoryId, topics]);

  const activeFilterCount = (level ? 1 : 0) + (status !== "all" ? 1 : 0);
  const clearFilters = () => {
    setLevel(null);
    setStatus("all");
  };
  const clearAll = () => {
    setQuery("");
    clearFilters();
    setSubcategoryId(null);
  };

  const resultPageCount = Math.max(1, Math.ceil((history?.length ?? 0) / RESULTS_PER_PAGE));
  const currentResultPage = Math.min(resultPage, resultPageCount);
  const pagedHistory = (history ?? []).slice(
    (currentResultPage - 1) * RESULTS_PER_PAGE,
    currentResultPage * RESULTS_PER_PAGE,
  );

  // The dashboard scrolls inside its own container, so bring the page heading back into view.
  const topRef = useRef<HTMLDivElement>(null);
  const goToResultPage = (p: number) => {
    setResultPage(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={topRef} className="flex min-w-0 max-w-full scroll-mt-4 flex-col gap-3 font-inter text-[#132050] sm:gap-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="app-type-eyebrow mb-1">Practice</p>
          <h1 className="app-type-page-title">Tests</h1>
          <p className="app-type-page-subtitle mt-1.5">
            Check what you've learned with quick, interactive cards — then see if you passed and what to do next.
          </p>
        </div>
        <div className="relative flex w-full items-center gap-2 sm:max-w-xs lg:max-w-sm">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#132050]/35"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search tests…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 rounded-md border border-[#EDEAF3] bg-[#F8F8FA] pl-8 font-inter text-sm shadow-none transition-colors focus-visible:border-primary/25 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/30"
              aria-label="Search tests"
            />
          </div>
          {tab === "available" ? (
            <FiltersPopover
              activeCount={activeFilterCount}
              resultCount={filtered.length}
              onReset={clearFilters}
              sections={[
                {
                  label: "Level",
                  options: LEVELS.map((l) => ({ value: l, label: l })),
                  value: level ?? "",
                  onChange: (v) => setLevel(level === v ? null : (v as TestLevel)),
                },
                {
                  label: "Status",
                  options: (Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => ({
                    value: s,
                    label: STATUS_LABELS[s],
                  })),
                  value: status,
                  onChange: (v) => setStatus(v as StatusFilter),
                },
              ]}
            />
          ) : null}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex min-w-0 flex-col gap-3 sm:gap-4">
        <div className="min-w-0 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] scrollbar-hide">
          <TabsList className={segmentListClass}>
            <TabsTrigger className={segmentClass} value="available">
              Available{tests ? ` (${tests.length})` : ""}
            </TabsTrigger>
            <TabsTrigger className={segmentClass} value="results">
              My results{history ? ` (${history.length})` : ""}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="available" className="flex min-w-0 flex-col gap-4">
          {error ? (
            <EmptyState title="Couldn't load tests" body="Check your connection and refresh the page." />
          ) : tests == null ? (
            <Loading />
          ) : tests.length === 0 ? (
            <EmptyState title="No tests yet" body="New tests will appear here when your teachers publish them." />
          ) : (
            <>
              <div className="flex min-w-0 flex-col gap-2.5">
                {showCategoryTabs ? (
                  <CategoryTabs
                    options={categories.map((c) => ({ value: c.key, label: c.title }))}
                    value={activeCategory?.key ?? null}
                    onChange={(key) => {
                      setCategoryChoice(key);
                      setSubcategoryId(null);
                    }}
                  />
                ) : null}
                <TopicChips
                  key={activeCategory?.key ?? "none"}
                  options={topics.map((s) => ({ value: String(s.id), label: s.title }))}
                  value={subcategoryId == null ? null : String(subcategoryId)}
                  onChange={(value) => setSubcategoryId(value == null ? null : Number(value))}
                />
                {(level || status !== "all" || subcategoryId != null || query) && (
                  <div className="flex flex-wrap gap-1.5">
                    {query && <ActiveChip label={`“${query}”`} onClear={() => setQuery("")} />}
                    {subcategoryId != null && (
                      <ActiveChip
                        label={topics.find((s) => s.id === subcategoryId)?.title ?? "Topic"}
                        onClear={() => setSubcategoryId(null)}
                      />
                    )}
                    {level && <ActiveChip label={level} onClear={() => setLevel(null)} />}
                    {status !== "all" && <ActiveChip label={STATUS_LABELS[status]} onClear={() => setStatus("all")} />}
                  </div>
                )}
              </div>

              {rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#EDEAF3] px-4 py-12 text-center text-sm text-[#5C5468]">
                  No tests match that. Try another word, or{" "}
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
                rows.map((row) => (
                  <CardRail key={row.title} title={row.title} count={row.items.length} noun="test">
                    {row.items.map((t) => (
                      <TestCardItem
                        key={t.id}
                        test={t}
                        onOpen={() => goToAttempt(t)}
                        onResume={t.openAttemptId ? () => navigate(testAttemptPath(t.id, t.openAttemptId!)) : null}
                      />
                    ))}
                  </CardRail>
                ))
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="results" className="min-h-0">
          {history == null ? (
            <Loading />
          ) : history.length === 0 ? (
            <EmptyState title="No results yet" body="Finish a test and your results will show up here." />
          ) : (
            <div className="flex flex-col gap-4">
              <ul className="divide-y divide-[#EDEAF3] overflow-hidden rounded-xl border border-[#EDEAF3] bg-white">
                {pagedHistory.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={testResultPath(r.id)}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-[#FBF5FC]"
                    >
                      <GradeBadge grade={r.grade} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="app-type-card-title truncate">{r.testTitle ?? "Test"}</p>
                        <p className="app-type-meta truncate">
                          {r.courseTitle ? `${r.courseTitle} · ` : ""}
                          {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : ""}
                          {r.status === "expired" ? " · time ran out" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-solway text-lg font-bold text-[#132050]">{Math.round(r.percent ?? 0)}%</p>
                        <p className="app-type-meta">{formatDuration(r.durationSeconds)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pager
                page={currentResultPage}
                pageSize={RESULTS_PER_PAGE}
                total={history.length}
                onChange={goToResultPage}
                label="results"
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** A test card sized for a CardRail, like the path cards on the Learning Path page. */
function TestCardItem({
  test,
  onOpen,
  onResume,
}: {
  test: LearnerTestCard;
  onOpen: () => void;
  onResume: (() => void) | null;
}) {
  const outOfAttempts = test.attemptsLeft === 0;
  return (
    <article
      className={cn(
        RAIL_CARD_WIDTH,
        "flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-[0_1px_3px_rgba(19,32,80,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-10px_rgba(170,70,142,0.28)]",
        test.openAttemptId ? "border-primary/45" : "border-[#EDEAF3]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold tracking-wide text-[#5C5468]">
            {[test.subcategory?.title, test.level].filter(Boolean).join(" · ") || "Test"}
          </span>
          <h3 className="mt-0.5 line-clamp-2 font-solway text-[15px] font-bold leading-snug text-[#132050] sm:text-base">
            {test.title}
          </h3>
          {test.courseTitle ? (
            <p className="app-type-meta mt-0.5 flex items-center gap-1 truncate">
              <BookOpen className="size-3.5 shrink-0" aria-hidden />
              {test.courseTitle}
            </p>
          ) : null}
        </div>
        {test.best ? <GradeBadge grade={test.best.grade} size="md" /> : null}
      </div>
      {test.description ? (
        <p className="line-clamp-2 text-xs leading-relaxed text-[#5C5468] sm:text-[13px]">{test.description}</p>
      ) : null}
      <TypeChips types={test.types} />
      <div className="flex flex-wrap gap-1.5">
        <MetaChip>
          <ClipboardList className="size-3.5" aria-hidden />
          {test.questionCount} card{test.questionCount === 1 ? "" : "s"}
        </MetaChip>
        {test.timeLimitMinutes ? (
          <MetaChip>
            <Clock className="size-3.5" aria-hidden />
            {test.timeLimitMinutes} min
          </MetaChip>
        ) : null}
        {test.best ? (
          <MetaChip>
            <Trophy className="size-3.5" aria-hidden />
            Best {Math.round(test.best.percent)}%
          </MetaChip>
        ) : null}
        {test.maxAttempts != null ? (
          <MetaChip>
            <RotateCcw className="size-3.5" aria-hidden />
            {test.attemptsUsed}/{test.maxAttempts} tries
          </MetaChip>
        ) : null}
      </div>
      <div className="mt-auto flex gap-2 pt-1">
        {onResume ? (
          <button
            type="button"
            onClick={onResume}
            className="flex-1 rounded-full bg-primary px-3 py-2 font-solway text-sm font-bold text-white hover:brightness-110"
          >
            Resume test
          </button>
        ) : null}
        <button
          type="button"
          onClick={onOpen}
          className={
            onResume
              ? "rounded-full border border-[#EDEAF3] px-3 py-2 text-sm font-semibold text-[#132050]/80 hover:border-primary/40"
              : "flex-1 rounded-full bg-primary px-3 py-2 font-solway text-sm font-bold text-white hover:brightness-110"
          }
        >
          {onResume ? "Details" : outOfAttempts ? "View results" : test.best ? "Try again" : "Start"}
        </button>
      </div>
    </article>
  );
}

function Loading() {
  return (
    <div className="flex h-48 items-center justify-center text-primary">
      <Loader2 className="size-6 animate-spin" aria-label="Loading" />
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#EDEAF3] bg-white px-6 py-14 text-center">
      <ClipboardList className="size-8 text-primary/60" aria-hidden />
      <p className="app-type-section-title">{title}</p>
      <p className="app-type-body max-w-sm text-[#132050]/60">{body}</p>
    </div>
  );
}
