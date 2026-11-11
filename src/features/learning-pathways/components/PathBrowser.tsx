import { useMemo, useState } from "react";
import { ArrowRight, Code2, Play, Plus } from "lucide-react";
import type { ApiLearningPath, ApiLearningPathBrowseCategory } from "@/api/learningPaths";
import { getCategoryIcon } from "@/data/courseCategories";
import { cn } from "@/lib/utils";
import { pathwayIcon } from "./icons";
import type { PathProgress } from "../lessonProgress";
import { pathwayId } from "../fromApi";

const LEVELS = [
  { key: "beginner", label: "Beginner", number: "1" },
  { key: "intermediate", label: "Intermediate", number: "2" },
  { key: "advanced", label: "Advanced", number: "3" },
] as const;

type LevelKey = (typeof LEVELS)[number]["key"];

type PathBrowserProps = {
  categories: ApiLearningPathBrowseCategory[];
  progressByPath: Record<string, PathProgress>;
  onOpenPath: (pathwayId: string) => void;
};

type CardModel = {
  pathwayId: string;
  api: ApiLearningPath;
  subcategoryId: number;
  subcategoryTitle: string;
  level: LevelKey | null;
  lessonCount: number;
  blurb: string;
  percent: number;
  started: boolean;
  completed: boolean;
};

type TrackTone = { iconBg: string; node: string; text: string; border: string };

const TONES: { test: RegExp; tone: TrackTone }[] = [
  { test: /python/, tone: { iconBg: "bg-[#3B82F6]", node: "bg-[#3B82F6]", text: "text-[#2563EB]", border: "border-[#3B82F6]" } },
  { test: /html/, tone: { iconBg: "bg-[#F97316]", node: "bg-[#F97316]", text: "text-[#EA580C]", border: "border-[#F97316]" } },
  { test: /javascript|\bjs\b/, tone: { iconBg: "bg-[#E8A317]", node: "bg-[#E8A317]", text: "text-[#D97706]", border: "border-[#E8A317]" } },
  { test: /c\+\+|cpp/, tone: { iconBg: "bg-[#7C3AED]", node: "bg-[#7C3AED]", text: "text-[#7C3AED]", border: "border-[#7C3AED]" } },
  { test: /math/, tone: { iconBg: "bg-[#2563EB]", node: "bg-[#2563EB]", text: "text-[#2563EB]", border: "border-[#2563EB]" } },
];

const FALLBACK_TONES: TrackTone[] = [
  { iconBg: "bg-[#9B3A86]", node: "bg-[#9B3A86]", text: "text-[#9B3A86]", border: "border-[#9B3A86]" },
  { iconBg: "bg-[#0F766E]", node: "bg-[#0F766E]", text: "text-[#0F766E]", border: "border-[#0F766E]" },
  { iconBg: "bg-[#B45309]", node: "bg-[#B45309]", text: "text-[#B45309]", border: "border-[#B45309]" },
];

