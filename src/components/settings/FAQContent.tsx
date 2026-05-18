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
      <h2 className="text-lg font-bold font-solway">Help and Support</h2>
      <div className="relative flex flex-col justify-center">
        <Search size={20} className="absolute left-3" />
        <Input
          placeholder="Search the help center"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 focus-visible:ring-1 focus-visible:ring-primary w-full max-w-md bg-[#F3ECFE] py-6 border-primary"
        />
      </div>

      {filteredFaqs.length > 0 ? (
        filteredFaqs.map((group, i) => (
          <div key={group.section} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500">
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
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border-none p-6 text-left font-medium transition bg-gray-50 hover:bg-gray-50">
                      <span>{item.q}</span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-gray-400 transition-transform",
                          isOpen && "rotate-90",
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="whitespace-pre-line px-3 pb-3 pt-2 text-sm text-gray-600">
                      {item.a}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-600">No matching questions found.</p>
      )}
    </div>
  );
};

export default FAQContent;
