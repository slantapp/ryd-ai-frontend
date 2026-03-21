// import DifficultyContent from "@/components/settings/DifficultyContent";
import FAQContent from "@/components/settings/FAQContent";
import PasswordContent from "@/components/settings/PasswordContent";
import ProfileContent from "@/components/settings/ProfileContent";
import InstructorContent from "@/components/settings/InstructorContent";
import { cn } from "@/lib/utils";
import { User, Lock, HelpCircle, GraduationCap } from "lucide-react";
import { useState } from "react";

// type TabKey = "profile" | "password" | "difficulty" | "faq";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("profile");

  const items = [
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
      desc: "Last change 2 weeks ago",
      icon: Lock,
      content: <PasswordContent />,
    },
  ];

  const otherItems = [
    {
      key: "instructor",
      label: "Change Instructor",
      desc: "Select your preferred instructor",
      icon: GraduationCap,
      content: <InstructorContent />,
    },
    // {
    //   key: "difficulty",
    //   label: "Change Difficulty",
    //   desc: "Easy, Normal, Hard",
    //   icon: Settings,
    //   content: <DifficultyContent />,
    // },
    {
      key: "faq",
      label: "FAQ",
      desc: "Most Frequently asked questions",
      icon: HelpCircle,
      content: <FAQContent />,
    },
  ];

  const navButtonClass = (isActive: boolean) =>
    cn(
      "flex w-full min-w-0 items-center gap-3 rounded-xl p-3 text-left transition sm:gap-4 sm:p-4 lg:p-6 lg:pl-4",
      isActive ? "bg-primary text-white" : "bg-gray-50 hover:bg-gray-100",
    );

  return (
    <div className="mx-auto flex min-h-0 min-w-0 max-w-full flex-col gap-4 sm:gap-6">
      <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
        <nav
          className="w-full shrink-0 space-y-2 sm:space-y-3 lg:w-[min(100%,20rem)] xl:w-88"
          aria-label="Settings sections"
        >
          <div className="space-y-2 pt-1 lg:my-4 lg:pt-0 xl:my-6">
            <h3 className="font-sans-serifbookfl text-xs font-semibold uppercase tracking-wide text-[#081A28] sm:text-sm">
              Account
            </h3>
          </div>
          {items.map(({ key, label, desc, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={navButtonClass(activeTab === key)}
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-white sm:size-[52px]">
                <Icon className="size-4.5 text-primary sm:size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-solway text-sm font-bold sm:text-base">
                  {label}
                </p>
                <p
                  className={cn(
                    "mt-0.5 font-sans-serifbookflf text-xs leading-snug sm:text-sm",
                    activeTab === key ? "text-white/80" : "text-gray-500",
                  )}
                >
                  {desc}
                </p>
              </div>
            </button>
          ))}
          <div className="space-y-1 pt-2 sm:space-y-2 lg:my-4 xl:my-6">
            <h3 className="font-sans-serifbookfl text-xs font-semibold uppercase tracking-wide text-[#081A28] sm:text-sm">
              Others
            </h3>
            <p className="font-solway text-sm font-bold sm:text-base">
              Notification
            </p>
          </div>
          {otherItems.map(({ key, label, desc, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={navButtonClass(activeTab === key)}
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-white sm:size-[52px]">
                <Icon className="size-4.5 text-primary sm:size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-solway text-sm font-bold sm:text-base">
                  {label}
                </p>
                <p
                  className={cn(
                    "mt-0.5 font-sans-serifbookflf text-xs leading-snug sm:text-sm",
                    activeTab === key ? "text-white/80" : "text-gray-500",
                  )}
                >
                  {desc}
                </p>
              </div>
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 rounded-2xl bg-white p-4 shadow-xs sm:p-5 lg:p-6">
          {items.find((item) => item.key === activeTab)?.content}
          {otherItems.find((item) => item.key === activeTab)?.content}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
