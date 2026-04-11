import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PersonalInfoStep, type SignUpFormData } from "./PersonalInfoStep";
import { PasswordStep } from "./PasswordStep";
import { useAuthStore } from "@/stores/authStore";
import { PRIVATE_PATHS } from "@/utils/routePaths";

const initialValues: SignUpFormData = {
  firstName: "",
  lastName: "",
  email: "",
  country: "",
  state: "",
  phone: "",
  timezone: "",
  password: "",
};

export default function SignUpPage() {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [formData, setFormData] = useState<SignUpFormData>(initialValues);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (isLoggedIn) {
      navigate(PRIVATE_PATHS.DASHBOARD, { replace: true });
    }
  }, [isLoggedIn, navigate]);

  if (step === 1) {
    return (
      <PersonalInfoStep
        formData={formData}
        setFormData={setFormData}
        step={1}
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
