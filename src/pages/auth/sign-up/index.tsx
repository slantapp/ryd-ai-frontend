import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PersonalInfoStep, type SignUpFormData } from "./PersonalInfoStep";
import { PasswordStep } from "./PasswordStep";
import { useAuthStore } from "@/stores/authStore";
import { PRIVATE_PATHS } from "@/utils/routePaths";

const initialValues: SignUpFormData = {
  email: "",
  survey: "",
  referralCode: "",
  password: "",
};

export default function SignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const refFromUrl = useMemo(
    () => searchParams.get("ref")?.trim() ?? "",
    [searchParams],
  );
  const referralCodeLocked = Boolean(refFromUrl);
  const [formData, setFormData] = useState<SignUpFormData>(() => ({
    ...initialValues,
    referralCode: refFromUrl,
  }));
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (isLoggedIn) {
      navigate(PRIVATE_PATHS.DASHBOARD, { replace: true });
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!refFromUrl) return;
    setFormData((prev) =>
      prev.referralCode === refFromUrl
        ? prev
        : { ...prev, referralCode: refFromUrl },
    );
  }, [refFromUrl]);

  if (step === 1) {
    return (
      <PersonalInfoStep
        formData={formData}
        setFormData={setFormData}
        step={1}
        referralCodeLocked={referralCodeLocked}
        onNext={() => setStep(2)}
      />
    );
  }

  return (
    <PasswordStep
      formData={formData}
      setFormData={setFormData}
      step={2}
      onBack={() => setStep(1)}
    />
  );
}
