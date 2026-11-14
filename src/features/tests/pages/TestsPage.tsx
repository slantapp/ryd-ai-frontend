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
import { categoryKey, displayTestTitle, focusTest, languageBoards, languageStarted, shortTestTitle, type LanguageBoard } from "../board";
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
  const [weakIndex, setWeakIndex] = useState(0);
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
  const weakList = activeTests
    .filter((test) => test.best && !test.best.passed)
    .sort((a, b) => (a.best?.percent ?? 0) - (b.best?.percent ?? 0));
  const weak = weakList[weakIndex] ?? weakList[0] ?? null;
  const weakAt = weak ? Math.max(0, weakList.findIndex((test) => test.id === weak.id)) : 0;
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
          <p className="mt-2 text-sm text-[#5E5C72]">Short 4-minute checks. Pass at 70% to tick the lesson off.</p>
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
                      {mine.length} {/coding/i.test(item.title) ? `language${mine.length === 1 ? "" : "s"}` : `topic${mine.length === 1 ? "" : "s"}`}
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
                <ScoreRing
                  value={resumeBoard && resumeNumber ? Math.round((resumeNumber / resumeBoard.tests.length) * 100) : 0}
                  label={resumeNumber != null ? String(resumeNumber) : "·"}
                  light
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold tracking-[0.12em] text-white/75">PICK UP WHERE YOU LEFT OFF</p>
                  <h2 className="mt-1 truncate font-solway text-[22px] font-bold">
                    {displayTestTitle(resumeBoard?.title ?? "Test", resume.title)}
                  </h2>
                  <p className="mt-1 text-sm text-white/80">
                    {resumeNumber && resumeBoard ? `Test ${resumeNumber} of ${resumeBoard.tests.length}` : "Test"}
                    {resumeStep ? ` · Step ${resumeStep.index}${resumeStep.title ? `, ${resumeStep.title}` : ""}` : ""}
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
                    <ScoreRing value={Math.round(weak.best.percent)} label={`${Math.round(weak.best.percent)}%`} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold tracking-[0.1em] text-[#E11D48]">FIX YOUR WEAK SPOT</p>
                      <p className="mt-1 truncate font-solway text-lg font-bold">
                        {displayTestTitle(boards.find((board) => board.tests.some((item) => item.test.id === weak.id))?.title ?? "", weak.title)}
                      </p>
                      <p className="text-[13px] text-[#5E5C72]">
                        {weak.best.missed != null && weak.best.total
                          ? `Your lowest score · ${weak.best.missed} of ${weak.best.total} missed`
                          : "Your lowest score"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-[12px] text-[#8A8494]">
                      <button
                        type="button"
                        aria-label="Previous weak spot"
                        disabled={weakList.length < 2}
                        onClick={() => setWeakIndex((index) => (index - 1 + weakList.length) % weakList.length)}
                        className="grid size-6 place-items-center rounded-full border border-[#E7E4EE] disabled:opacity-40"
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                      <span>
                        {weakAt + 1} of {weakList.length} to fix
                      </span>
                      <button
                        type="button"
                        aria-label="Next weak spot"
                        disabled={weakList.length < 2}
                        onClick={() => setWeakIndex((index) => (index + 1) % weakList.length)}
                        className="grid size-6 place-items-center rounded-full border border-[#E7E4EE] disabled:opacity-40"
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => openTest(navigate, weak)}
                      className="inline-flex h-9 items-center rounded-full border border-[#E7E4EE] bg-[#F7F6FA] px-4 text-sm font-semibold"
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
            pageSize={3}
            onOpen={(board) => navigate(testLanguagePath(board.id))}
          />
          <LanguageRow
            title="Not started"
            hint="Start begins at test 1.1"
            boards={notStarted}
            empty="Every language here has been started."
            pageSize={4}
            onOpen={(board) => navigate(testLanguagePath(board.id))}
            compact
          />
        </>
      )}
    </div>
  );
}

