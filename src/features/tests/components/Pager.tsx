import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page numbers to show: always the first and last, the current page ±1, and "…" for gaps. */
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const keep = new Set([1, pageCount, page - 1, page, page + 1]);
  const out: (number | "gap")[] = [];
  for (let p = 1; p <= pageCount; p += 1) {
    if (keep.has(p)) out.push(p);
    else if (out[out.length - 1] !== "gap") out.push("gap");
  }
  return out;
}

const buttonClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 font-solway text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";

/** Client-side pager in the Courses-tab style: "Showing 1–9 of 23" plus Prev / numbers / Next. */
export function Pager({
  page,
  pageSize,
  total,
  onChange,
  label = "items",
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav
      className="flex flex-col items-center justify-between gap-2 pt-1 sm:flex-row"
      aria-label={`${label} pages`}
    >
      <p className="app-type-meta">
        Showing {from}–{to} of {total} {label}
      </p>
      <div className="inline-flex items-center gap-0.5 rounded-md border border-[#EDEAF3] bg-[#F8F8FA] p-0.5">
        <button
          type="button"
          className={cn(buttonClass, "text-[#132050]/70 hover:text-[#132050]")}
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        {pageItems(page, pageCount).map((p, i) =>
          p === "gap" ? (
            <span
              key={`gap-${i}`}
              className="px-1 text-xs text-[#132050]/40"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Page ${p}`}
              className={cn(
                buttonClass,
                p === page
                  ? "bg-primary text-white shadow-sm"
                  : "text-[#132050]/65 hover:text-[#132050]",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={cn(buttonClass, "text-[#132050]/70 hover:text-[#132050]")}
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
