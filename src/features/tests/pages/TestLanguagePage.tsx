import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Clock, Loader2, Play, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { fetchVisibleTests } from "../api";
import { displayTestTitle, languageBoards, lastCompletedTest, squareStatus, type NumberedTest, type SquareStatus } from "../board";
import { LanguageMark } from "../components/LanguageMark";
import { testAttemptPath, testIntroPath, testLanguagePath } from "../paths";
import type { LearnerTestCard } from "../types";

type FilterKey = "all" | "failed" | "fresh";

const STATUS_LABEL: Record<SquareStatus, string> = {
  passed: "Passed",
  failed: "Not passed",
  halfway: "Left halfway",
  next: "Up next",
  fresh: "Not tried",
};

function matchesFilter(status: SquareStatus, filter: FilterKey) {
  if (filter === "failed") return status === "failed";
  if (filter === "fresh") return status === "fresh" || status === "next";
  return true;
}

export default function TestLanguagePage() {
  const { subcategoryId = "" } = useParams();
  const navigate = useNavigate();
  const [tests, setTests] = useState<LearnerTestCard[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchVisibleTests()
      .then((data) => !cancelled && setTests(Array.isArray(data) ? data : []))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [subcategoryId]);

  const boards = useMemo(() => languageBoards(tests ?? []), [tests]);
  const board = boards.find((item) => String(item.id) === subcategoryId) ?? null;
  const siblings = boards.filter((item) => item.categoryId === board?.categoryId);
  const shown = siblings.slice(0, 4);
  const extra = siblings.slice(4);

  useEffect(() => {
    if (!openId) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest("[data-test-square]")) setOpenId(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  if (error) {
    return <Message title="Couldn't load tests" body="Check your connection and refresh the page." />;
  }
  if (tests == null) {
    return (
      <div className="flex h-64 items-center justify-center text-primary">
        <Loader2 className="size-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (!board) {
    return <Message title="That language isn't available" body="It may have been unpublished." />;
  }

  const focusId = board.focus?.test.id ?? null;
  const percent = board.tests.length ? Math.round((board.passed / board.tests.length) * 100) : 0;
  const latest = lastCompletedTest(board.tests);

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 font-inter text-[#1C1B3A]">
      <p className="text-sm text-[#8A8494]">
        <Link to={board.categoryId ? `${PRIVATE_PATHS.TESTS}?subject=${board.categoryId}` : PRIVATE_PATHS.TESTS} className="hover:text-[#1C1B3A]">
          Knowledge Tests
        </Link>
        <span className="px-1.5">›</span>
        <span className="text-[#1C1B3A]">{board.title}</span>
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <LanguageMark title={board.title} />
          <div>
            <h1 className="font-solway text-[32px] font-bold leading-none">{board.title} tests</h1>
            <p className="mt-1 text-sm text-[#5E5C72]">
              {board.tests.length} tests · {board.steps.length} step{board.steps.length === 1 ? "" : "s"} · {board.passed} passed
              {board.failed ? ` · ${board.failed} not passed` : ""}
            </p>
          </div>
        </div>
        <div className="min-w-[180px] text-right">
          <p className="text-sm font-semibold">
            {board.passed} of {board.tests.length} passed
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E7E4EE]">
            <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1 text-[12px] text-[#8A8494]">{percent}%</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={board.categoryId ? `${PRIVATE_PATHS.TESTS}?subject=${board.categoryId}` : PRIVATE_PATHS.TESTS}
          className="inline-flex h-9 items-center rounded-full border border-[#E6E2EA] bg-white px-3.5 text-sm font-semibold"
        >
          All
        </Link>
        {shown.map((item) => (
          <Link
            key={item.id}
            to={testLanguagePath(item.id)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold",
              item.id === board.id ? "bg-white text-[#1C1B3A] shadow-[0_0_0_1.5px_#7C3AED]" : "border border-[#E6E2EA] bg-white text-[#3E3C55]",
            )}
          >
            <LanguageMark title={item.title} size="xs" />
            {item.title}
          </Link>
        ))}
        {extra.length > 0 ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-[#E6E2EA] bg-white px-3.5 text-sm font-semibold"
            >
              More languages ({extra.length})
              <ChevronDown className="size-3.5" aria-hidden />
            </button>
            {moreOpen ? (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-[#E7E4EE] bg-white p-1 shadow-lg">
                {extra.map((item) => (
                  <Link
                    key={item.id}
                    to={testLanguagePath(item.id)}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#F7F6FA]"
                  >
                    <LanguageMark title={item.title} size="xs" />
                    {item.title}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {latest ? (
        <section
          className="flex flex-wrap items-center gap-4 rounded-2xl px-4 py-3 text-white sm:px-5"
          style={{ background: "linear-gradient(100deg, #6D2A86 0%, #9B3A9A 55%, #B84AA8 100%)" }}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15 text-lg font-bold">{latest.label}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-[0.12em] text-white/70">LAST COMPLETED TEST</p>
            <p className="truncate font-solway text-lg font-bold">
              Test {latest.number} · {displayTestTitle(board.title, latest.test.title)}
            </p>
          </div>
          <p className="hidden items-center gap-1.5 text-sm text-white/80 sm:flex">
            <Clock className="size-3.5" aria-hidden />
            {latest.test.timeLimitMinutes ? `${latest.test.timeLimitMinutes} min` : "No time limit"}
            {" · "}
            {latest.test.passMark}% to pass
          </p>
          <button
            type="button"
            onClick={() => openTest(navigate, latest.test)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-[#1C1B3A]"
          >
            <Play className="size-3.5 fill-current" aria-hidden />
            {latest.test.openAttemptId ? "Continue" : latest.test.best?.passed ? "Review" : "Retry"}
          </button>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`All ${board.tests.length}`} />
          <FilterChip active={filter === "failed"} onClick={() => setFilter("failed")} label={`Not passed ${board.failed}`} dot="bg-[#E11D48]" />
          <FilterChip active={filter === "fresh"} onClick={() => setFilter("fresh")} label={`Not tried ${board.fresh}`} dot="bg-[#C4BFCE]" />
        </div>
        <div className="flex flex-wrap gap-3 text-[12px] text-[#5E5C72]">
          <Legend swatch="bg-[#1F9D55]" label="Passed" />
          <Legend swatch="border border-[#F3B4C4] bg-[#FFF5F7]" label="Not passed" />
          <Legend swatch="bg-primary" label="Up next" />
          <Legend swatch="bg-[#F8E7C8]" label="Left halfway" />
          <Legend swatch="border border-[#E4E0EA] bg-white" label="Not tried" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {board.steps.map((step) => {
          const visible = step.tests.filter((item) => matchesFilter(squareStatus(item.test, focusId), filter));
          if (!visible.length) return null;
          const passed = step.tests.filter((item) => item.test.best?.passed).length;
          return (
            <section
              key={`${step.index}-${step.title}`}
              className={cn(
                "rounded-2xl border px-4 py-3",
                step.tests.some((item) => item.test.id === focusId)
                  ? "border-[#F3D7EE] bg-[#FBF4F8]"
                  : "border-[#E7E4EE] bg-white",
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-[#8A8494]">
                    Step {step.index} · tests {step.from}–{step.to}
                  </p>
                  {step.title ? <p className="font-solway text-base font-bold">{step.title}</p> : null}
                </div>
                <p className="text-[13px] font-semibold text-[#5E5C72]">
                  {passed}/{step.tests.length}
                </p>
              </div>
              <div className="grid grid-cols-[repeat(14,2.75rem)] justify-start gap-2 overflow-x-auto py-1">
                {visible.map((item) => (
                  <Square
                    key={item.test.id}
                    item={item}
                    language={board.title}
                    total={board.tests.length}
                    status={squareStatus(item.test, focusId)}
                    isFocus={item.test.id === focusId}
                    open={openId === item.test.id}
                    onToggle={() => setOpenId((current) => (current === item.test.id ? null : item.test.id))}
                    onOpen={() => openTest(navigate, item.test)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function openTest(navigate: (path: string) => void, test: LearnerTestCard) {
  if (test.openAttemptId) {
    navigate(testAttemptPath(test.id, test.openAttemptId));
    return;
  }
  if (test.attemptsLeft === 0) {
    navigate(testIntroPath(test.id));
    return;
  }
  navigate(testIntroPath(test.id, { start: true }));
}

function FilterChip({ active, onClick, label, dot }: { active: boolean; onClick: () => void; label: string; dot?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold",
        active ? "bg-[#1C1B3A] text-white" : "bg-white text-[#3E3C55]",
      )}
    >
      {dot ? <span className={cn("size-1.5 rounded-full", active ? "bg-white" : dot)} /> : null}
      {label}
    </button>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded-[4px]", swatch)} aria-hidden />
      {label}
    </span>
  );
}

function Square({
  item,
  language,
  total,
  status,
  isFocus,
  open,
  onToggle,
  onOpen,
}: {
  item: NumberedTest;
  language: string;
  total: number;
  status: SquareStatus;
  isFocus: boolean;
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const test = item.test;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const node = buttonRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const width = 292;
      const height = 248;
      const sidebar = window.innerWidth >= 1024 ? 256 : 12;
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(sidebar, Math.min(left, window.innerWidth - width - 12));
      let top = rect.bottom + 10;
      if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 10);
      setBox({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const note =
    status === "halfway" && test.openProgress
      ? `Left halfway · question ${test.openProgress.question} of ${test.openProgress.total}`
      : status === "failed" && test.best?.missed != null && test.best.total
        ? `Not passed · ${test.best.missed} of ${test.best.total} missed`
        : status === "passed"
          ? "Passed"
          : isFocus
            ? "Not tried yet · this is where you stopped"
            : "Not tried yet";

  return (
    <div className="relative" data-test-square>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-label={`${STATUS_LABEL[status]}. Test ${item.label}. ${test.title}`}
        onClick={onToggle}
        className={cn(
          "relative grid size-11 place-items-center rounded-[10px] text-[11px] font-bold tabular-nums",
          status === "passed" && "bg-[#1F9D55] text-white",
          status === "failed" && "border border-[#F3B4C4] bg-[#FFF5F7] text-[#E11D48]",
          status === "next" && "bg-primary text-white shadow-[0_0_0_3px_#F3D7EE]",
          status === "halfway" && "bg-[#F8E7C8] text-[#8A5A12]",
          status === "fresh" && "border border-[#E4E0EA] bg-white text-[#6B6578]",
        )}
      >
        {item.label}
        {status === "failed" ? <span className="absolute -right-1 -top-1 size-2.5 rounded-full border border-white bg-[#E11D48]" /> : null}
      </button>
      {open && box
        ? createPortal(
            <div
              data-test-square
              className="fixed z-[80] w-[292px] rounded-[20px] border border-[#E7E4EE] bg-white p-4 text-left shadow-[0_18px_50px_rgba(28,27,58,0.18)]"
              style={{ top: box.top, left: box.left }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-bold tracking-[0.08em] text-[#8A8494]">
                  STEP {item.stepNumber} · TEST {item.label} OF {total}
                </p>
                <button type="button" aria-label="Close" onClick={onToggle} className="text-[#8A8494]">
                  <X className="size-3.5" />
                </button>
              </div>
              <p className="mt-1.5 font-solway text-[17px] font-bold leading-snug">{displayTestTitle(language, test.title)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <span className="rounded-2xl bg-[#F6F5F8] px-2 py-2.5 text-center text-[12px]">
                  <Clock className="mx-auto mb-1 size-3.5 text-[#8A8494]" aria-hidden />
                  <span className="block font-bold">{test.timeLimitMinutes ? `${test.timeLimitMinutes} min` : "No limit"}</span>
                  <span className="text-[#8A8494]">to complete</span>
                </span>
                <span className="rounded-2xl bg-[#F6F5F8] px-2 py-2.5 text-center text-[12px]">
                  <Target className="mx-auto mb-1 size-3.5 text-[#8A8494]" aria-hidden />
                  <span className="block font-bold">{test.passMark}%</span>
                  <span className="text-[#8A8494]">to pass</span>
                </span>
              </div>
              <button
                type="button"
                onClick={onOpen}
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-white"
              >
                <Play className="size-3.5 fill-current" aria-hidden />
                {test.openAttemptId ? "Continue" : test.best?.passed ? "Review" : test.best ? "Retry" : "Start test"}
              </button>
              <p className="mt-2.5 text-center text-[12px] text-[#8A8494]">{note}</p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-[#E7E4EE] bg-white p-8 text-center">
      <p className="font-solway text-lg font-bold">{title}</p>
      <p className="mt-1 text-sm text-[#5E5C72]">{body}</p>
      <Link to={PRIVATE_PATHS.TESTS} className="mt-4 inline-block text-sm font-semibold text-primary">
        Back to tests
      </Link>
    </div>
  );
}

