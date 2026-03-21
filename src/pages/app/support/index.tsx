import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageCircle,
  Mail,
  Clock,
  ChevronRight,
  Search,
  Send,
  BookOpen,
  Headphones,
  FileQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SupportPage = () => {
  const [activeSection, setActiveSection] = useState<"contact" | "faq">("contact");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const faqs = [
    {
      section: "GETTING STARTED",
      items: [
        {
          q: "How do I enroll in a course?",
          a: "Browse the Courses section, select a course you're interested in, and click 'Enroll' to get started. Your progress will be tracked automatically.",
        },
        {
          q: "How do I access my wishlist?",
          a: "Click on 'Wishlists' in the sidebar to view all courses you've saved for later. You can enroll directly from your wishlist.",
        },
        {
          q: "How do I track my learning progress?",
          a: "Visit the Analytics section to see your learning stats, completed courses, and overall progress. The Dashboard also shows key metrics at a glance.",
        },
      ],
    },
    {
      section: "ACCOUNT & SETTINGS",
      items: [
        {
          q: "How do I change my password?",
          a: "Go to Settings → Change Password. You'll need to enter your current password and then your new password twice to confirm.",
        },
        {
          q: "How do I update my profile?",
          a: "Navigate to Settings → Update Profile to change your username, country, and other profile information.",
        },
        {
          q: "How do I change the difficulty level?",
          a: "In Settings, go to Change Difficulty and select Easy, Normal, or Hard based on your preference.",
        },
      ],
    },
    {
      section: "SUBSCRIPTION & BILLING",
      items: [
        {
          q: "What does Premium include?",
          a: "Premium gives you access to all courses, exclusive content, and priority support. Upgrade from the sidebar or Settings.",
        },
        {
          q: "How do I cancel my subscription?",
          a: "Contact our support team and we'll guide you through the cancellation process. You'll retain access until the end of your billing period.",
        },
      ],
    },
  ];

  const supportChannels = [
    {
      icon: Mail,
      title: "Email Support",
      desc: "learning@rydlearning.com",
      subtext: "We respond within 24 hours",
    },
    {
      icon: Clock,
      title: "Support Hours",
      desc: "Mon – Fri, 9AM – 6PM",
      subtext: "Your timezone (UTC)",
    },
  ];

  const filteredFaqs = faqs.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((group) => group.items.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission - integrate with your backend
    setIsSubmitted(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const quickCardClass = (active: boolean) =>
    cn(
      "flex min-w-0 items-center gap-3 rounded-xl border-2 p-4 text-left transition-all sm:gap-4 sm:p-5",
      active
        ? "border-primary bg-primary/5 shadow-md"
        : "border-transparent bg-white shadow-md hover:border-primary/30 hover:shadow-lg",
    );

  return (
    <div className="mx-auto min-h-0 min-w-0 max-w-full space-y-4 sm:space-y-6">
      <header className="min-w-0">
        <h1 className="font-solway text-xl font-bold tracking-tight text-[#081A28] sm:text-2xl lg:text-3xl">
          Support Center
        </h1>
        <p className="mt-1 font-sans-serifbookflf text-sm text-gray-500 sm:text-base">
          Get help, find answers, and reach our team
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => setActiveSection("contact")}
          className={quickCardClass(activeSection === "contact")}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:size-12">
            <MessageCircle className="size-5 text-primary sm:size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-solway text-sm font-bold text-[#081A28] sm:text-base">
              Contact Us
            </p>
            <p className="font-sans-serifbookflf text-xs text-gray-500 sm:text-sm">
              Send a message to our team
            </p>
          </div>
          <ChevronRight className="ml-auto size-5 shrink-0 text-gray-400" />
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("faq")}
          className={quickCardClass(activeSection === "faq")}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:size-12">
            <BookOpen className="size-5 text-primary sm:size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-solway text-sm font-bold text-[#081A28] sm:text-base">
              FAQ
            </p>
            <p className="font-sans-serifbookflf text-xs text-gray-500 sm:text-sm">
              Find quick answers
            </p>
          </div>
          <ChevronRight className="ml-auto size-5 shrink-0 text-gray-400" />
        </button>

        <a
          href="mailto:learning@rydlearning.com"
          className={cn(quickCardClass(false), "no-underline")}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:size-12">
            <Headphones className="size-5 text-primary sm:size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-solway text-sm font-bold text-[#081A28] sm:text-base">
              Direct Email
            </p>
            <p className="break-all font-sans-serifbookflf text-xs text-gray-500 sm:break-normal sm:text-sm">
              learning@rydlearning.com
            </p>
          </div>
          <ChevronRight className="ml-auto size-5 shrink-0 text-gray-400" />
        </a>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
        <div className="min-w-0 flex-1 rounded-2xl bg-white p-4 shadow-md sm:p-5 lg:p-6">
          {activeSection === "contact" ? (
            <div>
              <h2 className="mb-4 font-solway text-base font-bold text-[#081A28] sm:mb-6 sm:text-lg">
                Send us a message
              </h2>
              {isSubmitted ? (
                <div className="py-8 text-center sm:py-12">
                  <div className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-primary/10 sm:size-16">
                    <Send className="size-7 text-primary sm:size-8" />
                  </div>
                  <p className="font-solway text-base font-bold text-[#081A28] sm:text-lg">
                    Message sent successfully!
                  </p>
                  <p className="mt-2 font-sans-serifbookflf text-sm text-gray-500">
                    We'll get back to you within 24 hours.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 w-full max-w-xs sm:w-auto"
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({
                        name: "",
                        email: "",
                        subject: "",
                        message: "",
                      });
                    }}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="mb-1.5 block font-sans-serifbookflf text-sm font-medium text-gray-700 sm:mb-2">
                      Your name
                    </label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      required
                      className="h-11 rounded-lg border-gray-200 bg-[#F8F8FA] text-base sm:h-12 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-sans-serifbookflf text-sm font-medium text-gray-700 sm:mb-2">
                      Email address
                    </label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      required
                      className="h-11 rounded-lg border-gray-200 bg-[#F8F8FA] text-base sm:h-12 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-sans-serifbookflf text-sm font-medium text-gray-700 sm:mb-2">
                      Subject
                    </label>
                    <Input
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="How can we help?"
                      required
                      className="h-11 rounded-lg border-gray-200 bg-[#F8F8FA] text-base sm:h-12 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-sans-serifbookflf text-sm font-medium text-gray-700 sm:mb-2">
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Describe your issue or question in detail..."
                      required
                      rows={5}
                      className="w-full rounded-lg border border-gray-200 bg-[#F8F8FA] px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 sm:text-sm"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-lg font-solway sm:h-12"
                  >
                    <Send className="mr-2 size-4 shrink-0" />
                    Send message
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <h2 className="mb-3 font-solway text-base font-bold text-[#081A28] sm:mb-4 sm:text-lg">
                Frequently asked questions
              </h2>
              <div className="relative mb-4 sm:mb-6">
                <Search
                  className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <Input
                  placeholder="Search FAQ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-lg border-primary/20 bg-[#F3ECFE] pl-10 text-base focus-visible:ring-1 focus-visible:ring-primary sm:h-12 sm:text-sm"
                />
              </div>
              {filteredFaqs.length > 0 ? (
                <div className="space-y-4 sm:space-y-5">
                  {filteredFaqs.map((group) => (
                    <div key={group.section} className="space-y-2 sm:space-y-3">
                      <h3 className="text-[0.65rem] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">
                        {group.section}
                      </h3>
                      <div className="space-y-2">
                        {group.items.map((item, j) => {
                          const key = `${group.section}-${j}`;
                          const isOpen = openFaq === key;
                          return (
                            <Collapsible
                              key={key}
                              open={isOpen}
                              onOpenChange={() =>
                                setOpenFaq(isOpen ? null : key)
                              }
                            >
                              <CollapsibleTrigger className="flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-transparent bg-gray-50 p-3 text-left text-sm font-medium transition hover:border-primary/20 hover:bg-gray-100 sm:gap-3 sm:p-4 sm:text-base">
                                <span className="min-w-0 font-sans-serifbookflf">
                                  {item.q}
                                </span>
                                <ChevronRight
                                  className={cn(
                                    "size-5 shrink-0 text-gray-400 transition-transform",
                                    isOpen && "rotate-90",
                                  )}
                                />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="ml-2 border-l-2 border-primary/30 px-3 pb-3 pt-2 text-sm leading-relaxed text-gray-600 sm:ml-4 sm:px-4">
                                {item.a}
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-2 py-10 text-center sm:py-12">
                  <FileQuestion className="mb-3 size-11 text-gray-300 sm:size-12" />
                  <p className="font-medium text-gray-600">
                    No matching questions
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Try a different search term or contact us directly
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-full shrink-0 space-y-3 sm:space-y-4 lg:w-80 lg:shrink-0 xl:w-[20rem]">
          <div className="rounded-2xl border border-primary/10 bg-linear-to-br from-[#F3ECFE] to-primary/5 p-4 sm:p-6">
            <h3 className="mb-3 font-solway text-base font-bold text-[#081A28] sm:mb-4 sm:text-lg">
              Support channels
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {supportChannels.map((channel) => {
                const IconComponent = channel.icon;
                return (
                  <div
                    key={channel.title}
                    className="flex min-w-0 items-start gap-3"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm sm:size-10">
                      <IconComponent className="size-4 text-primary sm:size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-sans-serifbookflf text-xs font-semibold text-[#081A28] sm:text-sm">
                        {channel.title}
                      </p>
                      <p className="text-sm font-medium text-primary sm:text-base">
                        {channel.desc}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {channel.subtext}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-md sm:p-6">
            <h3 className="mb-2 font-solway text-base font-bold text-[#081A28] sm:mb-3 sm:text-lg">
              Need urgent help?
            </h3>
            <p className="mb-3 font-sans-serifbookflf text-sm text-gray-600 sm:mb-4">
              For critical issues, email us directly with "Urgent" in the subject
              line.
            </p>
            <Button
              variant="outline"
              className="h-11 w-full rounded-lg sm:h-12"
              onClick={() => {
                setActiveSection("contact");
                setFormData((prev) => ({ ...prev, subject: "Urgent - " }));
              }}
            >
              <Mail className="mr-2 size-4 shrink-0" />
              Send urgent message
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
