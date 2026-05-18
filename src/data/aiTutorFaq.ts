export type FaqItem = {
  q: string;
  a: string;
};

export type FaqGroup = {
  section: string;
  items: FaqItem[];
};

/** Shared FAQ for Support and Settings — RYD AI Tutor (Frank & Franca). */
export const AI_TUTOR_FAQ_GROUPS: FaqGroup[] = [
  {
    section: "RYD AI TUTOR",
    items: [
      {
        q: "What is the RYD AI Tutor?",
        a: "The RYD AI Tutor (Frank & Franca) is a flexible learning support tool designed to help children and students practice coding consistently beyond weekly classes.",
      },
      {
        q: "Who is the AI Tutor designed for?",
        a: "The AI Tutor is designed for:\n• Children learning coding\n• Students who want extra practice\n• Parents looking for flexible tech learning support\n• Schools that want to extend learning beyond the classroom",
      },
      {
        q: "How does the AI Tutor work?",
        a: "Frank & Franca guide students through coding-related learning support, practice sessions, and continuous engagement to help them stay connected to their learning journey anytime.",
      },
      {
        q: "Is the AI Tutor a replacement for live classes?",
        a: "No. The AI Tutor is designed to support and reinforce learning, not replace live classes. It works perfectly alongside the RYD cohort classes.",
      },
      {
        q: "Can my child access the AI Tutor anytime?",
        a: "Yes. The AI Tutor is flexible and accessible anytime, allowing children to practice and stay engaged beyond classroom hours.",
      },
      {
        q: "What age group is the AI Tutor for?",
        a: "The AI Tutor is suitable for children and students interested in learning and practicing coding skills.",
      },
      {
        q: "How much does the AI Tutor cost?",
        a: "The AI Tutor subscription starts from as low as $4.99 monthly.",
      },
      {
        q: "Why should my child use the AI Tutor?",
        a: "The AI Tutor helps people:\n• Stay consistent with learning\n• Practice beyond weekly classes\n• Build confidence in coding\n• Improve faster through continuous exposure",
      },
      {
        q: "Can schools use the AI Tutor for students?",
        a: "Yes. Schools can integrate Frank & Franca into their learning environment to help students continue learning beyond classroom sessions.",
      },
      {
        q: "Does my child need prior coding experience?",
        a: "No. Beginners can also get started with the AI Tutor.",
      },
      {
        q: "Can the AI Tutor help children practice what they learned in class?",
        a: "Yes. One of the main goals of Frank & Franca is to help children reinforce and stay connected to what they already learn during coding classes.",
      },
      {
        q: "How do I get started?",
        a: "Simply subscribe to the AI Tutor plan and your child can begin their learning journey immediately.",
      },
    ],
  },
];
