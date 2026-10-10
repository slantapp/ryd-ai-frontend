import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Flag, Loader2, Map as MapIcon, Play, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchVisibleLearningPaths, type ApiLearningPath } from "@/api/learningPaths";
import { fetchLearningStats, type LearningStats } from "@/api/learningStats";
import { getCurriculumEntryBySlug } from "@/data/curriculumData";
import { loadV2LessonDraft } from "@/features/curriculum-preview/v2/lessonPersist";
import { useCoursesStore } from "@/stores/coursesStore";
import { buildPathway, type BuiltPathway } from "./fromApi";
import { computePathProgress, type PathProgress } from "./lessonProgress";
import { findNode } from "./progress";
import { usePathwayUi } from "./store";
import type { Badge, PathNodeState, PathUnit, Pathway } from "./types";
import { UnitSection } from "./components/UnitSection";
import { PathwaySwitcher } from "./components/PathwaySwitcher";
import { CelebrationModal, type CelebrationData } from "./components/Celebration";
import { GuidebookDialog } from "./components/GuidebookDialog";
import { PATHWAY_ICONS } from "./components/icons";
import { BadgesCard, DailyGoalCard, StatChips, StreakCard } from "./components/SideRail";
import "./pathways.css";

/** v2 courses keep the current beat in a local draft that can be ahead of the saved one. */
function v2DraftBeat(slug: string, lessonId: string): number | undefined {
  try {
    return loadV2LessonDraft(window.localStorage, slug, lessonId)?.beatIndex;
  } catch {
    return undefined;
  }
}

