import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardList, Clock, Target, Waypoints } from "lucide-react";
import { LanguageMark, languageMark } from "@/features/tests/components/LanguageMark";
import { fetchVisibleTests } from "@/features/tests/api";
import { displayTestTitle, testCode } from "@/features/tests/board";
import { testAttemptPath, testIntroPath } from "@/features/tests/paths";
import type { LearnerTestCard } from "@/features/tests/types";
import { cn } from "@/lib/utils";
import type { LearningStats } from "@/api/learningStats";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import type { PathUnit, Pathway } from "../types";
import { StreakCard } from "./SideRail";

type PathRailProps = {
  pathway: Pathway;
  pathways: Pathway[];
  currentNodeId: string | null;
  currentLessonTitle: string | null;
  percents: Record<string, number>;
  onSelectPath: (id: string) => void;
  onViewAll?: () => void;
};

type CourseRecommendation = {
  unit: PathUnit;
  upcoming: LearnerTestCard[];
  failed: LearnerTestCard[];
  allPassed: boolean;
};

function orderedTests(list: LearnerTestCard[]) {
  return [...list].sort((a, b) => {
    const left = testCode(a.title);
    const right = testCode(b.title);
    if (left && right && (left.step !== right.step || left.item !== right.item)) {
      return left.step - right.step || left.item - right.item;
    }
    if (left && !right) return -1;
    if (!left && right) return 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id;
  });
}

/** Tests for the course the learner is on. Once that course is fully passed, the next course's tests. */
function recommendForCourse(
  pathway: Pathway,
  currentNodeId: string | null,
  tests: LearnerTestCard[],
): CourseRecommendation | null {
  const units = pathway.units.filter((unit) => unit.courseSlug);
  if (!units.length) return null;
  let start = units.findIndex((unit) => currentNodeId != null && unit.nodes.some((node) => node.id === currentNodeId));
  if (start < 0) start = 0;
  // Current course first, then later courses, then earlier ones.
  const orderedUnits = [...units.slice(start), ...units.slice(0, start)];
  let sawTests = false;
  for (const unit of orderedUnits) {
    const courseTests = orderedTests(tests.filter((test) => test.courseSlug === unit.courseSlug));
    if (!courseTests.length) continue;
    sawTests = true;
    const failed = courseTests.filter((test) => test.best && !test.best.passed);
    const upcoming = courseTests.filter((test) => !test.best);
    if (upcoming.length || failed.length) return { unit, upcoming, failed, allPassed: false };
  }
  if (!sawTests) return null;
  return { unit: units[start], upcoming: [], failed: [], allPassed: true };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function matchesLesson(test: LearnerTestCard, lessonTitle: string | null) {
  if (!lessonTitle) return false;
  const lesson = normalize(lessonTitle);
  if (lesson.length < 4) return false;
  const title = normalize(test.title);
  const detail = title.replace(/^\d+\s+\d+\s+/, "");
  return title.includes(lesson) || (detail.length >= 4 && lesson.includes(detail));
}

function testHeading(test: LearnerTestCard, unitTitle: string) {
  const language = (test.subcategory?.title || test.language || unitTitle.split(/[\s:·]/)[0] || "").trim();
  if (!testCode(test.title) || !language) return test.title;
  if (test.title.toLowerCase().startsWith(language.toLowerCase())) return test.title;
  return displayTestTitle(language, test.title);
}

function pathListCopy(pathway: Pathway) {
  const level = pathway.level ? pathway.level.charAt(0).toUpperCase() + pathway.level.slice(1) : "";
  const track = pathway.subcategoryTitle?.trim();
  const title = pathway.title.trim();
  if (track) {
    const rest = title.toLowerCase().startsWith(track.toLowerCase())
      ? title.slice(track.length).replace(/^[\s:–-]+/, "")
      : "";
    return { name: track, subtitle: rest || level || "Learning path" };
  }
  return { name: title, subtitle: level || "Learning path" };
}

function RailCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#E7E4EE] bg-white p-4 shadow-[0_8px_24px_-16px_rgba(28,27,58,0.35)]">
      {children}
    </section>
  );
}

