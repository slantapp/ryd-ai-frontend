import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PersonalInfoStep, type SignUpFormData } from "./PersonalInfoStep";
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

  return (
    <PersonalInfoStep
      formData={formData}
      setFormData={setFormData}
      referralCodeLocked={referralCodeLocked}
    />
  );
}
