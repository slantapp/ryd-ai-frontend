import type { Curriculum } from "../types";

export const sampleCurriculum: Curriculum = {
  slug: "my-course-slug",
  curriculum: {
    title: "My Course Title",
    description:
      "A brief description of what students will learn in this course. Make it engaging and informative!",
    language: "en",
    age: 10,
    class: "Primary 5",
    grade: 5,
    modules: [
      {
        id: "module_01",
        title: "Getting Started",
        prerequisite: null,
        lessons: [
          {
            id: "lesson_01",
            title: "Welcome to the Course",
            body: "This is the main content of your lesson. Write clear explanations here that students can read. This text appears in the lesson content area.",
            avatar_script:
              "Welcome to the course! I'm so excited to have you here. In this lesson, we'll cover the basics and get you started on your learning journey. Let's dive in!",
            media: {},
            questions: [
              {
                id: "q1_multiple_choice",
                type: "multiple_choice",
                question: "What is the purpose of this course?",
                options: [
                  "To learn new skills",
                  "To play games",
                  "To watch movies",
                  "To sleep",
                ],
                answer: "To learn new skills",
                explanation:
                  "This course is designed to help you learn new skills and grow your knowledge!",
              },
              {
                id: "q2_true_false",
                type: "true_false",
                question: "Learning can be fun and engaging.",
                answer: true,
                explanation:
                  "Absolutely! Learning is most effective when it's enjoyable and interactive.",
              },
            ],
            next_lesson_id: "lesson_02",
          },
          {
            id: "lesson_02",
            title: "Your First Hands-On Exercise",
            body: "Now that you understand the basics, let's practice what you've learned. This lesson includes a coding exercise where you'll write your own code.",
            avatar_script:
              "Great job completing the first lesson! Now it's time to put your knowledge into practice. I'll guide you through a coding exercise. Don't worry if you make mistakes - that's how we learn!",
            media: {},
            questions: [
              {
                id: "q3_code_test",
                type: "code_test",
                question:
                  "Create a variable called 'message' and set it to 'Hello World'",
                explanation:
                  "Excellent! You've created your first variable. Variables are like containers that store information.",
                code_example: {
                  code: "let message = 'Hello World';\nconsole.log(message);",
                  language: "javascript",
                  description: "Creating a variable",
                  explanation:
                    "Watch how I create a variable. I type 'let' to declare it, then the name 'message', an equals sign, and the value in quotes. This stores 'Hello World' in our variable!",
                  autoRun: false,
                  typingSpeed: 60,
                },
                testCriteria: {
                  expectedJS: "let message",
                },
              },
            ],
            next_lesson_id: "module_02",
          },
        ],
      },
      {
        id: "module_02",
        title: "Building on the Basics",
        prerequisite: "module_01",
        lessons: [
          {
            id: "lesson_03",
            title: "Taking It Further",
            body: "In this module, we'll build on what you learned in the first module. You'll discover more advanced concepts and techniques.",
            avatar_script:
              "Welcome to Module 2! You've made great progress so far. In this module, we'll explore more advanced topics. Remember, every expert was once a beginner. Let's keep learning together!",
            media: {},
            questions: [
              {
                id: "q4_multiple_choice",
                type: "multiple_choice",
                question: "What's the best way to learn something new?",
                options: [
                  "Practice regularly",
                  "Never make mistakes",
                  "Memorize everything",
                  "Skip the hard parts",
                ],
                answer: "Practice regularly",
                explanation:
                  "Practice makes perfect! Regular practice helps reinforce what you've learned and builds muscle memory.",
              },
              {
                id: "q5_true_false",
                type: "true_false",
                question: "Making mistakes is a normal part of learning.",
                answer: true,
                explanation:
                  "Correct! Mistakes are valuable learning opportunities. They help us understand what we need to improve.",
              },
            ],
            next_lesson_id: null,
          },
        ],
      },
    ],
  },
};

export const sampleCurriculumJSON = JSON.stringify(sampleCurriculum, null, 2);
