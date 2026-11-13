import { Code2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function languageMark(title: string): { letters: string; className: string } {
  const name = title.toLowerCase();
  if (name.includes("python")) return { letters: "Py", className: "bg-[#3B82F6]" };
  if (name.includes("html")) return { letters: "</>", className: "bg-[#F97316]" };
  if (name.includes("css")) return { letters: "#", className: "bg-[#14B8A6]" };
  if (name.includes("javascript") || name === "js") return { letters: "JS", className: "bg-[#EAB308] text-[#1C1B3A]" };
  if (name.includes("node")) return { letters: "N", className: "bg-[#22C55E]" };
  if (name.includes("sql")) return { letters: "DB", className: "bg-[#2563EB]" };
  if (/c\+\+|cpp/.test(name)) return { letters: "C++", className: "bg-[#7C3AED]" };
  if (name.includes("java") && !name.includes("javascript")) return { letters: "J", className: "bg-[#EF4444]" };
  const letters = title.replace(/[^a-z0-9+]/gi, "").slice(0, 2) || "T";
  return { letters, className: "bg-primary" };
}

export function LanguageMark({ title, size = "md" }: { title: string; size?: "xs" | "sm" | "md" }) {
  const mark = languageMark(title);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-bold text-white",
        size === "xs" && "size-5 rounded-md text-[9px]",
        size === "sm" && "size-9 text-[11px]",
        size === "md" && "size-11 rounded-xl text-[13px]",
        mark.className,
      )}
      aria-hidden
    >
      {mark.letters}
    </span>
  );
}

export function SubjectIcon({ title }: { title: string }) {
  const name = title.toLowerCase();
  if (name.includes("math")) {
    return (
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[#E7F6EE] text-[#16803C]" aria-hidden>
        <Plus className="size-5" />
      </span>
    );
  }
  if (name.includes("english")) {
    return (
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[#FFF1E6] text-[13px] font-bold text-[#C2410C]" aria-hidden>
        Aa
      </span>
    );
  }
  return (
    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[#F8E7F4] text-primary" aria-hidden>
      <Code2 className="size-5" />
    </span>
  );
}
