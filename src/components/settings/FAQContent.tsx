import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_TUTOR_FAQ_GROUPS } from "@/data/aiTutorFaq";

const FAQContent = () => {
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = useMemo(
    () =>
      AI_TUTOR_FAQ_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.a.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      })).filter((group) => group.items.length > 0),
    [searchQuery],
  );

  return (
    <div className="space-y-6">
      <h2 className="app-type-section-title">Help and Support</h2>
      <div className="relative flex flex-col justify-center">
        <Search size={20} className="absolute left-3" />
        <Input
          placeholder="Search the help center"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-full max-w-md border-primary bg-[#F3ECFE] pl-9 font-inter text-sm focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      {filteredFaqs.length > 0 ? (
        filteredFaqs.map((group) => (
          <div key={group.section} className="space-y-3">
            <h3 className="app-type-eyebrow text-[#666666]">
              {group.section}
            </h3>
            <div className="space-y-4">
              {group.items.map((item, j) => {
                const key = `${group.section}-${j}`;
                const isOpen = openItem === key;

                return (
                  <Collapsible
                    key={key}
                    open={isOpen}
                    onOpenChange={() => setOpenItem(isOpen ? null : key)}
                  >
                    <CollapsibleTrigger className="app-type-nav flex w-full items-center justify-between rounded-lg border-none bg-gray-50 p-4 text-left font-medium transition hover:bg-gray-100 sm:p-5">
                      <span className="font-inter">{item.q}</span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-gray-400 transition-transform",
                          isOpen && "rotate-90",
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="app-type-body whitespace-pre-line px-3 pb-3 pt-2">
                      {item.a}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <p className="app-type-body">No matching questions found.</p>
      )}
    </div>
  );
};

export default FAQContent;