function LanguageRow({
  title,
  hint,
  boards,
  empty,
  pageSize,
  onOpen,
  compact = false,
}: {
  title: string;
  hint?: string;
  boards: LanguageBoard[];
  empty: string;
  pageSize: number;
  onOpen: (board: LanguageBoard) => void;
  compact?: boolean;
}) {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const pageCount = Math.max(1, Math.ceil(boards.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const visible = expanded ? boards : boards.slice(start, start + pageSize);
  const from = boards.length ? start + 1 : 0;
  const to = Math.min(start + visible.length, boards.length);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-solway text-xl font-bold">
          {title}{" "}
          <span className="text-base font-semibold text-[#8A8494]">
            {boards.length} language{boards.length === 1 ? "" : "s"}
            {hint ? ` · ${hint}` : ""}
          </span>
        </h2>
        <div className="flex items-center gap-2 text-sm text-[#8A8494]">
          {boards.length > 0 && !expanded ? (
            <span>
              {from}–{to} of {boards.length}
            </span>
          ) : null}
          <button
            type="button"
            aria-label="Previous"
            disabled={expanded || safePage === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            className="grid size-8 place-items-center rounded-full border border-[#E7E4EE] bg-white disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={expanded || safePage >= pageCount - 1}
            onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            className="grid size-8 place-items-center rounded-full border border-[#E7E4EE] bg-white disabled:opacity-40"
          >
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
        <div className={cn("grid gap-3", compact ? "sm:grid-cols-2 xl:grid-cols-4" : "lg:grid-cols-3")}>
          {visible.map((board) => (
            <LanguageCard key={board.id} board={board} compact={compact} onOpen={() => onOpen(board)} />
          ))}
        </div>
      )}
    </section>
  );
}

function LanguageCard({ board, compact, onOpen }: { board: LanguageBoard; compact: boolean; onOpen: () => void }) {
  const percent = board.tests.length ? Math.round((board.passed / board.tests.length) * 100) : 0;
  const focus = board.focus;
  const paused = focus?.test.openAttemptId != null;
  if (compact) {
    return (
      <article className="flex items-center gap-3 rounded-[20px] border border-[#E7E4EE] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(28,27,58,0.04)]">
        <LanguageMark title={board.title} size="sm" />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="block truncate font-solway text-base font-bold">{board.title}</span>
          <span className="block truncate text-[12px] text-[#8A8494]">
            {board.tests.length} test{board.tests.length === 1 ? "" : "s"} · {board.steps.length} step{board.steps.length === 1 ? "" : "s"}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-9 shrink-0 items-center rounded-full border border-[#E4E0EA] bg-white px-4 text-sm font-semibold text-[#3E3C55]"
        >
          Start
        </button>
      </article>
    );
  }
  return (
    <article className="flex flex-col rounded-[20px] border border-[#E7E4EE] bg-white p-4 shadow-[0_1px_2px_rgba(28,27,58,0.04)]">
      <button type="button" onClick={onOpen} className="flex items-start gap-3 text-left">
        <LanguageMark title={board.title} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-solway text-lg font-bold">{board.title}</span>
          <span className="block text-[13px] text-[#8A8494]">
            {board.passed} of {board.tests.length} passed · {board.steps.length} step{board.steps.length === 1 ? "" : "s"}
          </span>
        </span>
        <span className="text-[15px] font-bold text-[#3E3C55]">{percent}%</span>
      </button>
      <SegmentBar percent={percent} />
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#F1EFF5] pt-3">
        <div className="min-w-0">
          <p className={cn("flex items-center gap-1 text-[11px] font-bold tracking-[0.04em]", paused ? "text-[#C2410C]" : "text-primary")}>
            <Play className="size-3 fill-current" aria-hidden />
            {paused ? "PAUSED" : "UP NEXT"}
            {paused && focus?.test.openProgress
              ? ` · QUESTION ${focus.test.openProgress.question} OF ${focus.test.openProgress.total}`
              : focus
                ? ` · TEST ${focus.number}`
                : ""}
          </p>
          {focus ? <p className="truncate text-[13px] font-semibold text-[#1C1B3A]">{shortTestTitle(focus.test.title)}</p> : null}
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-4 text-sm font-semibold text-white"
        >
          {paused ? "Resume" : "Continue"}
        </button>
      </div>
    </article>
  );
}

function SegmentBar({ percent }: { percent: number }) {
  const total = 12;
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * total);
  return (
    <div className="mt-3 flex gap-1" aria-hidden>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < filled ? "bg-[#3B82F6]" : "bg-[#E6E2EA]")} />
      ))}
    </div>
  );
}

function ScoreRing({ value, label, light = false }: { value: number; label: string; light?: boolean }) {
  const amount = Math.max(0, Math.min(100, value));
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dash = (amount / 100) * circumference;
  return (
    <span className="relative grid size-16 shrink-0 place-items-center">
      <svg viewBox="0 0 56 56" className="size-16 -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={radius} fill="none" stroke={light ? "rgba(255,255,255,0.28)" : "#F8C9D2"} strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={light ? "#fff" : "#E11D48"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <span className={cn("absolute text-sm font-bold", light ? "text-white" : "text-[#E11D48]")}>{label}</span>
    </span>
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
