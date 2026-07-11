export function SubtitleBubble({ text }: { text: string }) {
  if (!text.trim()) return null;

  return (
    <div className="rounded-xl border border-primary/15 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex gap-1">
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <span className="text-xs text-primary">Speaking…</span>
      </div>
      <p className="text-sm leading-relaxed text-gray-700">{text}</p>
    </div>
  );
}
