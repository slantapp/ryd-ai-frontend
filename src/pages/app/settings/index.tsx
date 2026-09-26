// import DifficultyContent from "@/components/settings/DifficultyContent";
import FAQContent from "@/components/settings/FAQContent";
import PasswordContent from "@/components/settings/PasswordContent";
import ProfileContent from "@/components/settings/ProfileContent";
import InstructorContent from "@/components/settings/InstructorContent";
import SubscriptionContentServer from "@/components/settings/SubscriptionContentServer";
import { cn } from "@/lib/utils";
import {
  User,
  Lock,
  HelpCircle,
  CreditCard,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

type SettingsNavItem = {
  key: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  content: ReactNode;
};

function SettingsNavButton({
  item,
  isActive,
  onSelect,
}: {
  item: SettingsNavItem;
  isActive: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex w-full min-w-0 items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all sm:gap-3 sm:p-3",
        isActive
          ? "border-primary/30 bg-primary/10"
          : "border-transparent bg-transparent hover:border-[#EDEAF3] hover:bg-[#F5F4F7]",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md sm:size-10",
          isActive ? "bg-primary/15" : "bg-[#F5F4F7]",
        )}
      >
        <Icon className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-solway text-sm font-semibold",
            isActive ? "text-primary" : "text-[#0A090B]",
          )}
        >
          {item.label}
        </p>
        <p
          className={cn(
            "mt-0.5 font-inter text-xs leading-snug",
            isActive ? "text-primary/75" : "text-[#666666]",
          )}
        >
          {item.desc}
        </p>
      </div>
    </button>
  );
}

const SettingsPage = () => {
  const location = useLocation();

  const tabFromUrl = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get("tab");
  }, [location.search]);

  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (!tabFromUrl) return;
    if (
      tabFromUrl === "profile" ||
      tabFromUrl === "password" ||
      tabFromUrl === "subscription" ||
      tabFromUrl === "instructor" ||
      tabFromUrl === "faq"
    ) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const items: SettingsNavItem[] = [
    {
      key: "profile",
      label: "Update Profile",
      desc: "Update Username, Country, etc",
      icon: User,
      content: <ProfileContent />,
    },
    {
      key: "password",
      label: "Change Password",
      desc: "Update your password after sign-in",
      icon: Lock,
      content: <PasswordContent />,
    },
  ];

  const billingItems: SettingsNavItem[] = [
    {
      key: "subscription",
      label: "Subscription",
      desc: "Manage your plan and payment method",
      icon: CreditCard,
      content: <SubscriptionContentServer />,
    },
  ];

  const otherItems: SettingsNavItem[] = [
    {
      key: "instructor",
      label: "Change Instructor",
      desc: "Select your preferred instructor",
      icon: GraduationCap,
      content: <InstructorContent />,
    },
    {
      key: "faq",
      label: "FAQ",
      desc: "Most Frequently asked questions",
      icon: HelpCircle,
      content: <FAQContent />,
    },
  ];

  return (
    <div className="mx-auto flex min-h-0 min-w-0 max-w-full flex-col gap-4 sm:gap-6">
      <header className="min-w-0">
        <p className="app-type-eyebrow mb-1">Account</p>
        <h1 className="app-type-page-title">Settings</h1>
        <p className="app-type-page-subtitle mt-1.5">
          Manage your profile, billing, and learning preferences
        </p>
      </header>

      <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
        <nav
          className="w-full shrink-0 space-y-2 rounded-lg border border-[#EDEAF3] bg-white p-2.5 shadow-[0_2px_12px_rgba(19,32,80,0.03)] sm:space-y-2.5 sm:p-3 lg:w-[min(100%,20rem)] xl:w-88"
          aria-label="Settings sections"
        >
          <div className="space-y-2 pt-0.5">
            <h3 className="app-type-eyebrow px-1 text-[#132050]/40">Account</h3>
          </div>
          {items.map((item) => (
            <SettingsNavButton
              key={item.key}
              item={item}
              isActive={activeTab === item.key}
              onSelect={() => setActiveTab(item.key)}
            />
          ))}

          <div className="space-y-2 pt-2.5 sm:pt-3">
            <h3 className="app-type-eyebrow px-1 text-[#132050]/40">Billing</h3>
          </div>
          {billingItems.map((item) => (
            <SettingsNavButton
              key={item.key}
              item={item}
              isActive={activeTab === item.key}
              onSelect={() => setActiveTab(item.key)}
            />
          ))}

          <div className="space-y-1 pt-2.5 sm:pt-3">
            <h3 className="app-type-eyebrow px-1 text-[#132050]/40">Others</h3>
          </div>
          {otherItems.map((item) => (
            <SettingsNavButton
              key={item.key}
              item={item}
              isActive={activeTab === item.key}
              onSelect={() => setActiveTab(item.key)}
            />
          ))}
        </nav>

        <div className="min-w-0 flex-1 rounded-lg border border-[#EDEAF3] bg-white p-3.5 shadow-[0_2px_12px_rgba(19,32,80,0.03)] sm:p-4 lg:p-5">
          {items.find((item) => item.key === activeTab)?.content}
          {billingItems.find((item) => item.key === activeTab)?.content}
          {otherItems.find((item) => item.key === activeTab)?.content}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
