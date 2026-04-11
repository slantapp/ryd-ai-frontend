import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { PUBLIC_PATHS } from "@/utils/routePaths";
import type { AiRegisterPayload } from "@/stores/authStore";

export type SignUpFormData = Omit<AiRegisterPayload, "password"> & {
  password: string;
};

type Props = {
  formData: SignUpFormData;
  setFormData: React.Dispatch<React.SetStateAction<SignUpFormData>>;
  onNext: () => void;
  step: number;
};

const inputClass =
  "h-11 rounded-xl border-[#E8E8EC] bg-[#F8F8FA] px-4 font-inter text-[#0A090B] placeholder:text-[#4F4D55]/70";

export function PersonalInfoStep({ formData, setFormData, onNext, step }: Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.timezone.trim()) {
      return;
    }
    onNext();
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Step 1 of 2 — tell us about you."
    >
      <div className="mb-6 flex justify-center gap-2">
        {[1, 2].map((n) => (
          <div
            key={n}
            className={`h-2 w-10 rounded-full transition-colors ${
              n <= step ? "bg-primary" : "bg-[#E8E8EC]"
            }`}
          />
        ))}
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="su-fn" className="font-inter text-[#0A090B]">
              First name
            </Label>
            <Input
              id="su-fn"
              required
              placeholder="Amina"
              value={formData.firstName}
              onChange={(e) =>
                setFormData((p) => ({ ...p, firstName: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-ln" className="font-inter text-[#0A090B]">
              Last name
            </Label>
            <Input
              id="su-ln"
              required
              placeholder="Okoro"
              value={formData.lastName}
              onChange={(e) =>
                setFormData((p) => ({ ...p, lastName: e.target.value }))
              }
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="su-email" className="font-inter text-[#0A090B]">
            Email
          </Label>
          <Input
            id="su-email"
            type="email"
            required
            placeholder="ai.parent.demo1@rydlearning.com"
            value={formData.email}
            onChange={(e) =>
              setFormData((p) => ({ ...p, email: e.target.value }))
            }
            className={inputClass}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="su-country" className="font-inter text-[#0A090B]">
              Country
            </Label>
            <Input
              id="su-country"
              required
              placeholder="Nigeria"
              value={formData.country}
              onChange={(e) =>
                setFormData((p) => ({ ...p, country: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-state" className="font-inter text-[#0A090B]">
              State / province
            </Label>
            <Input
              id="su-state"
              required
              placeholder="Lagos"
              value={formData.state}
              onChange={(e) =>
                setFormData((p) => ({ ...p, state: e.target.value }))
              }
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="su-phone" className="font-inter text-[#0A090B]">
              Phone
            </Label>
            <Input
              id="su-phone"
              type="tel"
              required
              placeholder="08031234567"
              value={formData.phone}
              onChange={(e) =>
                setFormData((p) => ({ ...p, phone: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-tz" className="font-inter text-[#0A090B]">
              Timezone
            </Label>
            <Input
              id="su-tz"
              required
              placeholder="Africa/Lagos"
              value={formData.timezone}
              onChange={(e) =>
                setFormData((p) => ({ ...p, timezone: e.target.value }))
              }
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex items-start gap-3 pt-1">
          <input
            id="su-terms"
            type="checkbox"
            required
            className="mt-1 size-4 shrink-0 rounded border-[#E8E8EC] accent-primary"
          />
          <label
            htmlFor="su-terms"
            className="font-inter text-xs leading-relaxed text-[#4F4D55]"
          >
            I agree to the terms and privacy policy for the AI LMS.
          </label>
        </div>
        <Button
          type="submit"
          className="h-12 w-full rounded-xl font-solway text-base font-semibold"
        >
          Continue
        </Button>
        <p className="text-center font-inter text-sm text-[#4F4D55]">
          Already have an account?{" "}
          <Link
            to={PUBLIC_PATHS.LOGIN}
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
