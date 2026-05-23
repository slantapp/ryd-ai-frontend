import type { Curriculum } from "../types";

export const sampleMathCurriculum: Curriculum = {
  slug: "my-math-course-slug",
  curriculum: {
    title: "My Math Course Title",
    description:
      "A brief description of what students will learn in this mathematics course.",
    language: "en",
    category: "mathematics",
    age: 12,
    class: "Grade 7",
    grade: 7,
    modules: [
      {
        id: "module_01",
        title: "Number Skills",
        prerequisite: null,
        lessons: [
          {
            id: "lesson_01",
            title: "Powers and Order of Operations",
            body: "Students review integer powers, square roots, and order of operations: brackets first, then powers, then multiplication or division, then addition or subtraction.",
            avatar_script:
              "Welcome! In this lesson we will practise powers, square roots, and careful order of operations. Watch the signs closely when negative numbers are raised to powers.",
            media: {},
            formula_example: {
              formula: "(6 - 2)^2 + (-3)^2 x 2 = 4^2 + 9 x 2 = 16 + 18 = 34",
              subject: "mathematics",
              description: "Evaluating an expression with brackets, powers, and multiplication",
              explanation:
                "Start inside the brackets, simplify each power, multiply, and then add. The negative base in (-3)^2 is squared because the negative sign is inside the brackets.",
              autoRun: false,
              typingSpeed: 60,
            },
            questions: [
              {
                id: "q1_multiple_choice",
                type: "multiple_choice",
                question: "Which two perfect square numbers does 80 lie between?",
                options: ["64 and 81", "49 and 64", "81 and 100", "100 and 121"],
                answer: "64 and 81",
                explanation:
                  "Since 8^2 = 64 and 9^2 = 81, the number 80 lies between 64 and 81.",
              },
              {
                id: "q2_true_false",
                type: "true_false",
                question:
                  "When the radical sign is used, sqrt(49) means the positive square root, 7.",
                answer: true,
                explanation:
                  "Correct. Although 49 has two square roots, 7 and -7, the radical sign represents the positive square root.",
              },
              {
                id: "q3_formula_test",
                type: "formula_test",
                question: "Evaluate (6 - 2)^2 + (-3)^2 x 2.",
                explanation:
                  "First calculate the bracket: 6 - 2 = 4. Then square: 4^2 = 16 and (-3)^2 = 9. Multiply 9 x 2 = 18. Add 16 + 18 to get 34.",
                formula_example: {
                  formula: "(6 - 2)^2 + (-3)^2 x 2 = 34",
                  subject: "mathematics",
                },
                testCriteria: {
                  expectedFormula: "34",
                },
              },
            ],
            next_lesson_id: null,
          },
        ],
      },
    ],
  },
};

export const sampleMathCurriculumJSON = JSON.stringify(
  sampleMathCurriculum,
  null,
  2,
);