export function RecommendedTestsCard({
  pathway,
  currentNodeId,
  currentLessonTitle,
}: {
  pathway: Pathway;
  currentNodeId: string | null;
  currentLessonTitle: string | null;
}) {
  const navigate = useNavigate();
  const [tests, setTests] = useState<LearnerTestCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchVisibleTests()
      .then((data) => {
        if (!cancelled) setTests(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setTests([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recommendation = useMemo(
    () => (tests ? recommendForCourse(pathway, currentNodeId, tests) : null),
    [tests, pathway, currentNodeId],
  );

  const openTest = (test: LearnerTestCard) => {
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

  const allUpcoming = recommendation?.upcoming ?? [];
  const allFailed = recommendation?.failed ?? [];
  const failed = allFailed.length > 0 ? allFailed.slice(0, 1) : [];
  const upcoming = allUpcoming.slice(0, allFailed.length > 0 ? 1 : 2);
  const hiddenUpcoming = allUpcoming.length - upcoming.length;

  return (
    <TestsRecommendationView
      loading={tests == null}
      empty={!recommendation}
      allPassed={!!recommendation?.allPassed}
      unitTitle={recommendation?.unit.title ?? ""}
      lessonTitle={currentLessonTitle}
      upcoming={upcoming}
      failed={failed}
      hiddenUpcoming={hiddenUpcoming}
      onOpen={openTest}
    />
  );
}

/** Same recommended-test list as the learning path, for one course. */
export function CourseRecommendedTests({
  courseSlug,
  courseTitle,
  lessonTitle,
}: {
  courseSlug: string | null;
  courseTitle: string;
  lessonTitle: string | null;
}) {
  const navigate = useNavigate();
  const [tests, setTests] = useState<LearnerTestCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchVisibleTests()
      .then((data) => {
        if (!cancelled) setTests(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setTests([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const courseTests = useMemo(
    () => (tests && courseSlug ? orderedTests(tests.filter((test) => test.courseSlug === courseSlug)) : []),
    [tests, courseSlug],
  );
  const failed = courseTests.filter((test) => test.best && !test.best.passed);
  const upcoming = courseTests.filter((test) => !test.best);
  const shownFailed = failed.length > 0 ? failed.slice(0, 1) : [];
  const shownUpcoming = upcoming.slice(0, failed.length > 0 ? 1 : 2);

  const openTest = (test: LearnerTestCard) => {
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

  return (
    <TestsRecommendationView
      loading={tests == null}
      empty={!courseSlug || (tests != null && courseTests.length === 0)}
      allPassed={courseTests.length > 0 && upcoming.length === 0 && failed.length === 0}
      unitTitle={courseTitle}
      lessonTitle={lessonTitle}
      upcoming={shownUpcoming}
      failed={shownFailed}
      hiddenUpcoming={upcoming.length - shownUpcoming.length}
      onOpen={openTest}
    />
  );
}

function TestsRecommendationView({
  loading,
  empty,
  allPassed,
  unitTitle,
  lessonTitle,
  upcoming,
  failed,
  hiddenUpcoming,
  onOpen,
}: {
  loading: boolean;
  empty: boolean;
  allPassed: boolean;
  unitTitle: string;
  lessonTitle: string | null;
  upcoming: LearnerTestCard[];
  failed: LearnerTestCard[];
  hiddenUpcoming: number;
  onOpen: (test: LearnerTestCard) => void;
}) {
  const navigate = useNavigate();

  return (
    <RailCard>
      <div className="flex items-center gap-1.5">
        <ClipboardList className="size-4 shrink-0 text-primary" aria-hidden />
        <h3 className="font-solway text-[15px] font-bold text-[#132050]">Recommended tests</h3>
      </div>
      <p className="mt-0.5 font-inter text-xs text-[#6B6578]">From this path, in the order you&apos;ll take them</p>

      {loading ? (
        <p className="mt-4 font-inter text-sm text-[#6B6578]">Checking tests for this course…</p>
      ) : empty ? (
        <p className="mt-4 font-inter text-sm text-[#6B6578]">No knowledge tests are linked to this course yet.</p>
      ) : allPassed ? (
        <p className="mt-4 font-inter text-sm text-[#6B6578]">You&apos;ve passed the tests for this course.</p>
      ) : (
        <div className="mt-3.5 space-y-3">
          {upcoming.length > 0 && (
            <div>
              <p className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                Up next in {unitTitle}
              </p>
              <ul className="mt-1 divide-y divide-[#EFE7F0]">
                {upcoming.map((test, index) => (
                  <TestRow
                    key={test.id}
                    test={test}
                    unitTitle={unitTitle}
                    index={index}
                    failed={false}
                    lessonTitle={lessonTitle}
                    onOpen={onOpen}
                  />
                ))}
              </ul>
              {hiddenUpcoming > 0 && (
                <p className="mt-1 px-1 font-inter text-xs text-[#6B6578]">
                  {hiddenUpcoming} more in this course
                </p>
              )}
            </div>
          )}
          {failed.length > 0 && (
            <div>
              <p className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-[#E11D48]">
                Needs another go
              </p>
              <ul className="mt-1 divide-y divide-[#F6D5DC]">
                {failed.map((test, index) => (
                  <TestRow
                    key={test.id}
                    test={test}
                    unitTitle={unitTitle}
                    index={index}
                    failed
                    lessonTitle={null}
                    onOpen={onOpen}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate(PRIVATE_PATHS.TESTS)}
        className="mt-3 inline-flex items-center gap-0.5 font-inter text-sm font-semibold text-primary hover:underline"
      >
        All knowledge tests
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </RailCard>
  );
}

function TestRow({
  test,
  unitTitle,
  index,
  failed,
  lessonTitle,
  onOpen,
}: {
  test: LearnerTestCard;
  unitTitle: string;
  index: number;
  failed: boolean;
  lessonTitle: string | null;
  onOpen: (test: LearnerTestCard) => void;
}) {
  const code = testCode(test.title)?.label ?? String(index + 1);
  const onThisLesson = !failed && matchesLesson(test, lessonTitle);
  const status = failed ? "Not passed yet" : onThisLesson ? "Lesson you're on" : index === 0 ? "Next in order" : "Coming up";
  const action = test.openAttemptId ? "Resume" : failed ? "Retry" : "Start";

  return (
    <li className={cn("flex items-center gap-2.5 py-2.5", failed && "bg-[#FFF1F2] px-2")}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg font-inter text-xs font-bold",
          failed ? "bg-[#FB7185] text-white" : "bg-primary text-white",
        )}
      >
        {code}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-inter text-[15px] font-bold leading-snug text-[#132050]">{testHeading(test, unitTitle)}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 font-inter text-xs leading-5 text-[#8A8496]">
          <span className={cn("font-medium", failed ? "text-[#E11D48]" : "text-[#6B6578]")}>{status}</span>
          {test.timeLimitMinutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="!size-2.5 shrink-0" strokeWidth={1.75} aria-hidden />
              {test.timeLimitMinutes} min
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Target className="!size-2.5 shrink-0" strokeWidth={1.75} aria-hidden />
            {test.passMark}% to pass
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => onOpen(test)}
        className="inline-flex h-8 shrink-0 items-center rounded-full bg-primary px-3.5 font-inter text-xs font-bold text-white transition hover:brightness-110"
      >
        {action}
      </button>
    </li>
  );
}

export function PathSidePanel({
  pathway,
  pathways,
  currentNodeId,
  currentLessonTitle,
  percents,
  stats,
  onSelectPath,
  onViewAll,
}: PathRailProps & { stats: LearningStats | null }) {
  return (
    <>
      <StreakCard stats={stats} />
      <RecommendedTestsCard
        pathway={pathway}
        currentNodeId={currentNodeId}
        currentLessonTitle={currentLessonTitle}
      />
      <OtherPathsCard
        pathway={pathway}
        pathways={pathways}
        percents={percents}
        onSelectPath={onSelectPath}
        onViewAll={onViewAll}
      />
    </>
  );
}

export function OtherPathsCard({
  pathway,
  pathways,
  percents,
  onSelectPath,
  onViewAll,
}: Omit<PathRailProps, "currentNodeId" | "currentLessonTitle">) {
  const others = pathways.filter((item) => item.id !== pathway.id);
  if (!others.length && !onViewAll) return null;

  return (
    <RailCard>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F3ECFE] text-[#6A55D8]">
          <Waypoints className="size-4" aria-hidden />
        </span>
        <div>
          <h3 className="font-solway text-base font-bold text-[#132050]">Other learning paths</h3>
          <p className="mt-0.5 font-inter text-xs text-[#6B6578]">Switch any time. Your place is saved.</p>
        </div>
      </div>

      {others.length > 0 && (
        <ul className="mt-3 divide-y divide-[#F1EDF3]">
          {others.map((item) => {
            const copy = pathListCopy(item);
            const percent = Math.max(0, Math.min(100, Math.round(percents[item.id] ?? 0)));
            const started = percent > 0;
            const mark = languageMark(copy.name);
            return (
              <li key={item.id} className="flex items-center gap-3 py-3 first:pt-1">
                <LanguageMark title={copy.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-inter text-sm font-bold text-[#132050]">{copy.name}</p>
                  <p className="truncate font-inter text-xs text-[#6B6578]">{copy.subtitle}</p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#F3EEF5]">
                    <div className={cn("h-full rounded-full", mark.className)} style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectPath(item.id)}
                  className="shrink-0 font-inter text-sm font-bold text-primary hover:underline"
                >
                  {started ? "Continue" : "Start"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {onViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className="mt-1 inline-flex items-center gap-1 font-inter text-sm font-semibold text-primary hover:underline"
        >
          View all paths
          <ChevronRight className="size-4" aria-hidden />
        </button>
      )}
    </RailCard>
  );
}
