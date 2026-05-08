import * as React from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { PUBLIC_PATHS } from "@/utils/routePaths";
import type { AiRegisterPayload } from "@/stores/authStore";
import { Country, State } from "country-state-city";
import * as CountriesAndTimezones from "countries-and-timezones";

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
  "h-11 rounded-xl border-border bg-[#F8F8FA] px-4 font-inter text-[#0A090B] placeholder:text-[#4F4D55]/70 shadow-none";

export function PersonalInfoStep({ formData, setFormData, onNext, step }: Props) {
  const countries = React.useMemo(() => Country.getAllCountries(), []);

  const selectedCountryIso = React.useMemo(() => {
    const byName = countries.find(
      (c) => c.name.toLowerCase() === (formData.country ?? "").toLowerCase()
    );
    return byName?.isoCode ?? "";
  }, [countries, formData.country]);

  const selectedCountry = React.useMemo(() => {
    if (!selectedCountryIso) return null;
    return countries.find((c) => c.isoCode === selectedCountryIso) ?? null;
  }, [countries, selectedCountryIso]);

  const callingCode = React.useMemo(() => {
    const pc = selectedCountry?.phonecode?.trim();
    if (!pc) return "";
    return pc.startsWith("+") ? pc : `+${pc}`;
  }, [selectedCountry]);

  const [nationalPhone, setNationalPhone] = React.useState("");

  React.useEffect(() => {
    // Keep the editable part in sync with the stored value.
    const raw = (formData.phone ?? "").trim();
    if (callingCode && raw.startsWith(callingCode)) {
      setNationalPhone(raw.slice(callingCode.length));
    } else if (raw.startsWith("+")) {
      // If we can't confidently split, show the whole value as editable.
      setNationalPhone(raw);
    } else {
      setNationalPhone(raw);
    }
  }, [callingCode, formData.phone]);

  const states = React.useMemo(() => {
    if (!selectedCountryIso) return [];
    return State.getStatesOfCountry(selectedCountryIso);
  }, [selectedCountryIso]);

  const timezones = React.useMemo(() => {
    if (!selectedCountryIso) return [];
    const tz = CountriesAndTimezones.getTimezonesForCountry(selectedCountryIso);
    // Library typings are loose; normalize to a list of IANA zone names.
    if (!tz) return [];
    if (Array.isArray(tz)) {
      return tz
        .map((t: unknown) => {
          if (typeof t === "string") return t;
          if (t && typeof t === "object" && "name" in t) {
            const name = (t as { name?: unknown }).name;
            return typeof name === "string" ? name : null;
          }
          return null;
        })
        .filter((x): x is string => Boolean(x));
    }
    return [];
  }, [selectedCountryIso]);

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
            className={`h-2 w-10 rounded-full transition-colors ${n <= step ? "bg-primary" : "bg-[#E8E8EC]"
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
            <Select
              value={selectedCountryIso || undefined}
              onValueChange={(iso) => {
                const c = countries.find((x) => x.isoCode === iso);
                setFormData((p) => ({
                  ...p,
                  country: c?.name ?? "",
                  state: "",
                  timezone: "",
                  phone: c?.phonecode ? `+${c.phonecode}` : "",
                }));
              }}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.isoCode} value={c.isoCode}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-state" className="font-inter text-[#0A090B]">
              State / province
            </Label>
            <Select
              value={formData.state || undefined}
              onValueChange={(stateName) => {
                setFormData((p) => ({ ...p, state: stateName }));
              }}
              disabled={!selectedCountryIso || states.length === 0}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue
                  placeholder={
                    !selectedCountryIso
                      ? "Select country"
                      : states.length
                        ? "Select State"
                        : "No states available"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.isoCode} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              inputMode="tel"
              placeholder={callingCode ? `${callingCode}8012345678` : "+2348012345678"}
              value={`${callingCode || ""}${nationalPhone}`}
              onChange={(e) => {
                const raw = e.target.value;
                if (!callingCode) {
                  const cleaned = raw.replace(/[^\d+]/g, "");
                  setNationalPhone(cleaned.replace(/^\+/, ""));
                  setFormData((p) => ({ ...p, phone: cleaned }));
                  return;
                }

                // Prevent edits that would remove or change the calling code prefix.
                if (!raw.startsWith(callingCode)) {
                  return;
                }

                const rest = raw.slice(callingCode.length).replace(/[^\d]/g, "");
                setNationalPhone(rest);
                setFormData((p) => ({
                  ...p,
                  phone: callingCode + rest,
                }));
              }}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-tz" className="font-inter text-[#0A090B]">
              Timezone
            </Label>
            <Select
              value={formData.timezone || undefined}
              onValueChange={(tzName) => {
                setFormData((p) => ({ ...p, timezone: tzName }));
              }}
              disabled={!selectedCountryIso || timezones.length === 0}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue
                  placeholder={
                    !selectedCountryIso
                      ? "Select country"
                      : timezones.length
                        ? "Select timezone"
                        : "No timezones"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
