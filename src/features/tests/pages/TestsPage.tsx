import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  Clock,
  Loader2,
  RotateCcw,
  Search,
  Trophy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchResultHistory, fetchVisibleTests } from "../api";
import {
  formatDuration,
  testAttemptPath,
  testIntroPath,
  testResultPath,
} from "../paths";
import { GradeBadge, MetaChip, TypeChips } from "../components/TestBits";
import { Pager } from "../components/Pager";
import type { LearnerTestCard, ResultHistoryRow, TestLevel } from "../types";

const LEVELS: TestLevel[] = ["Beginner", "Intermediate", "Advanced"];
/** 9 fills the 3-column grid on wide screens (and 2/1 columns evenly enough). */
const TESTS_PER_PAGE = 9;
const RESULTS_PER_PAGE = 10;

/** Same segmented-tab look as the Courses page. */
const segmentClass = cn(
  "h-8 shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-all sm:px-3",
  "font-solway whitespace-nowrap",
  "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm",
  "data-[state=inactive]:text-[#132050]/65 data-[state=inactive]:hover:text-[#132050]",
);
const segmentListClass =
  "inline-flex h-9 min-w-min gap-0.5 rounded-md border border-[#EDEAF3] bg-[#F8F8FA] p-0.5 sm:w-fit";

export default function TestsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<LearnerTestCard[] | null>(null);
  const [history, setHistory] = useState<ResultHistoryRow[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<TestLevel | "all">("all");
  const [tab, setTab] = useState("available");
  const [testPage, setTestPage] = useState(1);
  const [resultPage, setResultPage] = useState(1);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (tests ?? []).filter((t) => {
      if (level !== "all" && t.level !== level) return false;
      if (!q) return true;
      return [t.title, t.description, t.courseTitle, t.language].some(
        (v) => v && v.toLowerCase().includes(q),
      );
    });
  }, [tests, query, level]);

  // A new search or level filter starts again from page 1.
  useEffect(() => {
    setTestPage(1);
  }, [query, level]);

  // Keep the page in range if the list shrinks.
  const testPageCount = Math.max(
    1,
    Math.ceil(filtered.length / TESTS_PER_PAGE),
  );
  const currentTestPage = Math.min(testPage, testPageCount);
  const pagedTests = filtered.slice(
    (currentTestPage - 1) * TESTS_PER_PAGE,
    currentTestPage * TESTS_PER_PAGE,
  );
  const resultPageCount = Math.max(
    1,
    Math.ceil((history?.length ?? 0) / RESULTS_PER_PAGE),
  );
  const currentResultPage = Math.min(resultPage, resultPageCount);
  const pagedHistory = (history ?? []).slice(
    (currentResultPage - 1) * RESULTS_PER_PAGE,
    currentResultPage * RESULTS_PER_PAGE,
  );

  // The dashboard scrolls inside its own container, so bring the page heading back into view.
  const topRef = useRef<HTMLDivElement>(null);
  const goToPage = (set: (p: number) => void) => (p: number) => {
    set(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      ref={topRef}
      className="flex h-full min-h-0 min-w-0 max-w-full scroll-mt-4 flex-col"
    >
      <section className="flex min-h-0 flex-1 flex-col space-y-3 sm:space-y-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="app-type-eyebrow mb-1">Practice</p>
            <h2 className="app-type-page-title">Tests</h2>
            <p className="app-type-page-subtitle mt-1.5">
              Check what you've learned with quick, interactive cards — then get
              a grade and what to do next.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#132050]/35"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search tests..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 rounded-md border border-[#EDEAF3] bg-[#F8F8FA] pl-8 font-inter text-sm shadow-none focus-visible:border-primary/25 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/30"
              aria-label="Search tests"
            />
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={setTab}
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            {tab === "available" ? (
              <div className="flex min-w-0 items-center gap-2">
                <span className="app-type-label shrink-0">Level</span>
                <div className="min-w-0 overflow-x-auto pb-0.5 scrollbar-hide">
                  <div
                    className={segmentListClass}
                    role="group"
                    aria-label="Filter by level"
                  >
                    {(["all", ...LEVELS] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLevel(l)}
                        aria-pressed={level === l}
                        data-state={level === l ? "active" : "inactive"}
                        className={segmentClass}
                      >
                        {l === "all" ? "All" : l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <TabsContent value="available" className="min-h-0">
            {error ? (
              <EmptyState
                title="Couldn't load tests"
                body="Check your connection and refresh the page."
              />
            ) : tests == null ? (
              <Loading />
            ) : filtered.length === 0 ? (
              <EmptyState
                title={tests.length ? "No tests match" : "No tests yet"}
                body={
                  tests.length
                    ? "Try another search or level."
                    : "New tests will appear here when your teachers publish them."
                }
              />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {pagedTests.map((t) => (
                    <TestCardItem
                      key={t.id}
                      test={t}
                      onOpen={() => navigate(testIntroPath(t.id))}
                      onResume={
                        t.openAttemptId
                          ? () =>
                              navigate(testAttemptPath(t.id, t.openAttemptId!))
                          : null
                      }
                    />
                  ))}
                </div>
                <Pager
                  page={currentTestPage}
                  pageSize={TESTS_PER_PAGE}
                  total={filtered.length}
                  onChange={goToPage(setTestPage)}
                  label="tests"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="min-h-0">
            {history == null ? (
              <Loading />
            ) : history.length === 0 ? (
              <EmptyState
                title="No results yet"
                body="Finish a test and your grades will show up here."
              />
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
                          <p className="app-type-card-title truncate">
                            {r.testTitle ?? "Test"}
                          </p>
                          <p className="app-type-meta truncate">
                            {r.courseTitle ? `${r.courseTitle} · ` : ""}
                            {r.submittedAt
                              ? new Date(r.submittedAt).toLocaleDateString()
                              : ""}
                            {r.status === "expired" ? " · time ran out" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-solway text-lg font-bold text-[#132050]">
                            {Math.round(r.percent ?? 0)}%
                          </p>
                          <p className="app-type-meta">
                            {formatDuration(r.durationSeconds)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Pager
                  page={currentResultPage}
                  pageSize={RESULTS_PER_PAGE}
                  total={history.length}
                  onChange={goToPage(setResultPage)}
                  label="results"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

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
    <article className="flex flex-col gap-3 rounded-xl border border-[#EDEAF3] bg-white p-4 shadow-[0_1px_2px_rgba(19,32,80,0.04)] transition hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="app-type-card-title line-clamp-2">{test.title}</h3>
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
        <p className="app-type-body line-clamp-2 text-[#132050]/70">
          {test.description}
        </p>
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
        {test.level ? <MetaChip>{test.level}</MetaChip> : null}
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
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Resume test
          </button>
        ) : null}
        <button
          type="button"
          onClick={onOpen}
          className={
            onResume
              ? "rounded-md border border-[#EDEAF3] px-3 py-2 text-sm font-semibold text-[#132050]/80 hover:border-primary/40"
              : "flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
          }
        >
          {onResume
            ? "Details"
            : outOfAttempts
              ? "View results"
              : test.best
                ? "Try again"
                : "Start"}
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
