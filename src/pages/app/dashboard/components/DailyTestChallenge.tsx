import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { fetchVisibleLearningPaths, type ApiLearningPath } from "@/api/learningPaths";
import type { DashboardPath, DashboardResume } from "@/api/dashboard";
import { fetchVisibleTests } from "@/features/tests/api";
import { shortTestTitle } from "@/features/tests/board";
import { testAttemptPath, testIntroPath } from "@/features/tests/paths";
import type { LearnerTestCard } from "@/features/tests/types";
import { PRIVATE_PATHS } from "@/utils/routePaths";

type Challenge = {
  test: LearnerTestCard;
  courseTitle: string;
  source: string;
};

function unfinished(test: LearnerTestCard): boolean {
  return !test.best?.passed && test.attemptsLeft !== 0;
}

function byOrder(a: LearnerTestCard, b: LearnerTestCard): number {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id;
}

/** First test on this course the learner has not passed yet. */
function nextForCourse(tests: LearnerTestCard[], slug: string): LearnerTestCard | null {
  return tests.filter((test) => test.courseSlug === slug && unfinished(test)).sort(byOrder)[0] ?? null;
}

function pathCourseSlugs(path: ApiLearningPath): string[] {
  const slugs: string[] = [];
  for (const unit of path.units) {
    for (const step of unit.steps) {
      if (step.slug && !slugs.includes(step.slug)) slugs.push(step.slug);
    }
  }
  return slugs;
}

/**
 * One challenge from the course they are on, then from the rest of their learning path.
 * Stays on the same test until they pass it.
 */
export function pickDailyChallenge(
  tests: LearnerTestCard[],
  learningPaths: ApiLearningPath[],
  dashboardPaths: DashboardPath[],
  resume: DashboardResume[],
  activePathId: number | null,
): Challenge | null {
  const titles = new Map<string, string>();
  for (const item of resume) titles.set(item.slug, item.title);

  const active = dashboardPaths.find((path) => path.id === activePathId) ?? dashboardPaths[0] ?? null;
  const taking: string[] = [];
  const addTaking = (slug: string | null | undefined) => {
    if (slug && !taking.includes(slug)) taking.push(slug);
  };
  addTaking(active?.nextCourse?.slug);
  for (const item of resume) addTaking(item.slug);

  const relevantIds = new Set(
    dashboardPaths.filter((path) => path.started || path.finished || path.id === active?.id).map((path) => path.id),
  );
  const pathSlugs: string[] = [];
  const pathName = new Map<string, string>();
  for (const path of learningPaths) {
    if (relevantIds.size && !relevantIds.has(path.id)) continue;
    for (const slug of pathCourseSlugs(path)) {
      if (!pathSlugs.includes(slug)) pathSlugs.push(slug);
      pathName.set(slug, path.title);
      if (path.id === active?.id) titles.set(slug, titles.get(slug) || path.title);
    }
  }

  const choose = (slug: string, source: string): Challenge | null => {
    const test = nextForCourse(tests, slug);
    if (!test) return null;
    return {
      test,
      courseTitle: test.courseTitle || titles.get(slug) || "Your course",
      source,
    };
  };

  for (const slug of taking) {
    const found = choose(slug, "From the course you're taking");
    if (found) return found;
  }
  for (const slug of pathSlugs) {
    if (taking.includes(slug)) continue;
    const found = choose(slug, pathName.get(slug) ? `From ${pathName.get(slug)}` : "From your learning path");
    if (found) return found;
  }
  return null;
}

