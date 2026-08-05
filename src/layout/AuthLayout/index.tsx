import type { ReactNode } from "react";
import { ContactMessageWidget } from "@/components/contact/ContactMessageWidget";

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex w-full h-screen bg-no-repeat bg-[url('/images/auth-bg.png')] bg-center bg-cover bg-white">
      <div className="flex-1 overflow-y-scroll scrollbar-hide">{children}</div>
      <ContactMessageWidget />
    </div>
  );
};

export default AuthLayout;
