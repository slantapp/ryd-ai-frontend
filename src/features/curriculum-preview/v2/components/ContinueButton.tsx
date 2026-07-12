import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContinueButtonProps {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function ContinueButton({
  label = "Continue",
  onClick,
  disabled,
  loading,
  className,
}: ContinueButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {label}
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
