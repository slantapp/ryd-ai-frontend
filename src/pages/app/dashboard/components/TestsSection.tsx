import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardData } from "@/api/dashboard";
import { GradeBadge } from "@/features/tests/components/TestBits";
import { testAttemptPath, testIntroPath, testResultPath } from "@/features/tests/paths";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { testSuggestionReason } from "../dashboardText";
import { Panel, SectionHeader } from "./Panel";

/** Latest result plus tests worth taking now. Hidden when no test is published and none was taken. */
export function TestsSection({ tests }: { tests: DashboardData["tests"] }) {
  const navigate = useNavigate();
  const { latest, suggestions, available } = tests;
  if (!available && !latest) return null;

  return (
    <Panel label="Tests">
      <SectionHeader
        title="Tests"
        subtitle="Check what you learned and get your grade."
        linkTo={PRIVATE_PATHS.TESTS}
        linkLabel="All tests"
      />
      <div className="space-y-2.5">
        {latest ? (
          <Link
            to={testResultPath(latest.attemptId)}
            className="flex items-center gap-3 rounded-lg border border-[#EFEDF3] bg-[#FCFBFE] p-3 transition-colors hover:border-primary/25"
          >
            <GradeBadge grade={latest.grade} size="md" />
            <div className="min-w-0 flex-1">
              <p className="app-type-meta">Latest result</p>
              <p className="app-type-card-title truncate text-sm">{latest.testTitle || "Test"}</p>
            </div>
            <span className="app-type-meta shrink-0 font-semibold tabular-nums text-[#132050]">
              {Math.round(latest.percent)}%
            </span>
            <span className="app-type-link hidden shrink-0 sm:inline">See feedback</span>
          </Link>
        ) : null}

        {suggestions.map((s) => (
          <div key={s.testId} className="flex flex-col gap-3 rounded-lg border border-[#EFEDF3] p-3 sm:flex-row sm:items-center">
            <span className="hidden size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary sm:flex">
              {s.openAttemptId ? <RotateCcw className="size-5" /> : <ClipboardCheck className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="app-type-card-title truncate text-sm">{s.title}</p>
              <p className="app-type-meta">
                {testSuggestionReason(s)}
                {s.questionCount ? ` · ${s.questionCount} questions` : ""}
                {s.timeLimitMinutes ? ` · ${s.timeLimitMinutes} min` : ""}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={s.openAttemptId ? "default" : "outline"}
              className="h-8 shrink-0 rounded-md font-inter shadow-none sm:w-auto"
              onClick={() =>
                navigate(s.openAttemptId ? testAttemptPath(s.testId, s.openAttemptId) : testIntroPath(s.testId))
              }
            >
              {s.openAttemptId ? "Resume test" : "Take test"}
            </Button>
          </div>
        ))}

        {!latest && !suggestions.length ? (
          <p className="app-type-body">
            {available} {available === 1 ? "test is" : "tests are"} ready when you are.{" "}
            <Link to={PRIVATE_PATHS.TESTS} className="app-type-link">
              Browse tests
            </Link>
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
