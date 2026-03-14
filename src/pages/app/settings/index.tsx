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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full gap-10 p-6">
        {/* Left Side */}
        <div className="space-y-4">
          <div className="space-y-2 my-6">
            <h3 className="font-sans-serifbookfl text-[#081A28]">ACCOUNT</h3>
          </div>
          {items.map(({ key, label, desc, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex w-full items-center gap-4 rounded-xl  p-6 px-4 text-left transition",
                activeTab === key
                  ? "bg-primary text-white"
                  : "bg-gray-50 hover:bg-gray-100"
              )}
            >
              <div className="flex items-center justify-center gap-2 rounded-[6px] bg-white w-[52px] h-[52px]">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold font-solway">{label}</p>

                <p
                  className={cn(
                    "text-sm font-sans-serifbookflf",
                    activeTab === key ? "text-white/80" : "text-gray-500"
                  )}
                >
                  {desc}
                </p>
              </div>
            </button>
          ))}
          <div className="space-y-2 my-6">
            <h3 className="font-sans-serifbookfl text-[#081A28]">OTHERS</h3>
            <p className="font-bold font-solway">Notification</p>
          </div>
          {otherItems.map(({ key, label, desc, icon: Icon }, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex w-full items-center gap-4 rounded-xl  p-6 px-4 text-left transition",
                activeTab === key
                  ? "bg-primary text-white"
                  : "bg-gray-50 hover:bg-gray-100"
              )}
            >
              <div className="flex items-center justify-center gap-2 rounded-[6px] bg-white w-[52px] h-[52px]">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold font-solway">{label}</p>

                <p
                  className={cn(
                    "text-sm font-sans-serifbookflf",
                    activeTab === key ? "text-white/80" : "text-gray-500"
                  )}
                >
                  {desc}
                </p>
              </div>
            </button>
          ))}
        </div>
        {/* Main Content */}
        <div className="flex-1 bg-white rounded-2xl p-6 shadow-xs">
          {items.find((item) => item.key === activeTab)?.content}
          {otherItems.find((item) => item.key === activeTab)?.content}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