/** Loads published learning paths, the courses they use, course progress and learning stats. */
export default function LearningPathwaysPage() {
  const [apiPaths, setApiPaths] = useState<ApiLearningPath[] | null>(null);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const courseProgress = useCoursesStore((s) => s.courseProgress);
  const curriculaRevision = useCoursesStore((s) => s.curriculaRevision);
  const curriculaFetched = useCoursesStore((s) => s.curriculaFetched);

  const refreshStats = useCallback(() => {
    fetchLearningStats()
      .then((res) => setStats(res?.data ?? null))
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const courses = useCoursesStore.getState();
    // Lessons come from the curriculum JSON; progress from the server (refreshed after a course).
    if (!courses.curriculaFetched) void courses.fetchVisibleCurriculums();
    void courses.fetchAllCourseProgress();
    refreshStats();
    fetchVisibleLearningPaths()
      .then((res) => {
        if (!cancelled) setApiPaths(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshStats]);

  const built = useMemo<BuiltPathway[]>(() => {
    if (!apiPaths) return [];
    return apiPaths
      .map((p) => buildPathway(p, (slug) => getCurriculumEntryBySlug(slug)?.curriculum))
      .filter((b) => b.pathway.units.length > 0);
    // curriculaRevision: rebuild when visible curricula finish loading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiPaths, curriculaRevision]);

  const progressByPath = useMemo(() => {
    const out: Record<string, PathProgress> = {};
    for (const b of built) {
      out[b.pathway.id] = computePathProgress(b.outlines, (slug) => courseProgress[slug], v2DraftBeat);
    }
    return out;
  }, [built, courseProgress]);

  if (error) {
    return <PathwayMessage title="Couldn't load learning paths" body="Check your connection and refresh the page." />;
  }
  if (!apiPaths || (apiPaths.length > 0 && !curriculaFetched)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[#4F4D55]">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading learning paths…
      </div>
    );
  }
  if (!built.length) {
    return (
      <PathwayMessage
        title="No learning paths yet"
        body="Learning paths will appear here once they're published. Meanwhile, explore all courses."
      />
    );
  }
  return <PathwayJourney built={built} progressByPath={progressByPath} stats={stats} />;
}

function PathwayMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[#F3ECFE]">
        <MapIcon className="size-7 text-[#AA468E]" />
      </span>
      <h1 className="app-type-page-title mt-4">{title}</h1>
      <p className="app-type-page-subtitle mt-2">{body}</p>
    </div>
  );
}

function PathwayJourney({
  built,
  progressByPath,
  stats,
}: {
  built: BuiltPathway[];
  progressByPath: Record<string, PathProgress>;
  stats: LearningStats | null;
}) {
  const navigate = useNavigate();
  const ui = usePathwayUi();
  const pathways = useMemo(() => built.map((b) => b.pathway), [built]);
  const pathway = pathways.find((p) => p.id === ui.activePathwayId) ?? pathways[0];
  const progress = progressByPath[pathway.id];

  const states = useMemo(() => {
    const out: Record<string, PathNodeState> = {};
    for (const [id, p] of Object.entries(progress.byNode)) out[id] = p.state;
    return out;
  }, [progress]);
  const stars = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, p] of Object.entries(progress.byNode)) out[id] = p.stars;
    return out;
  }, [progress]);
  const percents = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of pathways) out[p.id] = progressByPath[p.id]?.percent ?? 0;
    return out;
  }, [pathways, progressByPath]);

  const currentNodeId = progress.currentNodeId;
  const currentNode = currentNodeId ? findNode(pathway, currentNodeId) : undefined;

  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [startingNodeId, setStartingNodeId] = useState<string | null>(null);
  const [justUnlockedId, setJustUnlockedId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [guideUnit, setGuideUnit] = useState<PathUnit | null>(null);
  const [jumpDirection, setJumpDirection] = useState<"up" | "down" | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const nodeEls = useRef(new Map<string, HTMLButtonElement>());
  const timers = useRef<number[]>([]);

  const nodeRef = useCallback(
    (nodeId: string) => (el: HTMLButtonElement | null) => {
      if (el) nodeEls.current.set(nodeId, el);
      else nodeEls.current.delete(nodeId);
    },
    [],
  );

  const scrollToNode = useCallback((nodeId: string | null, behavior: ScrollBehavior = "smooth") => {
    if (!nodeId) return;
    nodeEls.current.get(nodeId)?.scrollIntoView({ block: "center", behavior });
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Lessons finished since the last visit: celebrate the latest once. On the very first visit,
  // lessons finished earlier are recorded quietly. Streak numbers come from the server.
  const completedIds = useMemo(
    () => Object.entries(progress.byNode).filter(([, p]) => p.state === "completed").map(([id]) => id),
    [progress],
  );
  useEffect(() => {
    if (!completedIds.length) return;
    if (!ui.hasVisited(pathway.id)) {
      ui.markSeen(pathway.id, completedIds);
      return;
    }
    const seen = new Set(ui.seen[pathway.id] ?? []);
    const newlyDone = completedIds.filter((id) => !seen.has(id));
    if (!newlyDone.length) return;
    ui.markSeen(pathway.id, newlyDone);
    const lastId = newlyDone[newlyDone.length - 1];
    const node = findNode(pathway, lastId);
    const unit = pathway.units.find((u) => u.nodes.some((n) => n.id === lastId));
    if (node && unit) {
      setCelebration({
        node,
        palette: unit.palette,
        stars: progress.byNode[lastId]?.stars ?? 3,
        replay: false,
        result: {
          streak: stats?.streak ?? 0,
          streakExtended: !!stats?.activeToday,
          dailyGoalReached: !!stats?.today.goalReached,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathway.id, completedIds.join("|")]);

  // Land on the current lesson whenever the pathway changes.
  useEffect(() => {
    setOpenNodeId(null);
    const id = requestAnimationFrame(() => scrollToNode(currentNodeId, "auto"));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathway.id]);

  // Show a "back to my lesson" button when the current node is off-screen.
  useEffect(() => {
    const el = currentNodeId ? nodeEls.current.get(currentNodeId) : null;
    if (!el) {
      setJumpDirection(null);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setJumpDirection(null);
      else setJumpDirection(entry.boundingClientRect.top < 0 ? "up" : "down");
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [currentNodeId, pathway.id]);

  // Close the popover on outside click / Escape.
  useEffect(() => {
    if (!openNodeId) return;
    const onPointer = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest("[data-lp-row]")) setOpenNodeId(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenNodeId(null);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openNodeId]);

  // Each lesson belongs to a course; the course runner resumes where the learner left off.
  const handleStart = (nodeId: string) => {
    const node = findNode(pathway, nodeId);
    if (!node?.slug || states[nodeId] === "locked") return;
    setStartingNodeId(nodeId);
    navigate(`/courses/${node.slug}`);
  };

  const handleContinue = () => {
    setCelebration(null);
    if (!currentNodeId) return;
    setJustUnlockedId(currentNodeId);
    timers.current.push(
      window.setTimeout(() => scrollToNode(currentNodeId), 200),
      window.setTimeout(() => setJustUnlockedId(null), 1200),
    );
  };

  const continueCurrent = () => {
    if (!currentNodeId) return;
    scrollToNode(currentNodeId);
    timers.current.push(window.setTimeout(() => setOpenNodeId(currentNodeId), 350));
  };

  const finished = progress.totalCount > 0 && progress.completedCount === progress.totalCount;
  const badges: Badge[] = useMemo(
    () => [
      ...(stats?.badges ?? []),
      {
        id: "graduate",
        title: "Graduate",
        description: "Finish a whole learning path",
        icon: "graduation",
        unlocked: Object.values(progressByPath).some((p) => p.totalCount > 0 && p.completedCount === p.totalCount),
      },
    ],
    [stats, progressByPath],
  );

  const PathIcon = PATHWAY_ICONS[pathway.icon];

  return (
    <div className="min-h-full">
      <div className="mx-auto grid max-w-[1180px] gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {/* Header */}
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="app-type-eyebrow">Learning Path</p>
              <h1 className="app-type-page-title mt-1">Chart your course, one lesson at a time.</h1>
              <p className="app-type-page-subtitle mt-1 max-w-lg">
                Every lesson lights up as you learn it, and glows gold once you&apos;ve finished its practice questions.
              </p>
            </div>
            <StatChips stats={stats} />
          </header>

          <div className="mt-5">
            <PathwaySwitcher
              pathways={pathways}
              activeId={pathway.id}
              percents={percents}
              onSelect={ui.setActivePathway}
            />
          </div>

          {/* The journey — one immersive night-sky canvas */}
          <div
            key={pathway.id}
            className="lp-rise lp-sky relative mt-5 overflow-clip rounded-[32px] px-4 pb-12 pt-5 sm:px-8 sm:pt-7"
          >
            <span
              className="lp-drift pointer-events-none absolute -left-24 top-10 size-80 rounded-full opacity-40 blur-3xl"
              style={{ background: pathway.palette.base }}
              aria-hidden
            />
            <span
              className="lp-drift pointer-events-none absolute -right-24 top-[38%] size-80 rounded-full bg-[#0063F7] opacity-25 blur-3xl"
              style={{ animationDelay: "-8s" }}
              aria-hidden
            />
            <span
              className="lp-drift pointer-events-none absolute -left-10 bottom-20 size-72 rounded-full bg-[#AA468E] opacity-25 blur-3xl"
              style={{ animationDelay: "-4s" }}
              aria-hidden
            />

            {/* Journey header */}
            <div className="lp-glass relative flex flex-wrap items-center gap-4 rounded-[22px] p-4 sm:p-5">
              <JourneyRing percent={progress.percent} palette={pathway.palette}>
                <PathIcon className="size-6 text-white" strokeWidth={2.1} />
              </JourneyRing>
              <div className="min-w-0 flex-1">
                <p className="font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-[#DDA5D2]">
                  Your journey · {progress.completedCount}/{progress.totalCount} lessons · {progress.percent}%
                </p>
                <h2 className="mt-0.5 truncate font-solway text-xl font-bold text-white sm:text-2xl">{pathway.title}</h2>
                <p className="mt-0.5 truncate font-inter text-sm text-[#F3ECFE]/70">
                  {finished ? "Every lesson complete. You're a legend!" : currentNode ? `Up next: ${currentNode.title}` : pathway.tagline}
                </p>
              </div>
              {!finished && currentNodeId && (
                <button
                  type="button"
                  onClick={continueCurrent}
                  className="lp-shine group flex h-11 items-center gap-2 rounded-full bg-white pl-5 pr-2.5 font-solway text-sm font-bold text-[#132050] shadow-[0_10px_30px_-10px_rgba(221,165,210,0.9)] transition-transform duration-200 hover:scale-[1.03] active:scale-95 max-sm:w-full max-sm:justify-center"
                >
                  {progress.completedCount === 0 ? "Begin journey" : "Continue"}
                  <span
                    className="flex size-7 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-0.5"
                    style={{ background: `linear-gradient(135deg, ${pathway.palette.accent}, ${pathway.palette.base})` }}
                  >
                    <Play className="size-3" fill="currentColor" />
                  </span>
                </button>
              )}
            </div>

            <div className="relative mt-12 space-y-16">
              {pathway.units.map((unit, i) => {
                const course = unit.courseSlug ? progress.byCourse[unit.courseSlug] : undefined;
                const holdsUpNext = !!currentNodeId && unit.nodes.some((n) => n.id === currentNodeId);
                const collapsed = !!course && !course.started && !holdsUpNext && !expanded.has(unit.id);
                return (
                  <UnitSection
                    key={unit.id}
                    unit={unit}
                    unitNumber={i + 1}
                    states={states}
                    stars={stars}
                    openNodeId={openNodeId}
                    startingNodeId={startingNodeId}
                    justUnlockedId={justUnlockedId}
                    nodeRef={nodeRef}
                    onToggleNode={(id) => setOpenNodeId((cur) => (cur === id ? null : id))}
                    onStartNode={handleStart}
                    onOpenGuide={setGuideUnit}
                    progressByNode={progress.byNode}
                    upNextNodeId={currentNodeId}
                    percent={course?.percent}
                    collapsed={collapsed}
                    onExpand={() => setExpanded((prev) => new Set(prev).add(unit.id))}
                  />
                );
              })}
            </div>

            <FinishLine finished={finished} title={pathway.title} />

            {jumpDirection && (
              <div className="pointer-events-none sticky bottom-5 z-40 -mb-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => scrollToNode(currentNodeId)}
                  className="lp-pop lp-glass pointer-events-auto flex h-11 items-center gap-2 rounded-full pl-3 pr-4 font-inter text-xs font-bold text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition-transform hover:scale-105 active:scale-95"
                  aria-label="Jump to your current lesson"
                >
                  {jumpDirection === "up" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                  Back to my lesson
                </button>
              </div>
            )}
          </div>

          {/* Rail content below the map on smaller screens */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:hidden">
            <StreakCard stats={stats} />
            <DailyGoalCard stats={stats} />
            <div className="sm:col-span-2">
              <BadgesCard badges={badges} />
            </div>
          </div>
        </div>

        <aside className="hidden flex-col gap-4 xl:flex">
          <StreakCard stats={stats} />
          <DailyGoalCard stats={stats} />
          <BadgesCard badges={badges} />
        </aside>
      </div>

      <CelebrationModal data={celebration} onContinue={handleContinue} />
      <GuidebookDialog unit={guideUnit} onClose={() => setGuideUnit(null)} />
    </div>
  );
}

function JourneyRing({
  percent,
  palette,
  children,
}: {
  percent: number;
  palette: Pathway["palette"];
  children: React.ReactNode;
}) {
  const r = 27;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex size-16 shrink-0 items-center justify-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 size-16 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(243,236,254,0.14)" strokeWidth="4" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={palette.accent}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${palette.accent})` }}
        />
      </svg>
      <span
        className="flex size-11 items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 32% 26%, ${palette.accent}, ${palette.base} 55%, ${palette.shade})`,
          boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.35)",
        }}
      >
        {children}
      </span>
    </div>
  );
}

function FinishLine({ finished, title }: { finished: boolean; title: string }) {
  return (
    <div className="relative mt-16 flex flex-col items-center text-center">
      <div className="relative">
        {finished && <span className="lp-glow absolute -inset-6 rounded-full bg-[#F5C04A] blur-2xl" aria-hidden />}
        <div
          className={cn("lp-hex relative flex size-24 items-center justify-center", finished && "lp-float")}
          style={{
            background: finished
              ? "radial-gradient(circle at 32% 26%, #FCE3A0, #F5C04A 50%, #D9902A)"
              : "rgba(243,236,254,0.08)",
          }}
        >
          {finished ? (
            <Trophy className="size-11 text-white drop-shadow" />
          ) : (
            <Flag className="size-9 text-[#F3ECFE]/35" />
          )}
        </div>
      </div>
      <p className="mt-4 font-solway text-lg font-bold text-white">{finished ? `${title} complete!` : "The summit"}</p>
      <p className="mt-1 max-w-xs font-inter text-sm text-[#F3ECFE]/60">
        {finished
          ? "You earned the Graduate badge. Choose a new learning path to keep your flame glowing."
          : `Finish every lesson and its practice to earn your ${title} Graduate badge.`}
      </p>
    </div>
  );
}
