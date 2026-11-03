import { Volume2 } from "lucide-react";

/** One line under an editor toolbar, e.g. "Wait for your instructor to finish, then submit." */
export function ToolbarNotice({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="flex shrink-0 items-center gap-1.5 border-b border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary"
    >
      <Volume2 className="size-3.5 shrink-0 animate-pulse" aria-hidden />
      {text}
    </p>
  );
}
