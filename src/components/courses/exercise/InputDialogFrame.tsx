import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Shared shell for the program-input pop-ups: dimmed backdrop, card, header, body, footer.
 * Sits above the fullscreen editor (z-index 9999). Escape and the backdrop cancel.
 */
export function InputDialogFrame({
  titleId,
  eyebrow,
  title,
  subtitle,
  icon,
  onCancel,
  onSubmit,
  cancelLabel = "Stop",
  submitLabel,
  footerStart,
  children,
}: {
  titleId: string;
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  icon: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  cancelLabel?: string;
  submitLabel: ReactNode;
  footerStart?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center bg-[#0f1222]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      style={{ zIndex: 10050 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
              <h2 id={titleId} className="text-base font-semibold leading-snug text-gray-900">
                {title}
              </h2>
              {subtitle ? <p className="text-[13px] text-gray-500">{subtitle}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close and stop"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="space-y-3 px-4 py-4 sm:px-5">{children}</div>

        <footer className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <div className="min-w-0">{footerStart}</div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              {submitLabel}
            </button>
          </div>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