function formatLevel(level: string | null | undefined) {
  if (!level) return null;
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function asLevel(level: string | null | undefined): LevelKey | null {
  const value = level?.toLowerCase();
  if (value === "beginner" || value === "intermediate" || value === "advanced") return value;
  return null;
}

function lessonCount(path: ApiLearningPath) {
  return path.units.reduce((n, unit) => n + unit.steps.reduce((m, step) => m + (step.lessonCount || 0), 0), 0);
}

function blurbFor(path: ApiLearningPath) {
  const step = path.units.flatMap((unit) => unit.steps).find((item) => item.description?.trim());
  if (step?.description?.trim()) return step.description.trim();
  const lessons = lessonCount(path);
  if (lessons > 0) return `${lessons} lesson${lessons === 1 ? "" : "s"} across this path.`;
  return "A guided sequence of courses.";
}

function toneFor(title: string, index: number): TrackTone {
  const found = TONES.find((entry) => entry.test.test(title.toLowerCase()));
  return found?.tone ?? FALLBACK_TONES[index % FALLBACK_TONES.length];
}

function buildCards(
  categories: ApiLearningPathBrowseCategory[],
  progressByPath: Record<string, PathProgress>,
): CardModel[] {
  const out: CardModel[] = [];
  for (const category of categories) {
    for (const sub of category.subcategories) {
      for (const path of sub.paths) {
        const id = pathwayId(path.id);
        const progress = progressByPath[id];
        const percent = progress?.percent ?? 0;
        const completed = !!progress && progress.totalCount > 0 && progress.completedCount === progress.totalCount;
        const started = percent > 0 || (progress?.completedCount ?? 0) > 0;
        out.push({
          pathwayId: id,
          api: path,
          subcategoryId: sub.id,
          subcategoryTitle: sub.title,
          level: asLevel(path.level),
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

type Track = {
  id: number;
  title: string;
  iconKey: string;
  blurb: string;
  core: { level: (typeof LEVELS)[number]; card: CardModel | null }[];
  extras: CardModel[];
};

function tracksFor(category: ApiLearningPathBrowseCategory, cards: CardModel[]): Track[] {
  return category.subcategories.map((sub) => {
    const mine = cards.filter((card) => card.subcategoryId === sub.id);
    const used = new Set<string>();
    const core = LEVELS.map((level) => {
      const card = mine.find((item) => item.level === level.key && !used.has(item.pathwayId)) ?? null;
      if (card) used.add(card.pathwayId);
      return { level, card };
    });
    const extras = mine.filter((card) => !used.has(card.pathwayId));
    const beginner = core.find((stop) => stop.card)?.card;
    return {
      id: sub.id,
      title: sub.title,
      iconKey: sub.icon || beginner?.api.icon || "code",
      blurb: beginner?.blurb || (sub.paths[0] ? blurbFor(sub.paths[0]) : "A guided sequence of courses."),
      core,
      extras,
    };
  }).filter((track) => track.core.some((stop) => stop.card) || track.extras.length > 0);
}

function preferredCard(track: Track): CardModel | null {
  const core = track.core.map((stop) => stop.card).filter((card): card is CardModel => !!card);
  const cards = [...core, ...track.extras];
  const inProgress = cards.find((card) => card.started && !card.completed);
  if (inProgress) return inProgress;
  const started = [...cards].reverse().find((card) => card.started);
  if (started) return started;
  return core[0] ?? track.extras[0] ?? null;
}

export function PathBrowser({ categories, progressByPath, onOpenPath }: PathBrowserProps) {
  const allCards = useMemo(() => buildCards(categories, progressByPath), [categories, progressByPath]);
  const [categoryId, setCategoryId] = useState<number | null>(categories[0]?.id ?? null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const activeCategory = categories.find((category) => category.id === categoryId) ?? categories[0] ?? null;
  const tracks = useMemo(
    () => (activeCategory ? tracksFor(activeCategory, allCards) : []),
    [activeCategory, allCards],
  );
  const continueCard = useMemo(() => {
    const started = allCards.filter((card) => card.started && !card.completed);
    if (!started.length) return null;
    return [...started].sort((a, b) => b.percent - a.percent)[0];
  }, [allCards]);

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 font-inter text-[#1C1B3A]">
      {continueCard ? (
        <section
          aria-label="Pick up where you left off"
          className="flex flex-wrap items-center gap-4 rounded-[28px] px-4 py-4 text-white sm:gap-5 sm:px-6 sm:py-5"
          style={{ background: "linear-gradient(100deg, #5C1F6E 0%, #8E347F 42%, #C026A0 100%)" }}
        >
          <ProgressRing percent={continueCard.percent} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-[0.12em] text-white/75">PICK UP WHERE YOU LEFT OFF</p>
            <h1 className="mt-1 truncate font-solway text-[22px] font-bold leading-tight sm:text-[26px]">{continueCard.api.title}</h1>
            <p className="mt-1 text-sm text-white/80">Next lesson is ready</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenPath(continueCard.pathwayId)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#1C1B3A] shadow-[0_1px_2px_rgba(28,27,58,0.08)] transition hover:bg-[#FBF7FA]"
          >
            <Play className="size-3.5 fill-current" aria-hidden />
            Resume lesson
          </button>
        </section>
      ) : null}

      <section aria-label="Your learning tracks" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-solway text-xl font-bold">Your learning tracks</h2>
          <div role="tablist" aria-label="Subject" className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const selected = category.id === activeCategory?.id;
              const Icon = getCategoryIcon(category.slug || category.title);
              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setCategoryId(category.id);
                    setExpanded(null);
                  }}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold",
                    selected
                      ? "bg-primary text-white"
                      : "border border-[#E6E2EA] bg-white text-[#3E3C55] hover:border-primary/40",
                  )}
                >
                  {/math/i.test(category.title) ? (
                    <Plus className="size-3.5" aria-hidden />
                  ) : /cod/i.test(category.title) ? (
                    <Code2 className="size-3.5" aria-hidden />
                  ) : (
                    <Icon className="size-3.5" aria-hidden />
                  )}
                  {category.title}
                </button>
              );
            })}
          </div>
        </div>

        {tracks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E7E4EE] px-4 py-12 text-center text-sm text-[#5E5C72]">
            No paths in this subject yet.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {tracks.map((track, index) => (
              <TrackCard
                key={track.id}
                track={track}
                tone={toneFor(track.title, index)}
                expanded={expanded === track.id}
                onToggleExtras={() => setExpanded((current) => (current === track.id ? null : track.id))}
                onOpenPath={onOpenPath}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 64;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const shown = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative grid size-16 shrink-0 place-items-center" aria-hidden>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="white"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(shown / 100) * circ} ${circ}`}
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums">{shown}%</span>
    </div>
  );
}

function TrackMark({ title, iconKey }: { title: string; iconKey: string }) {
  const name = title.toLowerCase();
  if (name.includes("python")) return <span className="font-mono text-[13px] font-bold leading-none">&gt;_</span>;
  if (name.includes("html")) return <span className="font-mono text-[13px] font-bold leading-none">&lt;/&gt;</span>;
  if (name.includes("javascript") || name === "js") return <span className="font-mono text-[13px] font-bold leading-none">{"{ }"}</span>;
  if (/c\+\+|cpp/.test(name)) return <span className="text-[13px] font-bold leading-none">C++</span>;
  const Icon = pathwayIcon(iconKey);
  return <Icon className="size-5" aria-hidden />;
}

function TrackCard({
  track,
  tone,
  expanded,
  onToggleExtras,
  onOpenPath,
}: {
  track: Track;
  tone: TrackTone;
  expanded: boolean;
  onToggleExtras: () => void;
  onOpenPath: (pathwayId: string) => void;
}) {
  const [hover, setHover] = useState<LevelKey | null>(null);
  const [pinned, setPinned] = useState<LevelKey | null>(null);
  const active = hover ?? pinned;
  const action = preferredCard(track);
  const started = track.core.some((stop) => stop.card?.started) || track.extras.some((card) => card.started);
  const fresh = !started;
  const openCard = track.core.find((stop) => stop.level.key === active)?.card ?? null;

  return (
    <article className={cn("relative flex flex-col gap-4 rounded-[20px] border border-[#E7E4EE] bg-white p-4 shadow-[0_1px_2px_rgba(28,27,58,0.04)] sm:p-5", openCard && "z-20")}>
      <div className="flex items-start gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px] text-white", tone.iconBg)}>
          <TrackMark title={track.title} iconKey={track.iconKey} />
        </span>
        <div className="min-w-0">
          <h3 className="font-solway text-lg font-bold leading-tight">{track.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-[#5E5C72]">{track.blurb}</p>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold tracking-[0.08em] text-[#9A94A3]">CORE PATH · TAP ANY LEVEL TO START THERE</p>
        <div className="mt-4 grid grid-cols-3">
            {track.core.map(({ level, card }, index) => {
              const hot = active === level.key && !!card;
              const lead = fresh && level.key === "beginner";
              const filled = !!card && !hot && (card.started || lead);
              return (
                <div
                  key={level.key}
                  className="relative"
                  onMouseEnter={() => card && setHover(level.key)}
                  onMouseLeave={() => setHover((current) => (current === level.key ? null : current))}
                >
                  <button
                    type="button"
                    disabled={!card}
                    aria-expanded={hot}
                    onClick={() => {
                      if (!card) return;
                      setPinned((current) => (current === level.key ? null : level.key));
                    }}
                    className="relative flex w-full flex-col items-center rounded-[18px] px-1.5 pb-1 text-center disabled:cursor-default"
                  >
                    {hot ? (
                      <span className="pointer-events-none absolute inset-x-0 -top-1.5 bottom-0 rounded-[18px] bg-[#FBF4F9] ring-1 ring-[#E7C0DE]" aria-hidden />
                    ) : null}
                    {index < track.core.length - 1 ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute left-1/2 top-4 z-[1] h-px w-full -translate-y-1/2 bg-[#E4E0EA]"
                      />
                    ) : null}
                    <span
                      className={cn(
                        "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
                        !card && "border-[#E7E4EE] bg-white text-[#C4BFCE]",
                        card && !filled && !hot && "border-[#DDD8E4] bg-white text-[#8A8494]",
                        filled && cn(tone.node, "border-transparent text-white"),
                        hot && cn("border-2 bg-white", tone.border, tone.text),
                      )}
                    >
                      {level.number}
                    </span>
                    <span className="relative z-10 mt-2.5 text-[13px] font-semibold leading-none text-[#1C1B3A]">{level.label}</span>
                    <span className="relative z-10 mt-1 line-clamp-2 min-h-8 text-[12px] leading-snug text-[#5E5C72]">
                      {card?.api.title ?? "—"}
                    </span>
                    <span className={cn("relative z-10 mt-1 inline-flex min-h-4 items-center gap-1 text-[12px] font-semibold", card?.started || lead ? tone.text : "text-[#8A8494]")}>
                      {!card ? null : card.started ? (
                        <>
                          <Play className="size-2.5 fill-current" aria-hidden />
                          {card.percent}%
                        </>
                      ) : lead ? (
                        "Most start here"
                      ) : card.lessonCount > 0 ? (
                        `${card.lessonCount} lessons`
                      ) : null}
                    </span>
                  </button>
                  {hot && card ? (
                    <>
                      <span
                        aria-hidden
                        className="absolute left-1/2 top-full z-40 -translate-x-1/2 border-x-[7px] border-b-[8px] border-x-transparent border-b-[#16152E]"
                      />
                      <LevelPopover
                        trackTitle={track.title}
                        levelNumber={LEVELS.findIndex((item) => item.key === level.key) + 1}
                        levelLabel={level.label}
                        card={card}
                        align={level.key === "beginner" ? "start" : level.key === "advanced" ? "end" : "center"}
                        onOpen={() => onOpenPath(card.pathwayId)}
                      />
                    </>
                  ) : null}
                </div>
              );
            })}
        </div>
      </div>

      {expanded && track.extras.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {track.extras.map((card) => (
            <li key={card.pathwayId}>
              <button
                type="button"
                onClick={() => onOpenPath(card.pathwayId)}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#F7F6FA] px-3 py-2.5 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{card.api.title}</span>
                  <span className="text-[11px] text-[#5E5C72]">
                    {formatLevel(card.level) || "Path"}
                    {card.lessonCount > 0 ? ` · ${card.lessonCount} lessons` : ""}
                    {card.started ? ` · ${card.percent}%` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-primary">{card.started ? "Continue" : "Start"}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        {track.extras.length > 0 ? (
          <button type="button" onClick={onToggleExtras} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80">
            View all {track.title} paths (+{track.extras.length} more)
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        ) : (
          <span />
        )}
        {action ? (
          <button
            type="button"
            onClick={() => onOpenPath(action.pathwayId)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1 rounded-full px-4 text-sm font-semibold",
              started
                ? "bg-primary text-white hover:bg-primary/90"
                : "border border-primary bg-white text-primary hover:bg-primary/5",
            )}
          >
            {started ? "Continue" : "Start"}
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function LevelPopover({
  trackTitle,
  levelNumber,
  levelLabel,
  card,
  align,
  onOpen,
}: {
  trackTitle: string;
  levelNumber: number;
  levelLabel: string;
  card: CardModel;
  align: "start" | "center" | "end";
  onOpen: () => void;
}) {
  return (
    <div
      role="dialog"
      data-level-popover
      aria-label={`${trackTitle} ${levelLabel}`}
      className={cn(
        "absolute top-[calc(100%+7px)] z-30 w-[17.5rem] max-w-[calc(100vw-3rem)] rounded-[16px] bg-[#16152E] p-4 text-left text-white shadow-[0_18px_40px_rgba(22,21,46,0.32)] before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:content-['']",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
      )}
    >
      <p className="text-[11px] font-bold tracking-[0.08em] text-white/55">
        {trackTitle.toUpperCase()} · LEVEL {levelNumber}
      </p>
      <p className="mt-1.5 font-solway text-[18px] font-bold leading-tight">{card.api.title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">
        {card.lessonCount > 0 ? `${card.lessonCount} lessons. ` : ""}
        {card.blurb}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3.5 inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-white text-sm font-bold text-[#1C1B3A]"
      >
        {card.started ? `Continue ${levelLabel}` : `Start ${levelLabel}`}
      </button>
    </div>
  );
}
