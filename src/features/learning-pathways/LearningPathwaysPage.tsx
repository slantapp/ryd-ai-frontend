import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Flag, Loader2, Map as MapIcon, Trophy } from "lucide-react";
import {
  fetchLearningPathBrowse,
  fetchVisibleLearningPaths,
  type ApiLearningPath,
  type ApiLearningPathBrowseCategory,
} from "@/api/learningPaths";
import { fetchLearningStats, type LearningStats } from "@/api/learningStats";
import { getCurriculumEntryBySlug } from "@/data/curriculumData";
import { loadV2LessonDraft } from "@/features/curriculum-preview/v2/lessonPersist";
import { useCoursesStore } from "@/stores/coursesStore";
import { buildPathway, pathwayId, type BuiltPathway } from "./fromApi";
import { computePathProgress, type PathProgress } from "./lessonProgress";
import { findNode } from "./progress";
import { usePathwayUi } from "./store";
import type { PathNodeState, PathUnit, Pathway } from "./types";
import { UnitSection } from "./components/UnitSection";
import { PathBrowser } from "./components/PathBrowser";
import { CelebrationModal, type CelebrationData } from "./components/Celebration";
import { GuidebookDialog } from "./components/GuidebookDialog";
import { PathStickyBar } from "./components/PathStickyBar";
import { PathSidePanel } from "./components/PathRail";
import "./pathways.css";

/** v2 courses keep the current beat in a local draft that can be ahead of the saved one. */
function v2DraftBeat(slug: string, lessonId: string): number | undefined {
  try {
    return loadV2LessonDraft(window.localStorage, slug, lessonId)?.beatIndex;
  } catch {
    return undefined;
  }
}

function flattenBrowsePaths(categories: ApiLearningPathBrowseCategory[]): ApiLearningPath[] {
  const byId = new Map<number, ApiLearningPath>();
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      for (const path of sub.paths) {
        byId.set(path.id, {
          ...path,
          category: path.category ?? {
            id: cat.id,
            title: cat.title,
            slug: cat.slug,
            icon: cat.icon,
          },
          subcategory: path.subcategory ?? {
            id: sub.id,
            title: sub.title,
            slug: sub.slug,
            icon: sub.icon,
            categoryId: cat.id,
          },
        });
      }
    }
  }
  return [...byId.values()];
}

