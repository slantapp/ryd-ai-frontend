import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, ClipboardList, Loader2, Play, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchResultHistory, fetchVisibleTests } from "../api";
import { formatDuration, testAttemptPath, testIntroPath, testLanguagePath, testResultPath } from "../paths";
import { GradeBadge } from "../components/TestBits";
import { LanguageMark, SubjectIcon } from "../components/LanguageMark";
import { Pager } from "../components/Pager";
import { categoryKey, focusTest, languageBoards, languageStarted, lowestScore, type LanguageBoard } from "../board";
import type { LearnerTestCard, ResultHistoryRow } from "../types";

const RESULTS_PER_PAGE = 10;

function openTest(navigate: (path: string) => void, test: LearnerTestCard) {
  if (test.openAttemptId) navigate(testAttemptPath(test.id, test.openAttemptId));
  else navigate(testIntroPath(test.id));
}

export default function TestsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tests, setTests] = useState<LearnerTestCard[] | null>(null);
  const [history, setHistory] = useState<ResultHistoryRow[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [resultPage, setResultPage] = useState(1);
  const subject = params.get("subject");

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

  const boards = useMemo(() => languageBoards(tests ?? []), [tests]);
  const subjects = useMemo(() => {
    const map = new Map<string, { key: string; title: string }>();
    for (const test of tests ?? []) {
      const key = categoryKey(test);
      if (!map.has(key)) map.set(key, { key, title: test.category?.title ?? "Other" });
    }
    return [...map.values()];
  }, [tests]);
  const activeKey = subjects.some((item) => item.key === subject) ? subject : subjects[0]?.key ?? null;
  const activeBoards = boards.filter((board) => String(board.categoryId ?? "other") === activeKey);
  const q = query.trim().toLowerCase();
  const visibleBoards = activeBoards.filter((board) => {
    if (!q) return true;
    return (
      board.title.toLowerCase().includes(q) ||
      board.tests.some((item) => item.test.title.toLowerCase().includes(q))
    );
  });
  const inProgress = visibleBoards.filter(languageStarted);
  const notStarted = visibleBoards.filter((board) => !languageStarted(board));
  const activeTests = (tests ?? []).filter((test) => categoryKey(test) === activeKey);
  const resume = focusTest(activeTests.filter((test) => !q || test.title.toLowerCase().includes(q) || test.subcategory?.title.toLowerCase().includes(q)));
  const weak = lowestScore(activeTests.filter((test) => test.best && !test.best.passed));
  const weakCount = activeTests.filter((test) => test.best && !test.best.passed).length;
  const resumeBoard = resume ? boards.find((board) => board.tests.some((item) => item.test.id === resume.id)) : null;
  const resumeNumber = resumeBoard?.tests.find((item) => item.test.id === resume?.id)?.number ?? null;
  const resumeStep = resumeBoard?.steps.find((step) => step.tests.some((item) => item.test.id === resume?.id));

  const resultPageCount = Math.max(1, Math.ceil((history?.length ?? 0) / RESULTS_PER_PAGE));
  const currentResultPage = Math.min(resultPage, resultPageCount);
  const pagedHistory = (history ?? []).slice(
    (currentResultPage - 1) * RESULTS_PER_PAGE,
    currentResultPage * RESULTS_PER_PAGE,
  );
  const topRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={topRef} className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 font-inter text-[#1C1B3A]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A8494]">Practice</p>
          <h1 className="mt-1 font-solway text-[32px] font-bold leading-none">Knowledge Tests</h1>
          <p className="mt-2 text-sm text-[#5E5C72]">Short checks on what you just learned. Pass at the test’s own mark to tick the lesson off.</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:max-w-sm">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A8494]" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search any test or topic"
              aria-label="Search any test or topic"
              className="h-11 rounded-full border-[#E6E2EA] bg-white pl-9 shadow-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowResults((open) => !open)}
            className="shrink-0 text-sm font-semibold text-primary"
          >
            {showResults ? "Back" : "My results"}
          </button>
        </div>
      </div>

      {error ? (
        <Empty title="Couldn't load tests" body="Check your connection and refresh the page." />
      ) : tests == null ? (
        <Loading />
      ) : showResults ? (
        <Results
          history={history}
          rows={pagedHistory}
          page={currentResultPage}
          onPage={(page) => {
            setResultPage(page);
            topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      ) : tests.length === 0 ? (
        <Empty title="No tests yet" body="New tests will appear here when your teachers publish them." />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {subjects.map((item) => {
              const selected = item.key === activeKey;
              const mine = boards.filter((board) => String(board.categoryId ?? "other") === item.key);
              const started = mine.filter(languageStarted).length;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setParams(item.key === subjects[0]?.key ? {} : { subject: item.key }, { replace: true })}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left",
                    selected ? "border-primary bg-[#FBF3F8] shadow-[0_0_0_1px_#aa468e]" : "border-[#E7E4EE]",
                  )}
                >
                  <SubjectIcon title={item.title} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-solway text-lg font-bold">{item.title}</span>
                    <span className="block text-[13px] text-[#5E5C72]">
                      {mine.length} language{mine.length === 1 ? "" : "s"}
                      {started ? ` · ${started} in progress` : " · not started"}
                    </span>
                  </span>
                  {selected ? <Check className="size-4 text-primary" aria-hidden /> : null}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
            {resume ? (
              <section
                className="flex flex-wrap items-center gap-4 rounded-[24px] px-5 py-5 text-white"
                style={{ background: "linear-gradient(100deg, #5C1F6E 0%, #8E347F 48%, #C026A0 100%)" }}
              >
                <span className="grid size-16 shrink-0 place-items-center rounded-full border-[5px] border-white/30 text-xl font-bold">
                  {resumeNumber ?? "·"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold tracking-[0.12em] text-white/75">PICK UP WHERE YOU LEFT OFF</p>
                  <h2 className="mt-1 truncate font-solway text-[22px] font-bold">{resume.title}</h2>
                  <p className="mt-1 text-sm text-white/80">
                    {resumeBoard ? `${resumeBoard.title}` : "Test"}
                    {resumeNumber && resumeBoard ? ` · Test ${resumeNumber} of ${resumeBoard.tests.length}` : ""}
                    {resumeStep?.title && resumeStep.title !== "Tests" ? ` · ${resumeStep.title}` : ""}
                    {resume.timeLimitMinutes ? ` · ${resume.timeLimitMinutes} min` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openTest(navigate, resume)}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#1C1B3A]"
                >
                  <Play className="size-3.5 fill-current" aria-hidden />
                  {resume.openAttemptId ? "Continue" : resume.best ? "Retry" : "Start test"}
                </button>
              </section>
            ) : (
              <section className="flex items-center rounded-[24px] border border-dashed border-[#E7E4EE] bg-white px-5 py-8 text-sm text-[#5E5C72]">
                Pick a language below to start a test.
              </section>
            )}

            <section className="flex flex-col justify-between gap-3 rounded-[24px] border border-[#E7E4EE] bg-white p-4">
              {weak?.best ? (
                <>
                  <div className="flex items-start gap-3">
                    <span className="grid size-14 shrink-0 place-items-center rounded-full border-[5px] border-[#F8C9D2] text-sm font-bold text-[#E11D48]">
                      {Math.round(weak.best.percent)}%
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold tracking-[0.1em] text-[#E11D48]">FIX YOUR WEAK SPOT</p>
                      <p className="mt-1 truncate font-solway text-lg font-bold">{weak.title}</p>
                      <p className="text-[13px] text-[#5E5C72]">
                        {weak.best.missed != null && weak.best.total
                          ? `Your lowest score · ${weak.best.missed} of ${weak.best.total} missed`
                          : "Your lowest score"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12px] text-[#8A8494]">{weakCount} to fix</p>
                    <button
                      type="button"
                      onClick={() => openTest(navigate, weak)}
                      className="inline-flex h-9 items-center rounded-full border border-[#E7E4EE] px-4 text-sm font-semibold"
                    >
                      Retry
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-[11px] font-bold tracking-[0.1em] text-[#8A8494]">FIX YOUR WEAK SPOT</p>
                  <p className="mt-2 text-sm text-[#5E5C72]">Finish a test and your lowest score will show up here.</p>
                </div>
              )}
            </section>
          </div>

          <LanguageRow
            title="In progress"
            boards={inProgress}
            empty="No language in progress yet."
            onOpen={(board) => navigate(testLanguagePath(board.id))}
            onAction={(board) => {
              const test = board.focus?.test;
              if (test) openTest(navigate, test);
              else navigate(testLanguagePath(board.id));
            }}
          />
          <LanguageRow
            title="Not started"
            boards={notStarted}
            empty="Every language here has been started."
            onOpen={(board) => navigate(testLanguagePath(board.id))}
            onAction={(board) => navigate(testLanguagePath(board.id))}
            compact
          />
        </>
      )}
    </div>
  );
}

function LanguageRow({
  title,
  boards,
  empty,
  onOpen,
  onAction,
  compact = false,
}: {
  title: string;
  boards: LanguageBoard[];
  empty: string;
  onOpen: (board: LanguageBoard) => void;
  onAction: (board: LanguageBoard) => void;
  compact?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const scroll = (direction: number) => scroller.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-solway text-xl font-bold">
          {title} <span className="text-base font-semibold text-[#8A8494]">{boards.length} language{boards.length === 1 ? "" : "s"}</span>
        </h2>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous" onClick={() => scroll(-1)} className="grid size-8 place-items-center rounded-full border border-[#E7E4EE] bg-white">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label="Next" onClick={() => scroll(1)} className="grid size-8 place-items-center rounded-full border border-[#E7E4EE] bg-white">
            <ChevronRight className="size-4" />
          </button>
          <button type="button" onClick={() => setExpanded((value) => !value)} className="text-sm font-semibold text-[#5E5C72]">
            {expanded ? "Show less" : "See all"}
          </button>
        </div>
      </div>
      {boards.length === 0 ? (
        <p className="text-sm text-[#8A8494]">{empty}</p>
      ) : (
        <div ref={scroller} className={cn("flex gap-3", expanded ? "flex-wrap" : "overflow-x-auto scroll-smooth pb-1 scrollbar-hide")}>
          {boards.map((board) => (
            <LanguageCard key={board.id} board={board} compact={compact} onOpen={() => onOpen(board)} onAction={() => onAction(board)} />
          ))}
        </div>
      )}
    </section>
  );
}

function LanguageCard({
  board,
  compact,
  onOpen,
  onAction,
}: {
  board: LanguageBoard;
  compact: boolean;
  onOpen: () => void;
  onAction: () => void;
}) {
  const percent = board.tests.length ? Math.round((board.passed / board.tests.length) * 100) : 0;
  const focus = board.focus;
  const started = languageStarted(board);
  return (
    <article className={cn("flex shrink-0 flex-col gap-3 rounded-2xl border border-[#E7E4EE] bg-white p-4", compact ? "w-[220px]" : "w-[300px]")}>
      <button type="button" onClick={onOpen} className="flex items-start gap-3 text-left">
        <LanguageMark title={board.title} size={compact ? "sm" : "md"} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-solway text-lg font-bold">{board.title}</span>
          <span className="block text-[13px] text-[#5E5C72]">
            {started
              ? `${board.passed} of ${board.tests.length} passed · ${board.steps.length} step${board.steps.length === 1 ? "" : "s"}`
              : `${board.tests.length} test${board.tests.length === 1 ? "" : "s"} · ${board.steps.length} step${board.steps.length === 1 ? "" : "s"}`}
          </span>
        </span>
        {started ? <span className="text-sm font-bold text-[#5E5C72]">{percent}%</span> : null}
      </button>
      {started ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-[#F1EFF5]">
          <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2">
        {focus && started ? (
          <p className="min-w-0 truncate text-[12px] font-semibold text-[#5E5C72]">
            <span className="text-primary">{focus.test.openAttemptId ? "PAUSED" : "UP NEXT"}</span>
            {" · "}
            {focus.test.openProgress
              ? `QUESTION ${focus.test.openProgress.question} OF ${focus.test.openProgress.total}`
              : focus.test.title}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-semibold",
            started ? "bg-primary text-white" : "border border-[#E4E0EA] bg-white text-[#3E3C55]",
          )}
        >
          {started ? (focus?.test.openAttemptId ? "Resume" : "Continue") : "Start"}
        </button>
      </div>
    </article>
  );
}

function Results({
  history,
  rows,
  page,
  onPage,
}: {
  history: ResultHistoryRow[] | null;
  rows: ResultHistoryRow[];
  page: number;
  onPage: (page: number) => void;
}) {
  if (history == null) return <Loading />;
  if (history.length === 0) return <Empty title="No results yet" body="Finish a test and your results will show up here." />;
  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-[#EDEAF3] overflow-hidden rounded-2xl border border-[#E7E4EE] bg-white">
        {rows.map((row) => (
          <li key={row.id}>
            <Link to={testResultPath(row.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FBF5FC]">
              <GradeBadge grade={row.grade} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{row.testTitle ?? "Test"}</span>
                <span className="block truncate text-[12px] text-[#5E5C72]">
                  {row.courseTitle ? `${row.courseTitle} · ` : ""}
                  {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : ""}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-solway text-lg font-bold">{Math.round(row.percent ?? 0)}%</span>
                <span className="block text-[12px] text-[#8A8494]">{formatDuration(row.durationSeconds)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Pager page={page} pageSize={RESULTS_PER_PAGE} total={history.length} onChange={onPage} label="results" />
    </div>
  );
}

function Loading() {
  return (
    <div className="flex h-48 items-center justify-center text-primary">
      <Loader2 className="size-6 animate-spin" aria-label="Loading" />
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#E7E4EE] bg-white px-6 py-14 text-center">
      <ClipboardList className="size-8 text-primary/60" aria-hidden />
      <p className="font-solway text-lg font-bold">{title}</p>
      <p className="max-w-sm text-sm text-[#5E5C72]">{body}</p>
    </div>
  );
}
