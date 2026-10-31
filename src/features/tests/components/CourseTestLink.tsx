import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { fetchVisibleTests } from "../api";
import { testIntroPath } from "../paths";
import { GradeBadge } from "./TestBits";
import type { LearnerTestCard } from "../types";

/**
 * "Take the course test" link plus the learner's course grade (best attempt across the
 * course's tests). Renders nothing when the course has no published test or the call fails.
 */
export function CourseTestLink({ courseSlug }: { courseSlug: string | null | undefined }) {
  const [tests, setTests] = useState<LearnerTestCard[]>([]);

  useEffect(() => {
    if (!courseSlug) return;
    let cancelled = false;
    fetchVisibleTests()
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        setTests(data.filter((t) => t.courseSlug === courseSlug));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [courseSlug]);

  if (!courseSlug || tests.length === 0) return null;

  const best = tests
    .map((t) => t.best)
    .filter((b): b is NonNullable<typeof b> => b != null)
    .sort((a, b) => b.percent - a.percent)[0];
  // Open test first, then one not yet passed, then the first.
  const target =
    tests.find((t) => t.openAttemptId) ??
    tests.find((t) => !t.best?.passed && t.attemptsLeft !== 0) ??
    tests[0];
  const label = target.openAttemptId
    ? "Resume the course test"
    : target.best
      ? "Retake the course test"
      : "Take the course test";

  return (
    <div className="mt-3 flex items-center justify-center gap-2 font-inter text-sm">
      {best ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-[#4F4D55]">
          Course grade <GradeBadge grade={best.grade} size="sm" />
          <span className="tabular-nums">{Math.round(best.percent)}%</span>
        </span>
      ) : null}
      <Link
        to={testIntroPath(target.id)}
        className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-2 hover:underline"
      >
        <ClipboardCheck className="size-4" aria-hidden />
        {label}
      </Link>
    </div>
  );
}

export default CourseTestLink;
