import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** White card used by every dashboard section (same border and shadow as the Courses page). */
export function Panel({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  return (
    <section
      aria-label={label}
      className={cn(
        "rounded-lg border border-[#E5E3E9] bg-white p-4 shadow-[0_1px_3px_rgba(19,32,80,0.04)] sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  subtitle,
  linkTo,
  linkLabel,
}: {
  title: string;
  subtitle?: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3.5 flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="app-type-section-title truncate">{title}</h2>
        {subtitle ? <p className="app-type-meta mt-0.5">{subtitle}</p> : null}
      </div>
      {linkTo && linkLabel ? (
        <Link to={linkTo} className="app-type-link inline-flex shrink-0 items-center gap-1 pt-0.5">
          {linkLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-[#EDEAF3]", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Grey block shown while a section loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[#F1EEF6]", className)} aria-hidden />;
}
