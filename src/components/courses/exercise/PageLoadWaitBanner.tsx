import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQueryMinLg } from "@/hooks/useMediaQueryMinLg";
import {
  usePageLoadWaitMessage,
  type PageLoadWaitPhase,
} from "@/hooks/usePageLoadWaitMessage";

interface PageLoadWaitBannerProps {
  /** True while the avatar / page is still loading. */
  isLoading: boolean;
  /** When true, only show on viewports below Tailwind `lg`. Default: show on all viewports. */
  mobileOnly?: boolean;
  className?: string;
}

const MESSAGES: Record<Exclude<PageLoadWaitPhase, "none">, string> = {
  initial: "Please wait — your instructor is getting ready.",
  extended:
    "This is taking longer than usual. We are aware and working on it — please wait a few more minutes while the page loads.",
};

export function PageLoadWaitBanner({
  isLoading,
  mobileOnly = false,
  className,
}: PageLoadWaitBannerProps) {
  const isLgUp = useMediaQueryMinLg();
  const phase = usePageLoadWaitMessage(isLoading, {
    enabled: mobileOnly ? !isLgUp : true,
  });

  if (phase === "none") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-b border-amber-200/80 bg-amber-50 px-3 py-2.5 text-center text-xs leading-snug text-amber-950 sm:text-sm",
        className,
      )}
    >
      <div className="mx-auto flex max-w-lg items-start justify-center gap-2">
        <Loader2
          className="mt-0.5 size-3.5 shrink-0 animate-spin text-amber-600 sm:size-4"
          aria-hidden
        />
        <p>{MESSAGES[phase]}</p>
      </div>
    </div>
  );
}

export default PageLoadWaitBanner;
