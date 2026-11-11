import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  fetchLearningPathBrowse,
  type ApiLearningPathBrowseCategory,
} from "@/api/learningPaths";
import { getCategoryIcon } from "@/data/courseCategories";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { cn } from "@/lib/utils";

type SubjectRow = {
  id: string;
  title: string;
  detail: string;
  href: string | null;
};

function isEnglish(title: string): boolean {
  return /english/i.test(title);
}

function isCoding(title: string): boolean {
  return /cod|program|javascript|python/i.test(title);
}

function isMaths(title: string): boolean {
  return /math/i.test(title);
}

export function EmptyPathHome({ firstName }: { firstName: string }) {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLearningPathBrowse()
      .then((res) => {
        if (cancelled) return;
        const categories = Array.isArray(res?.data) ? res.data : [];
        setSubjects(toSubjects(categories));
      })
      .catch(() => {
        if (!cancelled) setSubjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showEnglishSoon = subjects != null && !subjects.some((subject) => isEnglish(subject.title));
  const name = firstName.trim() || "there";

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6">
      <section
        aria-labelledby="heroTitle"
        className="flex flex-wrap items-center gap-9 rounded-3xl px-6 py-8 text-white sm:px-10 sm:py-10"
        style={{
          backgroundColor: "#1C1B3A",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1.1px, transparent 1.1px)",
          backgroundSize: "18px 18px",
        }}
      >
        <div className="flex min-w-[280px] flex-1 flex-col gap-3">
          <p className="text-[13px] font-bold tracking-[0.08em] text-[#E7A9D6]">WELCOME TO RYD</p>
          <h1 id="heroTitle" className="font-solway text-[36px] leading-[1.05] sm:text-[44px]">
            Learn anything, one small step at a time.
          </h1>
          <p className="m-0 text-[17px] text-[#CFCBE0]">
            Listen to a lesson, try it, then test yourself. Coding and maths today, more subjects on the way.
          </p>
        </div>
        <div className="flex min-w-[280px] flex-1 flex-col gap-3" aria-hidden>
          <PreviewLine label="Coding" tone="plum" offset={0}>
            <span className="font-mono text-[15px] text-[#E9E4F0]">
              <span className="text-[#F0ABFC]">print</span>
              (<span className="text-[#A7F3D0]">&quot;Hello, {name}&quot;</span>)
            </span>
          </PreviewLine>
          <PreviewLine label="Maths" tone="blue" offset={28}>
            <span className="font-solway text-lg text-[#E9E4F0]">
              3x + 5 = 20 <span className="text-[#8C89B0]">→</span> x ={" "}
              <span className="font-bold text-[#A7D3F5]">5</span>
            </span>
          </PreviewLine>
          <div
            className="flex items-center gap-3.5 rounded-[14px] border border-dashed border-[#4A4878] px-4 py-3.5"
            style={{ marginLeft: 56 }}
          >
            <span className="shrink-0 rounded-lg border border-[#4A4878] px-2 py-0.5 text-xs font-bold text-[#CFCBE0]">
              English
            </span>
            <span className="text-[15px] text-[#8C89B0]">Coming soon</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate(PRIVATE_PATHS.LEARNING_PATH)}
          className="flex flex-col gap-3 rounded-[22px] border border-[#E7E4EE] bg-white p-6 text-left text-[#1C1B3A] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(28,27,58,0.06)]"
        >
          <div className="rounded-2xl bg-[#F7ECF4] px-3.5 py-4">
            <PathSketch />
          </div>
          <p className="text-[13px] font-bold text-[#9B3A86]">STARTING FRESH</p>
          <p className="font-solway text-[26px] leading-tight">Find my path</p>
          <p className="text-[#5E5C72]">
            Pick a subject and answer 4 quick questions. You get one path at your level.
          </p>
          <p className="mt-1 inline-flex items-center gap-2 font-bold text-[#7E2C6C]">
            Find my path · 1 min
            <ArrowRight className="size-4" />
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate(PRIVATE_PATHS.TESTS)}
          className="flex flex-col gap-3 rounded-[22px] border border-[#E7E4EE] bg-white p-6 text-left text-[#1C1B3A] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(28,27,58,0.06)]"
        >
          <div className="rounded-2xl bg-[#F7ECF4] px-3.5 py-4">
            <QuizSketch />
          </div>
          <p className="text-[13px] font-bold text-[#9B3A86]">ALREADY KNOW SOME</p>
          <p className="font-solway text-[26px] leading-tight">Test your knowledge</p>
          <p className="text-[#5E5C72]">
            A short quiz in any subject. We skip what you know and start you higher.
          </p>
          <p className="mt-1 inline-flex items-center gap-2 font-bold text-[#7E2C6C]">
            Take the quiz · 5 min
            <ArrowRight className="size-4" />
          </p>
        </button>
      </div>

      <section aria-labelledby="subjTitle" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="subjTitle" className="font-solway text-xl text-[#1C1B3A]">
            Or pick a subject
          </h2>
          <Link to={PRIVATE_PATHS.COURSES} className="text-sm font-semibold text-[#1C1B3A]">
            All subjects
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(subjects ?? []).map((subject) => {
            const Icon = getCategoryIcon(subject.id);
            const body = (
              <>
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    isMaths(subject.title) && "bg-[#E8F0FB] text-[#1E4E8C]",
                    isCoding(subject.title) && "bg-[#F7ECF4] font-mono text-sm font-bold text-[#9B3A86]",
                    !isMaths(subject.title) && !isCoding(subject.title) && subject.href && "bg-[#F7ECF4] text-[#9B3A86]",
                    !subject.href && "bg-[#F1EFF5] text-[#5E5C72]",
                  )}
                >
                  {isCoding(subject.title) ? (
                    "</>"
                  ) : isMaths(subject.title) ? (
                    <span className="font-solway text-lg font-bold">x²</span>
                  ) : (
                    <Icon className="size-5" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block font-bold", subject.href ? "text-[#1C1B3A]" : "text-[#3E3C55]")}>
                    {subject.title}
                  </span>
                  <span className="block text-[13px] text-[#5E5C72]">{subject.detail}</span>
                </span>
              </>
            );
            if (!subject.href) {
              return (
                <div
                  key={subject.id}
                  className="flex items-center gap-3.5 rounded-2xl border border-dashed border-[#D6D2E0] px-4 py-3.5 text-[#5E5C72]"
                >
                  {body}
                </div>
              );
            }
            return (
              <Link
                key={subject.id}
                to={subject.href}
                className="flex items-center gap-3.5 rounded-2xl border border-[#E7E4EE] bg-white px-4 py-3.5 text-[#1C1B3A] transition hover:-translate-y-0.5 hover:border-primary/30"
              >
                {body}
              </Link>
            );
          })}
          {showEnglishSoon ? (
            <div className="flex items-center gap-3.5 rounded-2xl border border-dashed border-[#D6D2E0] px-4 py-3.5 text-[#5E5C72]">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#F1EFF5] font-solway text-lg font-bold">
                Aa
              </span>
              <span>
                <span className="block font-bold text-[#3E3C55]">English</span>
                <span className="block text-[13px]">Coming soon</span>
              </span>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function toSubjects(categories: ApiLearningPathBrowseCategory[]): SubjectRow[] {
  return categories.map((category) => ({
    id: category.slug || String(category.id),
    title: category.title,
    detail: category.example?.trim() || category.subcategories.map((sub) => sub.title).filter(Boolean).slice(0, 3).join(", ") || "Lessons in this subject",
    href: `${PRIVATE_PATHS.COURSES}?category=${encodeURIComponent(category.slug || category.title)}`,
  }));
}

function PreviewLine({
  label,
  tone,
  offset,
  children,
}: {
  label: string;
  tone: "plum" | "blue";
  offset: number;
  children: ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3.5 rounded-[14px] border border-[#2E2D55] bg-[#12112A] px-4 py-3.5"
      style={{ marginLeft: offset }}
    >
      <span
        className={cn(
          "shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-[#1C1B3A]",
          tone === "blue" ? "bg-[#A7D3F5]" : "bg-[#E7A9D6]",
        )}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function PathSketch() {
  return (
    <svg aria-hidden viewBox="0 0 260 110" width="100%" className="block max-h-[120px]">
      <path
        d="M 20 80 C 70 10, 110 10, 140 55 S 210 100, 240 30"
        fill="none"
        stroke="#D9B5CF"
        strokeWidth="4"
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
      <circle cx="20" cy="80" r="11" fill="#9B3A86" />
      <circle cx="88" cy="25" r="9" fill="#FFFFFF" stroke="#9B3A86" strokeWidth="3" />
      <circle cx="140" cy="55" r="9" fill="#FFFFFF" stroke="#9B3A86" strokeWidth="3" />
      <circle cx="196" cy="84" r="9" fill="#FFFFFF" stroke="#9B3A86" strokeWidth="3" />
      <circle cx="240" cy="30" r="13" fill="#FFFFFF" stroke="#9B3A86" strokeWidth="3" strokeDasharray="3 3" />
      <path
        d="M 240 22 l 2 4.4 4.8 .6 -3.6 3.3 1 4.8 -4.2 -2.4 -4.2 2.4 1 -4.8 -3.6 -3.3 4.8 -.6 z"
        fill="#9B3A86"
      />
    </svg>
  );
}

function QuizSketch() {
  return (
    <div className="relative mx-2.5 h-[110px]" aria-hidden>
      <div className="absolute inset-x-4 -bottom-1 top-2 rotate-3 rounded-xl bg-[#D9B5CF]" />
      <div className="absolute inset-0 grid grid-cols-2 content-center gap-2 rounded-xl border border-[#E9CFE2] bg-white px-3.5 py-3">
        <span className="rounded-lg bg-[#F7ECF4] px-2 py-1.5 font-mono text-xs text-[#5A1F4E]">print(x)</span>
        <span className="rounded-lg border-2 border-[#9B3A86] px-2 py-1.5 text-xs font-semibold text-[#5A1F4E]">
          Shows x
        </span>
        <span className="rounded-lg bg-[#F7ECF4] px-2 py-1.5 text-xs font-semibold text-[#5A1F4E]">3 × 4</span>
        <span className="rounded-lg border border-[#E7E4EE] px-2 py-1.5 text-xs text-[#3E3C55]">12</span>
      </div>
    </div>
  );
}
