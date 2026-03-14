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

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-solway text-[#081A28]">
          Support Center
        </h1>
        <p className="text-gray-500 font-sans-serifbookflf mt-1">
          Get help, find answers, and reach our team
        </p>
      </div>

      {/* Quick Help Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveSection("contact")}
          className={cn(
            "flex items-center gap-4 rounded-xl p-5 text-left transition-all border-2",
            activeSection === "contact"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-transparent bg-white shadow-md hover:shadow-lg hover:border-primary/30"
          )}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-bold font-solway text-[#081A28]">Contact Us</p>
            <p className="text-sm text-gray-500 font-sans-serifbookflf">
              Send a message to our team
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
        </button>

        <button
          onClick={() => setActiveSection("faq")}
          className={cn(
            "flex items-center gap-4 rounded-xl p-5 text-left transition-all border-2",
            activeSection === "faq"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-transparent bg-white shadow-md hover:shadow-lg hover:border-primary/30"
          )}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-bold font-solway text-[#081A28]">FAQ</p>
            <p className="text-sm text-gray-500 font-sans-serifbookflf">
              Find quick answers
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
        </button>

        <a
          href="mailto:learning@rydlearning.com"
          className="flex items-center gap-4 rounded-xl p-5 text-left transition-all border-2 border-transparent bg-white shadow-md hover:shadow-lg hover:border-primary/30"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <Headphones className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-bold font-solway text-[#081A28]">Direct Email</p>
            <p className="text-sm text-gray-500 font-sans-serifbookflf">
              learning@rydlearning.com
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
        </a>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Form or FAQ */}
        <div className="flex-1 bg-white rounded-2xl shadow-md p-6">
          {activeSection === "contact" ? (
            <div>
              <h2 className="text-lg font-bold font-solway text-[#081A28] mb-6">
                Send us a message
              </h2>
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Send className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-bold font-solway text-lg text-[#081A28]">
                    Message sent successfully!
                  </p>
                  <p className="text-gray-500 mt-2 font-sans-serifbookflf">
                    We'll get back to you within 24 hours.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({ name: "", email: "", subject: "", message: "" });
                    }}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-sans-serifbookflf">
                      Your name
                    </label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      required
                      className="h-12 rounded-lg bg-[#F8F8FA] border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-sans-serifbookflf">
                      Email address
                    </label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      required
                      className="h-12 rounded-lg bg-[#F8F8FA] border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-sans-serifbookflf">
                      Subject
                    </label>
                    <Input
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="How can we help?"
                      required
                      className="h-12 rounded-lg bg-[#F8F8FA] border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-sans-serifbookflf">
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Describe your issue or question in detail..."
                      required
                      rows={5}
                      className="w-full rounded-lg bg-[#F8F8FA] border border-gray-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-lg font-solway"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send message
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold font-solway text-[#081A28] mb-4">
                Frequently asked questions
              </h2>
              <div className="relative mb-6">
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  placeholder="Search FAQ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 rounded-lg bg-[#F3ECFE] border-primary/20 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              {filteredFaqs.length > 0 ? (
                <div className="space-y-4">
                  {filteredFaqs.map((group, i) => (
                    <div key={i} className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {group.section}
                      </h3>
                      <div className="space-y-2">
                        {group.items.map((item, j) => {
                          const key = `${i}-${j}`;
                          const isOpen = openFaq === key;
                          return (
                            <Collapsible
                              key={key}
                              open={isOpen}
                              onOpenChange={() =>
                                setOpenFaq(isOpen ? null : key)
                              }
                            >
                              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl p-4 text-left font-medium transition bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-primary/20">
                                <span className="font-sans-serifbookflf">
                                  {item.q}
                                </span>
                                <ChevronRight
                                  className={cn(
                                    "h-5 w-5 text-gray-400 shrink-0 ml-2 transition-transform",
                                    isOpen && "rotate-90"
                                  )}
                                />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="px-4 pb-3 pt-2 text-sm text-gray-600 border-l-2 border-primary/30 ml-4">
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileQuestion className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="font-medium text-gray-600">No matching questions</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Try a different search term or contact us directly
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Support Info Sidebar */}
        <div className="lg:w-[320px] space-y-4 shrink-0">
          <div className="bg-gradient-to-br from-[#F3ECFE] to-primary/5 rounded-2xl p-6 border border-primary/10">
            <h3 className="font-bold font-solway text-[#081A28] mb-4">
              Support channels
            </h3>
            <div className="space-y-4">
              {supportChannels.map((channel, i) => {
                const IconComponent = channel.icon;
                return (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow-sm shrink-0">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold font-sans-serifbookflf text-sm text-[#081A28]">
                      {channel.title}
                    </p>
                    <p className="text-sm text-primary font-medium">
                      {channel.desc}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {channel.subtext}
                    </p>
                  </div>
                </div>
              );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border">
            <h3 className="font-bold font-solway text-[#081A28] mb-3">
              Need urgent help?
            </h3>
            <p className="text-sm text-gray-600 font-sans-serifbookflf mb-4">
              For critical issues, email us directly with "Urgent" in the subject
              line.
            </p>
            <Button
              variant="outline"
              className="w-full rounded-lg"
              onClick={() => {
                setActiveSection("contact");
                setFormData((prev) => ({ ...prev, subject: "Urgent - " }));
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send urgent message
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
