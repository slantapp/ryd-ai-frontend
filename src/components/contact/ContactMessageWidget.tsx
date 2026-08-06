import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  getContactApiErrorMessage,
  sendContactMessage,
} from "@/api/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  DEFAULT_CONTACT_SUBJECT,
  emptyContactMessageForm,
  getContactPrefillFromUser,
  SUPPORT_EMAIL,
  validateContactMessageForm,
  type ContactMessageFormData,
  type ContactMessageFormErrors,
} from "@/utils/contactMessageForm";

const inputClass =
  "h-9 rounded-lg border-border bg-[#F8F8FA] px-3 font-inter text-sm text-[#0A090B] shadow-none";

const launcherClass =
  "pointer-events-auto flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/35 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

type WidgetPhase = "form" | "success";

/**
 * Standard bottom-right contact widget (launcher + anchored panel, no modal overlay).
 */
export function ContactMessageWidget() {
  const formId = useId();
  const panelId = `${formId}-panel`;
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<WidgetPhase>("form");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState<ContactMessageFormData>(() =>
    emptyContactMessageForm(),
  );
  const [formErrors, setFormErrors] = useState<ContactMessageFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const resetForm = useCallback(() => {
    const { name, email } = getContactPrefillFromUser(user);
    setFormData(
      emptyContactMessageForm({
        name,
        email,
        subject: DEFAULT_CONTACT_SUBJECT,
      }),
    );
    setFormErrors({});
    setPhase("form");
    setSuccessMessage("");
  }, [user]);

  const closeWidget = useCallback(() => {
    setOpen(false);
    clearCloseTimer();
  }, [clearCloseTimer]);

  const toggleWidget = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!open) {
      clearCloseTimer();
      return;
    }
    resetForm();
  }, [clearCloseTimer, open, resetForm]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWidget();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeWidget, open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        closeWidget();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [closeWidget, open]);

  const clearFieldError = (key: keyof ContactMessageFormData) => {
    setFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateContactMessageForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);
    try {
      const envelope = await sendContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });
      const copy =
        envelope.message?.trim() ||
        "Your message was sent. We'll get back to you soon.";
      setSuccessMessage(copy);
      setPhase("success");
      setFormData((prev) => ({ ...prev, message: "" }));
      toast.success(copy);
      clearCloseTimer();
      closeTimerRef.current = setTimeout(() => closeWidget(), 4000);
    } catch (err) {
      toast.error(
        getContactApiErrorMessage(
          err,
          `We couldn't send your message. Please try again or email ${SUPPORT_EMAIL}.`,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "fixed z-[100] flex flex-col items-end gap-3 pointer-events-none",
        "bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]",
      )}
    >
      <div
        id={panelId}
        role="dialog"
        aria-modal="false"
        aria-labelledby={`${formId}-title`}
        aria-hidden={!open}
        className={cn(
          "flex w-[min(calc(100vw-2rem),380px)] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-black/15 transition-all duration-200 ease-out",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0",
        )}
        style={{
          maxHeight:
            "min(520px, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 6rem))",
        }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 bg-primary px-4 py-3 text-white">
          <div className="min-w-0">
            <h2
              id={`${formId}-title`}
              className="font-solway text-base font-bold leading-tight"
            >
              Send us a message
            </h2>
            <p className="mt-0.5 font-inter text-xs leading-snug text-white/85">
              We&apos;ll reply by email. Urgent?{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-medium underline underline-offset-2 hover:text-white"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
          <button
            type="button"
            onClick={closeWidget}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white"
            aria-label="Close message widget"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        {phase === "success" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5">
            <p className="font-inter text-sm leading-relaxed text-[#0A090B]">
              {successMessage}
            </p>
            <Button
              type="button"
              className="w-full rounded-xl font-solway"
              onClick={closeWidget}
            >
              Done
            </Button>
          </div>
        ) : (
          <form
            id={formId}
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            noValidate
          >
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
              <div className="space-y-1">
                <Label
                  htmlFor={`${formId}-name`}
                  className="font-inter text-xs font-medium text-gray-700"
                >
                  Full name
                </Label>
                <Input
                  id={`${formId}-name`}
                  name="name"
                  autoComplete="name"
                  value={formData.name}
                  onChange={(e) => {
                    clearFieldError("name");
                    setFormData((p) => ({ ...p, name: e.target.value }));
                  }}
                  aria-invalid={Boolean(formErrors.name)}
                  className={cn(
                    inputClass,
                    formErrors.name &&
                      "border-destructive ring-1 ring-destructive/25",
                  )}
                />
                {formErrors.name ? (
                  <p className="font-inter text-xs text-destructive" role="alert">
                    {formErrors.name}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor={`${formId}-email`}
                  className="font-inter text-xs font-medium text-gray-700"
                >
                  Email
                </Label>
                <Input
                  id={`${formId}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => {
                    clearFieldError("email");
                    setFormData((p) => ({ ...p, email: e.target.value }));
                  }}
                  aria-invalid={Boolean(formErrors.email)}
                  className={cn(
                    inputClass,
                    formErrors.email &&
                      "border-destructive ring-1 ring-destructive/25",
                  )}
                />
                {formErrors.email ? (
                  <p className="font-inter text-xs text-destructive" role="alert">
                    {formErrors.email}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor={`${formId}-subject`}
                  className="font-inter text-xs font-medium text-gray-700"
                >
                  Subject
                </Label>
                <Input
                  id={`${formId}-subject`}
                  name="subject"
                  value={formData.subject}
                  onChange={(e) => {
                    clearFieldError("subject");
                    setFormData((p) => ({ ...p, subject: e.target.value }));
                  }}
                  aria-invalid={Boolean(formErrors.subject)}
                  className={cn(
                    inputClass,
                    formErrors.subject &&
                      "border-destructive ring-1 ring-destructive/25",
                  )}
                />
                {formErrors.subject ? (
                  <p className="font-inter text-xs text-destructive" role="alert">
                    {formErrors.subject}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor={`${formId}-message`}
                  className="font-inter text-xs font-medium text-gray-700"
                >
                  Message
                </Label>
                <Textarea
                  id={`${formId}-message`}
                  name="message"
                  rows={3}
                  value={formData.message}
                  onChange={(e) => {
                    clearFieldError("message");
                    setFormData((p) => ({ ...p, message: e.target.value }));
                  }}
                  aria-invalid={Boolean(formErrors.message)}
                  className={cn(
                    "min-h-20 rounded-lg border-border bg-[#F8F8FA] font-inter text-sm shadow-none",
                    formErrors.message &&
                      "border-destructive ring-1 ring-destructive/25",
                  )}
                  placeholder="How can we help?"
                />
                {formErrors.message ? (
                  <p className="font-inter text-xs text-destructive" role="alert">
                    {formErrors.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-gray-100 px-4 py-3">
              <Button
                type="submit"
                className="h-10 w-full rounded-xl font-solway text-sm"
                disabled={isSubmitting}
              >
                <Send className="size-4" aria-hidden />
                {isSubmitting ? "Sending…" : "Send message"}
              </Button>
            </div>
          </form>
        )}
      </div>

      <button
        type="button"
        onClick={toggleWidget}
        className={launcherClass}
        aria-label={open ? "Close message widget" : "Send us a message"}
        aria-expanded={open}
        aria-controls={panelId}
      >
        {open ? (
          <X className="size-6" aria-hidden />
        ) : (
          <MessageCircle className="size-6" aria-hidden />
        )}
      </button>
    </div>
  );
}