/** Loads published learning paths, the courses they use, course progress and learning stats. */
export default function LearningPathwaysPage() {
  const [apiPaths, setApiPaths] = useState<ApiLearningPath[] | null>(null);
  const [browseCategories, setBrowseCategories] = useState<ApiLearningPathBrowseCategory[] | null>(null);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const courseProgress = useCoursesStore((s) => s.courseProgress);
  const curriculaRevision = useCoursesStore((s) => s.curriculaRevision);
  const curriculaFetched = useCoursesStore((s) => s.curriculaFetched);
  const fullCurriculaRevision = useCoursesStore((s) => s.fullCurriculaRevision);
  /** The course list has no lessons; the path's courses are loaded by slug before building. */
  const [pathCoursesLoaded, setPathCoursesLoaded] = useState(false);
  const ui = usePathwayUi();

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
    Promise.all([fetchVisibleLearningPaths(), fetchLearningPathBrowse()])
      .then(([visibleRes, browseRes]) => {
        if (cancelled) return;
        const browse = Array.isArray(browseRes?.data) ? browseRes.data : [];
        const fromBrowse = flattenBrowsePaths(browse);
        const visible = Array.isArray(visibleRes?.data) ? visibleRes.data : [];
        const byId = new Map<number, ApiLearningPath>();
        for (const p of visible) byId.set(p.id, p);
        for (const p of fromBrowse) byId.set(p.id, { ...byId.get(p.id), ...p });
        setBrowseCategories(browse);
        setApiPaths([...byId.values()]);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshStats]);

  useEffect(() => {
    if (!apiPaths) return;
    let cancelled = false;
    const slugs = new Set(apiPaths.flatMap((p) => p.units.flatMap((u) => u.steps.map((step) => step.slug))));
    const { ensureCurriculum } = useCoursesStore.getState();
    // A course that fails to load is left out, as before when its JSON was missing.
    void Promise.all([...slugs].map((slug) => ensureCurriculum(slug))).then(() => {
      if (!cancelled) setPathCoursesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [apiPaths]);

  const built = useMemo<BuiltPathway[]>(() => {
    if (!apiPaths || !pathCoursesLoaded) return [];
    return apiPaths
      .map((p) => buildPathway(p, (slug) => getCurriculumEntryBySlug(slug)?.curriculum))
      .filter((b) => b.pathway.units.length > 0);
    // Revisions: rebuild when the list or a path course finishes loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiPaths, pathCoursesLoaded, curriculaRevision, fullCurriculaRevision]);

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
  const loading = (
    <div className="flex min-h-[50vh] items-center justify-center text-[#4F4D55]">
      <Loader2 className="mr-2 size-5 animate-spin" /> Loading learning paths…
    </div>
  );
  if (!apiPaths || browseCategories == null || (apiPaths.length > 0 && !curriculaFetched)) {
    return loading;
  }
  if (!apiPaths.length) {
    return (
      <PathwayMessage
        title="No learning paths yet"
        body="Learning paths will appear here once they're published. Meanwhile, explore all courses."
      />
    );
  }

  const activeBuilt = built.find((b) => b.pathway.id === ui.activePathwayId);
  // A path the learner already opened: wait for its courses rather than flash the browser.
  const reopeningPath =
    !pathCoursesLoaded && apiPaths.some((p) => pathwayId(p.id) === ui.activePathwayId);
  // The browser only needs the browse data; course lessons load in the background and
  // fill in each card's progress when they arrive.
  const showBrowser = !activeBuilt && browseCategories.length > 0 && !reopeningPath;

  if (showBrowser) {
    return (
      <PathBrowser
        categories={browseCategories}
        progressByPath={progressByPath}
        onOpenPath={ui.setActivePathway}
      />
    );
  }

  // The journey draws every lesson, so it needs the path's courses loaded by slug.
  if (!pathCoursesLoaded) return loading;
  if (!built.length) {
    return (
      <PathwayMessage
        title="No learning paths yet"
        body="Learning paths will appear here once they're published. Meanwhile, explore all courses."
      />
    );
  }

  return (
    <PathwayJourney
      built={built}
      progressByPath={progressByPath}
      stats={stats}
      onBackToBrowse={browseCategories.length > 0 ? () => ui.setActivePathway("") : undefined}
    />
  );
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
  onBackToBrowse,
}: {
  built: BuiltPathway[];
  progressByPath: Record<string, PathProgress>;
  stats: LearningStats | null;
  onBackToBrowse?: () => void;
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

  // Open the current lesson as soon as the path is on screen, so "Begin journey" is not a separate tap.
  useEffect(() => {
    setOpenNodeId(currentNodeId);
    const id = requestAnimationFrame(() => scrollToNode(currentNodeId, "auto"));
    return () => cancelAnimationFrame(id);
  }, [pathway.id, currentNodeId, scrollToNode]);

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
    navigate(`/courses/${node.slug}`, { state: { autoStartLesson: true } });
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
  const position = pathPosition(pathway, currentNodeId);

  return (
    <div className="min-h-full">
      <div className="mx-auto grid max-w-[1180px] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <PathStickyBar
            pathway={pathway}
            pathways={pathways}
            percent={progress.percent}
            unitNumber={position.unitNumber}
            unitTotal={position.unitTotal}
            lessonNumber={position.lessonNumber}
            lessonTotal={position.lessonTotal}
            finished={finished}
            onBack={onBackToBrowse}
            onSelectPath={ui.setActivePathway}
            onUpNext={!finished && currentNodeId ? continueCurrent : undefined}
          />

          {/* The journey — one calm white canvas */}
          <div
            key={pathway.id}
            className="lp-rise relative overflow-clip rounded-[32px] border border-[#EADCE8] bg-linear-to-b from-[#FBF3FA] via-white to-white px-4 pb-12 pt-8 shadow-[0_10px_30px_-14px_rgba(170,70,142,0.22)] sm:px-8"
          >
            {/* Faint polka dots behind the trail */}
            <div className="lp-dots pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />

            <div className="relative space-y-16">
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
                  className="lp-pop pointer-events-auto flex h-11 items-center gap-2 rounded-full border border-[#EADCE8] bg-white pl-3 pr-4 font-inter text-xs font-bold text-[#132050] shadow-[0_6px_20px_-8px_rgba(170,70,142,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#FAF5FB] active:scale-95"
                  aria-label="Jump to your current lesson"
                >
                  {jumpDirection === "up" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                  Back to my lesson
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Below the map on small screens; a sticky column beside it on wide screens. */}
        <aside className="mt-6 flex flex-col gap-4 xl:sticky xl:top-1 xl:mt-0 xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto scrollbar-hide">
          <PathSidePanel
            pathway={pathway}
            pathways={pathways}
            currentNodeId={currentNodeId}
            currentLessonTitle={currentNode?.title ?? null}
            percents={percents}
            stats={stats}
            onSelectPath={ui.setActivePathway}
            onViewAll={onBackToBrowse}
          />
        </aside>
      </div>

      <CelebrationModal data={celebration} onContinue={handleContinue} />
      <GuidebookDialog unit={guideUnit} onClose={() => setGuideUnit(null)} />
    </div>
  );
}

function pathPosition(pathway: Pathway, currentNodeId: string | null) {
  const nodes = pathway.units.flatMap((unit) => unit.nodes);
  const lessonTotal = nodes.length;
  const index = currentNodeId ? nodes.findIndex((node) => node.id === currentNodeId) : -1;
  const lessonNumber = index >= 0 ? index + 1 : lessonTotal;

  let unitTotal = 0;
  const unitNumberById = new Map<string, number>();
  for (const unit of pathway.units) {
    if (unit.sectionTitle) unitTotal += 1;
    unitNumberById.set(unit.id, Math.max(unitTotal, 1));
  }
  if (!unitTotal) unitTotal = pathway.units.length || 1;
  const currentUnit =
    (currentNodeId && pathway.units.find((unit) => unit.nodes.some((node) => node.id === currentNodeId))) ||
    pathway.units[pathway.units.length - 1];
  return {
    lessonNumber: lessonNumber || 0,
    lessonTotal,
    unitNumber: currentUnit ? (unitNumberById.get(currentUnit.id) ?? 1) : 1,
    unitTotal,
  };
}

function FinishLine({ finished, title }: { finished: boolean; title: string }) {
  return (
    <div className="relative mx-auto mt-16 flex max-w-md flex-col items-center rounded-3xl border border-[#F8E2A0] bg-linear-to-b from-[#FFFBEB] to-white px-6 pb-7 pt-8 text-center shadow-[0_6px_20px_-10px_rgba(217,144,42,0.3)]">
      <div className="relative">
        <div
          className="lp-hex relative flex size-24 items-center justify-center"
          style={{ background: finished ? "#F5C04A" : "#FEF3C7" }}
        >
          {finished ? <Trophy className="size-11 text-[#132050]" /> : <Flag className="size-10 text-[#92400E]" />}
        </div>
      </div>
      <p className="mt-4 font-solway text-lg font-bold text-[#132050]">{finished ? `${title} complete!` : "The summit"}</p>
      <p className="mt-1 max-w-xs font-inter text-sm text-[#5C5468]">
        {finished
          ? "You earned the Graduate badge. Choose a new learning path to keep your flame glowing."
          : `Finish every lesson and its practice to earn your ${title} Graduate badge.`}
      </p>
    </div>
  );
}
