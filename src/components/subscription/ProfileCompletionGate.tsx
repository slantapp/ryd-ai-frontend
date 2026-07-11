import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

type FieldErrors = Partial<Record<"firstName" | "lastName", string>>;

const inputClass =
  "h-11 rounded-xl border-border bg-[#F8F8FA] px-4 font-inter text-[#0A090B] placeholder:text-[#4F4D55]/70 shadow-none";

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      {" *"}
    </span>
  );
}

function validateNames(firstName: string, lastName: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!firstName.trim()) errors.firstName = "First name is required.";
  if (!lastName.trim()) errors.lastName = "Last name is required.";
  return errors;
}

type ProfileCompletionGateProps = {
  open: boolean;
  onComplete: () => void;
  onSignOut: () => void;
};

/**
 * Blocking dialog after subscription — parents must set first/last name
 * before using the rest of the app.
 */
export default function ProfileCompletionGate({
  open,
  onComplete,
  onSignOut,
}: ProfileCompletionGateProps) {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const user = useAuthStore((s) => s.user);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setFieldErrors({});
  }, [open, user?.firstName, user?.lastName]);

  const clearFieldError = (key: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateNames(firstName, lastName);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const first = Object.values(errors)[0];
      toast.error(typeof first === "string" ? first : "Please fill in your name.");
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      toast.success("Profile saved — you're all set!");
      onComplete();
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      const msg =
        ax.response?.data?.message ||
        (err instanceof Error ? err.message : "Could not save profile");
      toast.error(typeof msg === "string" ? msg : "Could not save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        // Blocking — ignore dismiss attempts.
      }}
    >
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-md rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle className="font-solway">Complete your profile</DialogTitle>
          <DialogDescription className="font-inter">
            Tell us your name so we can personalize your experience. You need
            this before continuing.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pc-fn" className="font-inter text-[#0A090B]">
                First name
                <RequiredMark />
              </Label>
              <Input
                id="pc-fn"
                autoComplete="given-name"
                placeholder="John"
                value={firstName}
                onChange={(e) => {
                  clearFieldError("firstName");
                  setFirstName(e.target.value);
                }}
                aria-invalid={Boolean(fieldErrors.firstName)}
                className={cn(
                  inputClass,
                  fieldErrors.firstName &&
                    "border-destructive ring-1 ring-destructive/25",
                )}
              />
              {fieldErrors.firstName ? (
                <p className="font-inter text-xs text-destructive" role="alert">
                  {fieldErrors.firstName}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pc-ln" className="font-inter text-[#0A090B]">
                Last name
                <RequiredMark />
              </Label>
              <Input
                id="pc-ln"
                autoComplete="family-name"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => {
                  clearFieldError("lastName");
                  setLastName(e.target.value);
                }}
                aria-invalid={Boolean(fieldErrors.lastName)}
                className={cn(
                  inputClass,
                  fieldErrors.lastName &&
                    "border-destructive ring-1 ring-destructive/25",
                )}
              />
              {fieldErrors.lastName ? (
                <p className="font-inter text-xs text-destructive" role="alert">
                  {fieldErrors.lastName}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onSignOut}
              disabled={loading}
            >
              Sign out
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save and continue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
