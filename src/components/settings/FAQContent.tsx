"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQContent = () => {
  const faqs = [
    {
      section: "INTRODUCTION",
      items: [
        {
          q: "What is RYD Learning?",
          a: "RYD Learning is a platform that helps you learn and track progress interactively.",
        },
        {
          q: "How to Login, Sign up and Manage Users?",
          a: "You can login or sign up via email and manage users from the dashboard settings.",
        },
      ],
    },
    {
      section: "ABOUT RYD",
      items: [
        {
          q: "How to Integrate RYD Learning?",
          a: "Integration is available via the integrations tab in settings.",
        },
        {
          q: "How to take RYD Quiz?",
          a: "Select any quiz module and start — progress is tracked automatically.",
        },
        {
          q: "Can I invite my friends to RYD?",
          a: "Yes, you can invite friends through the invite section on your profile.",
        },
      ],
    },
  ];

  const [openItem, setOpenItem] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold font-solway">Help and Support</h2>
      <div className="relative flex flex-col justify-center">
        <Search size={20} className="absolute left-3" />
        <Input
          placeholder="Search the help center"
          className="pl-10 focus-visible:ring-1 focus-visible:ring-primary w-full max-w-md bg-[#F3ECFE] py-6 border-primary"
        />
      </div>

      {faqs.map((group, i) => (
        <div key={i} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500">
            {group.section}
          </h3>
          <div className="space-y-4">
            {group.items.map((item, j) => {
              const key = `${i}-${j}`;
              const isOpen = openItem === key;

              return (
                <Collapsible
                  key={key}
                  open={isOpen}
                  onOpenChange={() => setOpenItem(isOpen ? null : key)}
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border-none p-6 text-left font-medium transition bg-gray-50 hover:bg-gray-50">
                    <span>{item.q}</span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-gray-400 transition-transform",
                        isOpen && "rotate-90"
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3 pt-2 text-sm text-gray-600">
                    {item.a}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FAQContent;