export function DailyTestChallenge({
  paths,
  resume,
  activePathId,
}: {
  paths: DashboardPath[];
  resume: DashboardResume[];
  activePathId: number | null;
}) {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchVisibleTests(), fetchVisibleLearningPaths()])
      .then(([tests, pathRes]) => {
        if (cancelled) return;
        const learningPaths = Array.isArray(pathRes.data) ? pathRes.data : [];
        const cards = Array.isArray(tests) ? tests : [];
        setChallenge(pickDailyChallenge(cards, learningPaths, paths, resume, activePathId));
      })
      .catch(() => {
        if (!cancelled) setChallenge(null);
      });
    return () => {
      cancelled = true;
    };
  }, [paths, resume, activePathId]);

  const open = (test: LearnerTestCard) => {
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

  const shell = "relative flex h-full flex-col gap-2.5 overflow-hidden rounded-[22px] border border-[#eadcf4] bg-[linear-gradient(145deg,#fff_4%,#fff7ff_100%)] p-4 shadow-[0_12px_30px_rgba(99,26,138,0.10)]";

  if (challenge === undefined) {
    return (
      <section className={shell}>
        <h2 className="font-solway text-[22px] leading-[1.18] text-[#201b48]">Daily test challenge</h2>
        <p className="text-[13.5px] text-[#6f6a8b]">Picking today’s challenge…</p>
      </section>
    );
  }

  if (!challenge) {
    return (
      <section className={shell}>
        <span className="pointer-events-none absolute -right-20 -top-24 size-[230px] rounded-full bg-[radial-gradient(circle,rgba(223,45,169,0.10),transparent_70%)]" aria-hidden />
        <div className="relative z-[1] flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 items-start gap-[13px]">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#f9e0ff,#eae5ff)] text-lg shadow-[inset_0_0_0_1px_#f0d8fb]" aria-hidden>
              ▮
            </span>
            <div className="min-w-0">
              <h2 className="font-solway text-lg leading-tight text-[#201b48]">Daily test challenge</h2>
              <p className="mt-0.5 text-[13px] leading-snug text-[#6f6a8b]">
                Start a course on your learning path and today’s challenge will come from that course.
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(PRIVATE_PATHS.TESTS)}
          className="relative z-[1] mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(100deg,#8c16a6,#651183)] px-4 py-2.5 text-sm font-bold text-white"
        >
          Browse tests
          <ArrowRight className="size-4" />
        </button>
      </section>
    );
  }

  const { test } = challenge;
  const action = test.openAttemptId ? "Resume challenge" : test.best ? "Try again" : "Start challenge";
  const score = test.best ? Math.round(test.best.percent) : null;

  const detail = [test.timeLimitMinutes ? `${test.timeLimitMinutes} min` : null, test.level]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-labelledby="challengeTitle" className={shell}>
      <span className="pointer-events-none absolute -right-20 -top-24 size-[230px] rounded-full bg-[radial-gradient(circle,rgba(223,45,169,0.10),transparent_70%)]" aria-hidden />
      <div className="relative z-[1] flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-[13px]">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#f9e0ff,#eae5ff)] text-lg shadow-[inset_0_0_0_1px_#f0d8fb]" aria-hidden>
            ▮
          </span>
          <div className="min-w-0">
            <h2 id="challengeTitle" className="font-solway text-lg leading-tight text-[#201b48]">
              Daily test challenge
            </h2>
            <p className="mt-0.5 text-[13px] leading-snug text-[#6f6a8b]">{challenge.source}</p>
          </div>
        </div>
        <div className="shrink-0 text-[32px] leading-none" aria-hidden>
          🏆
        </div>
      </div>

      <div className="relative z-[1] flex items-center gap-2.5 rounded-2xl bg-[linear-gradient(100deg,#f8d9f6,#f5e5fb)] px-3.5 py-2.5">
        <strong className="font-solway text-[28px] font-bold leading-none tracking-[-1px] text-[#a41c9c]">
          {score != null ? `${score}%` : test.questionCount}
        </strong>
        <span className="text-[11px] font-extrabold tracking-[0.4px] text-[#c02ba5]">
          {score != null ? "LAST SCORE" : "QUESTIONS"}
        </span>
      </div>

      <div className="relative z-[1]">
        <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.45px] text-[#c02ba5]">{challenge.courseTitle}</p>
        <h3 className="mt-1 font-solway text-base font-bold leading-snug text-[#201b48]">{shortTestTitle(test.title)}</h3>
        {detail ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#6f6a8b]">
            <Clock className="size-3.5" aria-hidden />
            {detail}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => open(test)}
        className="relative z-[1] mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(100deg,#8c16a6,#651183)] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
      >
        {action}
        <ArrowRight className="size-4" />
      </button>
    </section>
  );
}
