import beginnerDetailed from "./beginner_detailed.json";
import htmlcssJavascriptCurriculum from "./htmlcss-jacascript-curriculum.json";
import intermediateDetailed from "./intermediate_detailed.json";
import professionalDetailed from "./professional_detailed.json";
import pythonBeginner from "./python-beginner.json";
import pythonIntermediate from "./python-intermediate.json";
import pythonAdvance from "./python-advance.json";
import cssFlexGridLessons from "./css_flex_grid_lessons.json";

export interface Question {
  id?: string;
  type: "multiple_choice" | "true_false" | "code_test";
  question: string;
  options?: string[];
  answer?: string | boolean;
  explanation?: string;
  code_example?: {
    code: string;
    language: string;
    description?: string;
    explanation?: string; // Step-by-step explanation of the code example
    autoRun?: boolean;
    typingSpeed?: number;
  };
  testCriteria?: {
    expectedVariable?: string;
    expectedValue?: unknown;
    expectedValues?: unknown[];
    expectedFunction?: string;
    expectedHTML?: string; // For HTML code tests - the expected HTML pattern to find
    expectedCSS?: string; // For CSS code tests - the expected CSS pattern to find
    /** Substring that must appear in the user's code (e.g. a keyword or function name). */
    expectedJS?: string;
    /** JavaScript/TS: full code must match this regular expression (string form). */
    expectedCode?: string;
    testCases?: Array<{
      input: unknown[];
      expected: unknown;
    }>;
  };
}

export interface Lesson {
  id: string;
  title: string;
  body: string;
  avatar_script: string;
  code_example?: {
    code: string;
    language: string;
    description?: string;
    autoRun?: boolean;
    typingSpeed?: number;
  };
  media: {
    image?: string;
    video?: string;
  };
  questions: Question[];
  next_lesson_id: string | null;
}

export interface Curriculum {
  slug: string;
  curriculum: {
    title: string;
    description: string;
    language: string;
    modules: Array<{
      id: string;
      title: string;
      prerequisite: string | null;
      lessons: Lesson[];
    }>;
  };
}

// Helper function to find a lesson by ID in a specific curriculum
export function findLessonById(
  lessonId: string,
  curriculum: Curriculum["curriculum"],
): Lesson | null {
  for (const module of curriculum.modules) {
    const lesson = module.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      return lesson as Lesson;
    }
  }
  return null;
}

// Helper function to find the next lesson - handles both lesson IDs and module IDs
// If next_lesson_id is a module ID, returns the first lesson of that module
// NOTE: Lesson IDs can be duplicated across modules (e.g. css_lesson_01 in each module).
// Prefer getNextLessonInOrder(currentLesson, curriculum) when you have the current lesson object.
export function findNextLesson(
  nextLessonId: string,
  curriculum: Curriculum["curriculum"],
): Lesson | null {
  // First, try to find a lesson with this ID
  const lesson = findLessonById(nextLessonId, curriculum);
  if (lesson) {
    return lesson;
  }

  // If not found as a lesson, check if it's a module ID
  const module = curriculum.modules.find((m) => m.id === nextLessonId);
  if (module && module.lessons.length > 0) {
    return module.lessons[0] as Lesson;
  }

  return null;
}

// Get the next lesson in curriculum order by position (not by ID).
// Use this when lesson IDs are reused across modules so we don't jump to the wrong module.
export function getNextLessonInOrder(
  currentLesson: Lesson,
  curriculum: Curriculum["curriculum"],
): Lesson | null {
  for (let modIndex = 0; modIndex < curriculum.modules.length; modIndex++) {
    const mod = curriculum.modules[modIndex];
    const lessonIndex = mod.lessons.findIndex((l) => l === currentLesson);
    if (lessonIndex !== -1) {
      // Next lesson in same module
      if (lessonIndex + 1 < mod.lessons.length) {
        return mod.lessons[lessonIndex + 1] as Lesson;
      }
      // Last lesson in module: next is first lesson of next module
      if (modIndex + 1 < curriculum.modules.length) {
        const nextMod = curriculum.modules[modIndex + 1];
        if (nextMod.lessons.length > 0) {
          return nextMod.lessons[0] as Lesson;
        }
      }
      return null;
    }
  }
  return null;
}

// Get the previous lesson in curriculum order by position (not by ID).
// Use this to navigate backward through lessons/modules.
export function getPreviousLessonInOrder(
  currentLesson: Lesson,
  curriculum: Curriculum["curriculum"],
): Lesson | null {
  for (let modIndex = 0; modIndex < curriculum.modules.length; modIndex++) {
    const mod = curriculum.modules[modIndex];
    const lessonIndex = mod.lessons.findIndex((l) => l === currentLesson);
    if (lessonIndex !== -1) {
      // Previous lesson in same module
      if (lessonIndex > 0) {
        return mod.lessons[lessonIndex - 1] as Lesson;
      }
      // First lesson in module: previous is last lesson of previous module
      if (modIndex > 0) {
        const prevMod = curriculum.modules[modIndex - 1];
        if (prevMod.lessons.length > 0) {
          return prevMod.lessons[prevMod.lessons.length - 1] as Lesson;
        }
      }
      return null;
    }
  }
  return null;
}

// Get the module index that contains this lesson (by reference). Used to detect module boundaries.
export function getModuleIndexForLesson(
  lesson: Lesson,
  curriculum: Curriculum["curriculum"],
): number {
  for (let i = 0; i < curriculum.modules.length; i++) {
    if (curriculum.modules[i].lessons.includes(lesson)) return i;
  }
  return -1;
}

// Flat index of lesson in curriculum (all modules, in order). Used for progress so we restore the right lesson when IDs repeat.
export function getLessonIndexInCurriculum(
  lesson: Lesson,
  curriculum: Curriculum["curriculum"],
): number {
  let index = 0;
  for (const mod of curriculum.modules) {
    for (let i = 0; i < mod.lessons.length; i++) {
      if (mod.lessons[i] === lesson) return index;
      index++;
    }
  }
  return -1;
}

// Get lesson by flat index in curriculum (for restoring progress when lesson IDs are duplicated).
export function getLessonByIndex(
  index: number,
  curriculum: Curriculum["curriculum"],
): Lesson | null {
  let count = 0;
  for (const mod of curriculum.modules) {
    for (const lesson of mod.lessons) {
      if (count === index) return lesson as Lesson;
      count++;
    }
  }
  return null;
}

// Helper function to get the first lesson in a curriculum
export function getFirstLesson(
  curriculum: Curriculum["curriculum"],
): Lesson | null {
  const firstModule = curriculum.modules[0];
  if (firstModule && firstModule.lessons.length > 0) {
    return firstModule.lessons[0] as Lesson;
  }
  return null;
}

// Helper function to get curriculum by slug
export function getCurriculumBySlug(slug: string): Curriculum | null {
  return curriculaData.find((curriculum) => curriculum.slug === slug) || null;
}

// Helper to find the module containing a lesson and whether it's the last lesson in that module
export function getModuleInfoForLesson(
  lessonId: string,
  curriculum: Curriculum["curriculum"],
): {
  module: { id: string; title: string; lessons: Lesson[] };
  isLastLessonInModule: boolean;
  moduleTotalQuestions: number;
} | null {
  for (const mod of curriculum.modules) {
    const lessonIndex = mod.lessons.findIndex((l) => l.id === lessonId);
    if (lessonIndex !== -1) {
      const isLastLessonInModule = lessonIndex === mod.lessons.length - 1;
      const moduleTotalQuestions = mod.lessons.reduce(
        (sum, l) => sum + (l.questions?.length || 0),
        0,
      );
      return {
        module: mod,
        isLastLessonInModule,
        moduleTotalQuestions,
      };
    }
  }
  return null;
}

// Check if next_lesson_id points to a different module (vs next lesson in same module)
export function isNextModule(
  nextLessonId: string | null,
  curriculum: Curriculum["curriculum"],
): boolean {
  if (!nextLessonId) return true; // End of curriculum = end of module
  return curriculum.modules.some((m) => m.id === nextLessonId);
}

export const curriculaData: Curriculum[] = [
  {
    slug: "web-development-basics",
    curriculum: {
      title: "HTML Fundamentals",
      description:
        "Learn the building blocks of web development with HTML. Master tags, elements, and structure to create beautiful web pages.",
      language: "en",
      modules: [
        {
          id: "html_module_01",
          title: "Introduction to HTML",
          prerequisite: null,
          lessons: [
            {
              id: "html_lesson_01",
              title: "What is HTML?",
              body: "HTML stands for HyperText Markup Language. It's the standard language used to create web pages. HTML uses tags to structure content, making it readable by web browsers. Think of HTML as the skeleton of a webpage - it defines the structure and content, but not necessarily how it looks.",
              avatar_script:
                "Welcome to HTML Fundamentals! HTML is the foundation of every website you visit. It stands for HyperText Markup Language, and it's what tells your browser how to display content. Think of HTML as the skeleton of a webpage - it provides the structure. We use tags, which are like labels, to tell the browser what each piece of content is. For example, we use heading tags for titles, paragraph tags for text, and image tags for pictures. Let's start building your first webpage!",
              media: {},
              code_example: {
                code: "<!DOCTYPE html>\n<html>\n<head>\n    <title>My First Page</title>\n</head>\n<body>\n    <h1>Welcome to HTML!</h1>\n    <h2>Learning HTML</h2>\n    <p>This is a paragraph tag.</p>\n</body>\n</html>",
                language: "html",
                description:
                  "Basic HTML structure with heading and paragraph tags",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "html_q1",
                  type: "multiple_choice",
                  question: "What is HTML used for?",
                  options: [
                    "Making webpages",
                    "Playing games",
                    "Drawing pictures",
                    "Sending emails",
                  ],
                  answer: "Making webpages",
                  explanation: "HTML is used to create webpages.",
                },
                {
                  id: "html_q2",
                  type: "true_false",
                  question: "HTML tells the browser what to show.",
                  answer: true,
                  explanation: "HTML gives instructions to the browser.",
                },
                {
                  id: "html_q3",
                  type: "code_test",
                  question:
                    "Create an h2 heading tag with the text 'Learning HTML'",
                  explanation:
                    "Great! Headings help organize your content. The h2 tag creates a second-level heading, which is perfect for section titles. Remember to include both the opening and closing tags!",
                  code_example: {
                    code: "<h1>Main Title</h1>\n<h2>Learning HTML</h2>\n<p>This is a paragraph.</p>",
                    language: "html",
                    description: "Example of HTML heading tags",
                    explanation:
                      "Let me show you how HTML headings work. I'm creating an h1 tag for the main title, and an h2 tag for a section heading. Notice how each tag has an opening tag like <h2> and a closing tag like </h2>. The text goes between them. Headings help organize your page and make it easier to read.",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedHTML: "<h2>Learning HTML</h2>",
                  },
                },
              ],
              next_lesson_id: "html_lesson_02",
            },
            {
              id: "html_lesson_02",
              title: "HTML Document Structure",
              body: "Every HTML document follows a basic structure. It starts with a DOCTYPE declaration, followed by an html element that contains a head and body section. The head contains metadata like the page title, while the body contains the visible content.",
              avatar_script:
                "Now let's learn about the structure of an HTML document. Every HTML page has a specific structure that browsers expect. First, we declare the document type with DOCTYPE html. Then we have the html tag, which wraps everything. Inside, we have two main sections: the head and the body. The head contains information about the page that users don't see directly, like the title that appears in the browser tab. The body contains all the content that users will see on the page - your text, images, links, and more. This structure is like a blueprint for your webpage!",
              media: {},
              code_example: {
                code: "<!DOCTYPE html>\n<html>\n<head>\n    <title>Welcome to my webpage</title>\n</head>\n<body>\n    <p>Welcome to my webpage</p>\n</body>\n</html>",
                language: "html",
                description:
                  "Complete HTML document structure with DOCTYPE, head, and body",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "html_q4",
                  type: "multiple_choice",
                  question: "Which part shows content on the page?",
                  options: ["head", "body", "footer", "header"],
                  answer: "body",
                  explanation:
                    "The body section contains all the visible content that users see on the webpage, such as text, images, and links.",
                },
                {
                  id: "html_q5",
                  type: "true_false",
                  question: "The head tag shows text on the webpage.",
                  answer: false,
                  explanation: "The head stores information, not content.",
                },
                {
                  id: "html_q6",
                  type: "code_test",
                  question:
                    "Create a paragraph tag with the text 'Welcome to my webpage'",
                  explanation:
                    "Excellent! Paragraphs are the most common way to display text content on a webpage. The <p> tag wraps your text and creates proper spacing.",
                  code_example: {
                    code: "<p>Welcome to my webpage</p>\n<p>This is another paragraph.</p>",
                    language: "html",
                    description: "Example of HTML paragraph tags",
                    explanation:
                      "Here's how to create paragraphs. The p tag stands for paragraph. I put the opening tag <p>, then my text, and close it with </p>. Each paragraph tag creates a separate block of text with spacing. This is the most common way to add text to your webpage.",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedHTML: "<p>Welcome to my webpage</p>",
                  },
                },
              ],
              next_lesson_id: "html_lesson_03",
            },
            {
              id: "html_lesson_03",
              title: "How Browsers Read HTML",
              body: "When you open a webpage, your browser reads the HTML file from top to bottom. It looks at the tags and follows their instructions to show text, headings, and images on the screen. The browser does not guess — it only shows what the HTML tells it to show.",
              avatar_script:
                "Your browser is like a reader. It reads HTML and shows the page exactly as instructed.",
              media: {},
              code_example: {
                code: "<h1>Hello!</h1>\n<p>This text shows under the heading.</p>",
                language: "html",
                description: "HTML is read from top to bottom by the browser",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "html_q7",
                  type: "multiple_choice",
                  question: "What does a browser do with HTML?",
                  options: [
                    "Reads it and shows the webpage",
                    "Edits the code",
                    "Deletes tags",
                    "Adds colors automatically",
                  ],
                  answer: "Reads it and shows the webpage",
                  explanation:
                    "Browsers read HTML and display the webpage on the screen.",
                },
                {
                  id: "html_q8",
                  type: "multiple_choice",
                  question: "In what order does a browser read HTML?",
                  options: [
                    "From bottom to top",
                    "From the middle",
                    "From top to bottom",
                    "Randomly",
                  ],
                  answer: "From top to bottom",
                  explanation:
                    "Browsers read HTML code in order, starting at the top.",
                },
                {
                  id: "html_q9",
                  type: "true_false",
                  question: "A browser shows only what HTML tells it to show.",
                  answer: true,
                  explanation: "Browsers follow HTML instructions exactly.",
                },
              ],
              next_lesson_id: "html_module_02",
            },
          ],
        },
        {
          id: "html_module_02",
          title: "HTML Elements and Tags",
          prerequisite: "html_module_01",
          lessons: [
            {
              id: "html_lesson_01",
              title: "What is an HTML Tag?",
              body: "HTML tags tell the browser what each part of a webpage is. Tags are written using angle brackets.",
              avatar_script:
                "Let's explore some of the most common HTML tags you'll use every day! Headings are created with h1 through h6 tags, where h1 is the largest and most important heading. Paragraphs use the p tag to wrap text content. Links are made with the a tag, and they need an href attribute to specify where they go. Images use the img tag with a src attribute pointing to the image file. The div tag is a container that helps organize and group related content together. These tags work together to create well-structured, readable web pages. Practice using them, and you'll be building websites in no time!",
              media: {},
              code_example: {
                code: '<h1>Main Heading</h1>\n<p>This is a paragraph.</p>\n<a href="https://example.com">Visit Example</a>\n<img src="image.jpg" alt="Description">\n<div>Container content</div>',
                language: "html",
                description:
                  "Common HTML tags: headings, paragraphs, links, images, and divs",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "html_q01",
                  type: "multiple_choice",
                  question: "What do tags do?",
                  options: [
                    "Tell the browser what content is",
                    "Add color",
                    "Play music",
                    "Open the internet",
                  ],
                  answer: "Tell the browser what content is",
                  explanation: "Tags describe content.",
                },
                {
                  id: "html_q02",
                  type: "multiple_choice",
                  question: "Which symbols are used in tags?",
                  options: ["< >", "( )", "{ }", "[ ]"],
                  answer: "< >",
                  explanation: "Tags use angle brackets.",
                },
                {
                  id: "html_q03",
                  type: "code_test",
                  question:
                    "Create an anchor (link) tag with href='https://example.com' and the text 'Visit Example'",
                  explanation:
                    "Perfect! Links are essential for navigation on the web. The <a> tag creates clickable links, and the href attribute tells the browser where to go when clicked.",
                  code_example: {
                    code: '<a href="https://example.com">Visit Example</a>\n<a href="https://google.com">Go to Google</a>',
                    language: "html",
                    description: "Example of HTML anchor (link) tags",
                    explanation:
                      "Let me show you how to create links. The 'a' tag stands for anchor, which creates a clickable link. I use the href attribute to specify where the link goes - that's the URL. The text between the opening and closing tags is what users will see and click on. Links are how we connect different pages on the web!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedHTML:
                      "<a href='https://example.com'>Visit Example</a>",
                  },
                },
              ],
              next_lesson_id: "html_lesson_02",
            },
            {
              id: "html_lesson_02",
              title: "Opening and Closing Tags",
              body: "Most tags have an opening tag and a closing tag. The closing tag has a slash.",
              avatar_script:
                "Most HTML tags work in pairs. This means they have an opening tag and a closing tag. For example, a paragraph starts with <p> and ends with </p>. The opening tag tells the browser to start showing something, and the closing tag tells it to stop. Some tags do not need a pair because they do not wrap text. For example, the image tag <img> and the line break tag <br> do not have closing tags. These are called self-closing tags.",
              media: {},
              code_example: {
                code: "<h1>Hello</h1>",
                language: "html",
                description: "Opening and closing tags",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "html_q04",
                  type: "multiple_choice",
                  question: "Which is a closing tag?",
                  options: ["<p>", "</p>", "<p/>", "<paragraph>"],
                  answer: "</p>",
                  explanation: "Closing tags have a slash.",
                },
                {
                  id: "html_q05",
                  type: "true_false",
                  question: "Most tags come in pairs.",
                  answer: true,
                  explanation: "Opening and closing tags work together.",
                },
                {
                  id: "html_q06",
                  type: "multiple_choice",
                  question: "What does a closing tag do?",
                  options: [
                    "Starts content",
                    "Ends content",
                    "Adds color",
                    "Shows images",
                  ],
                  answer: "Ends content",
                  explanation: "It tells the browser where content ends.",
                },
              ],
              next_lesson_id: "html_lesson_03",
            },
            {
              id: "html_lesson_03",
              title: "Nesting Tags",
              body: "Nesting means putting one tag inside another tag.",
              avatar_script:
                "HTML tags can work together by being placed inside one another. This is called nesting. Think of it like putting a smaller box inside a bigger box. For example, a strong tag can go inside a paragraph tag. The important rule is to close the inside tag first before closing the outside tag, so everything stays neat and easy for the browser to understand.",
              media: {},
              code_example: {
                code: "<p><strong>Bold text</strong></p>",
                language: "html",
                description: "Nested tags",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "html_q07",
                  type: "multiple_choice",
                  question: "What is nesting?",
                  options: [
                    "Deleting tags",
                    "Putting one tag inside another",
                    "Closing the page",
                    "Changing colors",
                  ],
                  answer: "Putting one tag inside another",
                  explanation: "Nesting places tags inside others.",
                },
                {
                  id: "html_q08",
                  type: "true_false",
                  question: "Tags can be inside other tags.",
                  answer: true,
                  explanation: "This is nesting.",
                },
                {
                  id: "html_q09",
                  type: "multiple_choice",
                  question: "Which example shows nesting?",
                  options: [
                    "<p>Hello</p>",
                    "<strong>Text</strong>",
                    "<p><strong>Text</strong></p>",
                    "<img>",
                  ],
                  answer: "<p><strong>Text</strong></p>",
                  explanation: "The strong tag is inside the paragraph.",
                },
              ],
              next_lesson_id: "html_module_03",
            },
          ],
        },
        {
          id: "html_module_03",
          title: "Text, Links, and Images",
          prerequisite: "html_module_02",
          lessons: [
            {
              id: "html_lesson_01",
              title: "Paragraphs and Headings",
              body: "Paragraphs show text and headings show titles. They help make webpages easy to read.",
              avatar_script:
                "Text is how you talk to people on your webpage. Headings tell readers what the page or section is about, and paragraphs explain ideas in full sentences. Good text helps people understand your page easily, just like signs help people know where to go. Using clear headings and neat paragraphs makes your webpage friendly and easy to read.",
              media: {},
              code_example: {
                code: "<h1>Title</h1>\n<p>Text here</p>",
                language: "html",
                description: "Text tags",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "html_q01",
                  type: "multiple_choice",
                  question: "Which tag makes a heading?",
                  options: ["<h1>", "<p>", "<img>", "<a>"],
                  answer: "<h1>",
                  explanation: "h1 creates headings.",
                },
                {
                  id: "html_q02",
                  type: "true_false",
                  question: "Paragraphs help show text.",
                  answer: true,
                  explanation: "Paragraphs display text.",
                },
                {
                  id: "html_q03",
                  type: "multiple_choice",
                  question: "Which tag is for text?",
                  options: ["<p>", "<img>", "<a>", "<br>"],
                  answer: "<p>",
                  explanation: "p is used for text.",
                },
              ],
              next_lesson_id: "html_lesson_02",
            },
            {
              id: "html_lesson_02",
              title: "Links",
              body: "Links help us move to other webpages when clicked.",
              avatar_script:
                "Links help us move from one webpage to another. When you click a link, it takes you to a new page, just like a door takes you into another room. Links are made using the a tag, and the href part tells the browser where to go. Without links, the internet would feel like lots of pages with no paths between them.",
              media: {},
              code_example: {
                code: '<a href="https://example.com">Visit</a>',
                language: "html",
                description: "Link example",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "html_q04",
                  type: "multiple_choice",
                  question: "Which tag creates a link?",
                  options: ["<a>", "<p>", "<img>", "<h1>"],
                  answer: "<a>",
                  explanation: "a creates links.",
                },
                {
                  id: "html_q05",
                  type: "multiple_choice",
                  question: "What does href mean?",
                  options: [
                    "Link address",
                    "Text style",
                    "Image size",
                    "Color",
                  ],
                  answer: "Link address",
                  explanation: "href tells where the link goes.",
                },
                {
                  id: "html_q06",
                  type: "true_false",
                  question: "Links can open other pages.",
                  answer: true,
                  explanation: "Links move between pages.",
                },
              ],
              next_lesson_id: "html_lesson_03",
            },
            {
              id: "html_lesson_03",
              title: "Images",
              body: "Images show pictures on a webpage. They make pages fun and colorful.",
              avatar_script:
                "Images are pictures that help show ideas on a webpage. They make pages more colorful and fun to look at. Images can show people, animals, places, or things that are hard to explain with words. In HTML, we use the img tag to add pictures, and the alt text tells us what the picture is about in case it does not load or for people who cannot see it.",
              media: {},
              code_example: {
                code: '<img src="cat.jpg" alt="A cat">',
                language: "html",
                description: "Image tag",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "html_q07",
                  type: "multiple_choice",
                  question: "Which tag shows images?",
                  options: ["<img>", "<p>", "<a>", "<h1>"],
                  answer: "<img>",
                  explanation: "img displays pictures.",
                },
                {
                  id: "html_q08",
                  type: "true_false",
                  question: "Images can appear on webpages.",
                  answer: true,
                  explanation: "HTML can show pictures.",
                },
                {
                  id: "html_q09",
                  type: "multiple_choice",
                  question: "What does alt describe?",
                  options: ["Picture text", "Link address", "Color", "Size"],
                  answer: "Picture text",
                  explanation: "alt describes the image.",
                },
              ],
              next_lesson_id: "html_module_04",
            },
          ],
        },
        {
          id: "html_module_04",
          title: "Building a Webpage",
          prerequisite: "html_module_03",
          lessons: [
            {
              id: "html_lesson_01",
              title: "My First Webpage",
              body: "Now you will put everything together to build a simple webpage.",
              avatar_script:
                "You are now a webpage builder! This means you can use headings, text, links, and images together to create your own webpage. Just like building with blocks, each part has a place, and when you put them together carefully, your page works perfectly. Take your time, have fun, and remember — every great website starts with simple HTML.",
              media: {},
              code_example: {
                code: '<h1>My Page</h1>\n<p>Hello!</p>\n<a href="https://example.com">Click me</a>',
                language: "html",
                description: "Simple webpage",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "html_q01",
                  type: "multiple_choice",
                  question: "Which tag makes the biggest heading?",
                  options: ["<h1>", "<p>", "<img>", "<a>"],
                  answer: "<h1>",
                  explanation: "h1 is the biggest heading.",
                },
                {
                  id: "html_q02",
                  type: "multiple_choice",
                  question: "Which tag creates text?",
                  options: ["<p>", "<img>", "<a>", "<br>"],
                  answer: "<p>",
                  explanation: "p is used for text.",
                },
                {
                  id: "html_q03",
                  type: "true_false",
                  question: "A webpage can have text and links.",
                  answer: true,
                  explanation: "Webpages can show many things.",
                },
              ],
              next_lesson_id: null,
            },
          ],
        },
      ],
    },
  },
  {
    slug: "css-basics",
    curriculum: {
      title: "CSS Fundamentals",
      description:
        "Learn how to make webpages colorful, neat, and fun using CSS. CSS helps you style text, colors, spacing, and layouts.",
      language: "en",
      modules: [
        {
          id: "css_module_01",
          title: "Introduction to CSS",
          prerequisite: null,
          lessons: [
            {
              id: "css_lesson_01",
              title: "What is CSS?",
              body: "CSS stands for Cascading Style Sheets. CSS is used to decorate webpages by adding colors, changing text size, and arranging content neatly.",
              avatar_script:
                "HTML builds the page, but CSS makes it beautiful! Think of CSS like clothes for your webpage. Without CSS, webpages look plain. With CSS, you can make them colorful, neat, and fun to read.",
              media: {},
              code_example: {
                code: "p {\n  color: blue;\n}",
                language: "css",
                description: "CSS changes text color",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "css_q01",
                  type: "multiple_choice",
                  question: "What is CSS used for?",
                  options: [
                    "Styling webpages",
                    "Writing stories",
                    "Playing games",
                    "Sending messages",
                  ],
                  answer: "Styling webpages",
                  explanation: "CSS controls how webpages look.",
                },
                {
                  id: "css_q02",
                  type: "true_false",
                  question: "CSS makes webpages look better.",
                  answer: true,
                  explanation: "CSS adds style like colors and sizes.",
                },
                {
                  id: "css_q03",
                  type: "code_test",
                  question: "Change the paragraph text color to blue.",
                  explanation:
                    "Great job! The color property is one of the most commonly used CSS properties. It allows you to make your text stand out and match your webpage's design.",
                  code_example: {
                    code: "p {\n  color: blue;\n}",
                    language: "css",
                    description: "Text color example",
                    explanation:
                      "Let me show you how to change text color in CSS. First, I write the selector 'p' to target all paragraphs. Then I add curly brackets to hold my styles. Inside, I write 'color' which is the property that controls text color, followed by a colon. Then I write 'blue' as the value, and end with a semicolon. This tells the browser to make all paragraph text blue!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "color: blue;",
                  },
                },
              ],
              next_lesson_id: "css_lesson_02",
            },
            {
              id: "css_lesson_02",
              title: "How CSS Talks to HTML",
              body: "CSS works by choosing HTML elements and telling them how to look.",
              avatar_script:
                "CSS talks to HTML by using names like p, h1, or body. These names tell CSS what to style. Then CSS gives instructions like color, size, or spacing.",
              media: {},
              code_example: {
                code: "h1 {\n  color: red;\n}",
                language: "css",
                description: "Styling a heading",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "css_q04",
                  type: "multiple_choice",
                  question: "What does CSS style?",
                  options: [
                    "HTML elements",
                    "Images only",
                    "Computers",
                    "Web browsers",
                  ],
                  answer: "HTML elements",
                  explanation: "CSS styles HTML elements.",
                },
                {
                  id: "css_q05",
                  type: "true_false",
                  question: "CSS can style headings and paragraphs.",
                  answer: true,
                  explanation: "CSS can style many HTML tags.",
                },
                {
                  id: "css_q06",
                  type: "code_test",
                  question: "Make the h1 heading red.",
                  explanation:
                    "Excellent! You've learned how CSS selectors work. By using 'h1' as the selector, you can style all the main headings on your page at once!",
                  code_example: {
                    code: "h1 {\n  color: red;\n}",
                    language: "css",
                    description: "Heading color",
                    explanation:
                      "Watch how I style a heading. I start with 'h1' - this is my selector that targets all h1 headings. Then I open curly brackets. Inside, I write 'color: red;' to make the heading text red. The colon separates the property from its value, and the semicolon ends the rule. Now all h1 headings will be red!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "color: red;",
                  },
                },
              ],
              next_lesson_id: "css_lesson_03",
            },
            {
              id: "css_lesson_03",
              title: "Writing Simple CSS Rules",
              body: "A CSS rule has three parts: what to style, what to change, and the value.",
              avatar_script:
                "A CSS rule is like a sentence. First, you say what you want to style. Then you say what you want to change. Finally, you give the value.",
              media: {},
              code_example: {
                code: "p {\n  font-size: 20px;\n}",
                language: "css",
                description: "CSS rule structure",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "css_q07",
                  type: "multiple_choice",
                  question: "What part chooses what to style?",
                  options: ["Selector", "Property", "Value", "Bracket"],
                  answer: "Selector",
                  explanation: "The selector chooses the element.",
                },
                {
                  id: "css_q08",
                  type: "true_false",
                  question: "CSS rules tell elements how to look.",
                  answer: true,
                  explanation: "Rules control style.",
                },
                {
                  id: "css_q09",
                  type: "code_test",
                  question: "Make paragraph text size 20px.",
                  explanation:
                    "Well done! The font-size property lets you control how big or small your text appears. Using pixels (px) gives you precise control over the exact size.",
                  code_example: {
                    code: "p {\n  font-size: 20px;\n}",
                    language: "css",
                    description: "Font size",
                    explanation:
                      "Here's how to change text size. I select paragraphs with 'p', then inside the curly brackets, I use the 'font-size' property. Notice it has a hyphen between 'font' and 'size'. I set it to '20px' - that's 20 pixels. Pixels are tiny dots on your screen, so 20px makes the text a nice readable size!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "font-size: 20px;",
                  },
                },
              ],
              next_lesson_id: "css_module_02",
            },
          ],
        },
        {
          id: "css_module_02",
          title: "Colors and Text Styling",
          prerequisite: "css_module_01",
          lessons: [
            {
              id: "css_lesson_01",
              title: "Text Colors",
              body: "CSS can change the color of text to make it easy and fun to read.",
              avatar_script:
                "Colors help people enjoy reading your page. CSS lets you change text colors using simple words like red, blue, or green.",
              media: {},
              code_example: {
                code: "p {\n  color: green;\n}",
                language: "css",
                description: "Green text",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "css_q01",
                  type: "multiple_choice",
                  question: "Which property changes text color?",
                  options: ["color", "font", "space", "size"],
                  answer: "color",
                  explanation: "Color changes text color.",
                },
                {
                  id: "css_q02",
                  type: "true_false",
                  question: "CSS can use color names.",
                  answer: true,
                  explanation: "CSS understands color names.",
                },
                {
                  id: "css_q03",
                  type: "code_test",
                  question: "Change text color to green.",
                  explanation:
                    "Perfect! You're getting good at changing colors. CSS understands many color names like green, red, blue, purple, and more!",
                  code_example: {
                    code: "p {\n  color: green;\n}",
                    language: "css",
                    description: "Green text",
                    explanation:
                      "Let me show you how to make text green. I write 'p' to select paragraphs, then open my curly brackets. Inside, I write 'color: green;' - the property is 'color', and the value is 'green'. CSS knows many color names, so you can use words like green, blue, red, or even lightgreen and darkblue!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "color: green;",
                  },
                },
              ],
              next_lesson_id: "css_lesson_02",
            },
            {
              id: "css_lesson_02",
              title: "Background Colors",
              body: "CSS can color the background of a webpage.",
              avatar_script:
                "Background colors make your webpage stand out. You can color the whole page or just one part.",
              media: {},
              code_example: {
                code: "body {\n  background-color: lightblue;\n}",
                language: "css",
                description: "Page background",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "css_q04",
                  type: "multiple_choice",
                  question: "Which property colors the background?",
                  options: ["background-color", "color", "font-size", "margin"],
                  answer: "background-color",
                  explanation: "background-color sets the background.",
                },
                {
                  id: "css_q05",
                  type: "true_false",
                  question: "Background color can be added to the body.",
                  answer: true,
                  explanation: "The body can be styled.",
                },
                {
                  id: "css_q06",
                  type: "code_test",
                  question: "Make the page background lightblue.",
                  explanation:
                    "Awesome! Background colors make your webpage feel welcoming and fun. The body selector lets you style the entire page at once!",
                  code_example: {
                    code: "body {\n  background-color: lightblue;\n}",
                    language: "css",
                    description: "Background color",
                    explanation:
                      "Watch how I color the whole page background. I use 'body' as my selector - this targets the entire webpage. Then I use 'background-color' as the property. Notice it has a hyphen! I set it to 'lightblue', which is a soft, pretty blue color. Now the whole page has a nice blue background!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "background-color: lightblue;",
                  },
                },
              ],
              next_lesson_id: "css_lesson_03",
            },
            {
              id: "css_lesson_03",
              title: "Text Size",
              body: "CSS can make text big or small.",
              avatar_script:
                "Big text is easy to see, small text is neat. CSS lets you choose the size.",
              media: {},
              code_example: {
                code: "h1 {\n  font-size: 36px;\n}",
                language: "css",
                description: "Big heading",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "css_q07",
                  type: "multiple_choice",
                  question: "Which property changes text size?",
                  options: ["font-size", "color", "margin", "padding"],
                  answer: "font-size",
                  explanation: "font-size controls size.",
                },
                {
                  id: "css_q08",
                  type: "true_false",
                  question: "CSS can change text size.",
                  answer: true,
                  explanation: "CSS styles text size.",
                },
                {
                  id: "css_q09",
                  type: "code_test",
                  question: "Make the heading size 36px.",
                  explanation:
                    "Great work! Big headings grab attention and help readers know what your page is about. 36 pixels is a nice large size for main titles!",
                  code_example: {
                    code: "h1 {\n  font-size: 36px;\n}",
                    language: "css",
                    description: "Heading size",
                    explanation:
                      "Let me make a big heading. I select 'h1' for the main heading, then use 'font-size' to control how big it is. I'm setting it to '36px' - that's 36 pixels, which makes a nice big title that's easy to see. Bigger numbers mean bigger text!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "font-size: 36px;",
                  },
                },
              ],
              next_lesson_id: "css_module_03",
            },
          ],
        },
        {
          id: "css_module_03",
          title: "Spacing and Boxes",
          prerequisite: "css_module_02",
          lessons: [
            {
              id: "css_lesson_01",
              title: "Padding",
              body: "Padding adds space inside elements.",
              avatar_script:
                "Padding is like space inside a box. It helps text breathe.",
              media: {},
              code_example: {
                code: "p {\n  padding: 10px;\n}",
                language: "css",
                description: "Padding example",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "css_q01",
                  type: "multiple_choice",
                  question: "Padding adds space where?",
                  options: ["Inside", "Outside", "Below", "Above"],
                  answer: "Inside",
                  explanation: "Padding is inside space.",
                },
                {
                  id: "css_q02",
                  type: "true_false",
                  question: "Padding makes content comfortable.",
                  answer: true,
                  explanation: "Padding adds breathing room.",
                },
                {
                  id: "css_q03",
                  type: "code_test",
                  question: "Add 10px padding.",
                  explanation:
                    "Nice! Padding gives your content room to breathe. It creates space between your text and the edge of its container, making it easier to read.",
                  code_example: {
                    code: "p {\n  padding: 10px;\n}",
                    language: "css",
                    description: "Padding",
                    explanation:
                      "Let me show you padding. Padding adds space INSIDE an element, like cushioning inside a box. I select 'p' for paragraphs, then write 'padding: 10px;'. This adds 10 pixels of space on all four sides - top, right, bottom, and left. Now the text won't touch the edges!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "padding: 10px;",
                  },
                },
              ],
              next_lesson_id: "css_lesson_02",
            },
            {
              id: "css_lesson_02",
              title: "Margin",
              body: "Margin adds space outside elements.",
              avatar_script:
                "Margin is the space outside the box. It separates items.",
              media: {},
              code_example: {
                code: "p {\n  margin: 15px;\n}",
                language: "css",
                description: "Margin example",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "css_q04",
                  type: "multiple_choice",
                  question: "Margin adds space where?",
                  options: ["Outside", "Inside", "On text", "On color"],
                  answer: "Outside",
                  explanation: "Margin is outside space.",
                },
                {
                  id: "css_q05",
                  type: "true_false",
                  question: "Margin separates elements.",
                  answer: true,
                  explanation: "Margin adds gaps.",
                },
                {
                  id: "css_q06",
                  type: "code_test",
                  question: "Add 15px margin.",
                  explanation:
                    "Well done! Margin creates space OUTSIDE elements, keeping them from bumping into each other. This makes your page look neat and organized.",
                  code_example: {
                    code: "p {\n  margin: 15px;\n}",
                    language: "css",
                    description: "Margin",
                    explanation:
                      "Now let's learn about margin. Unlike padding which is inside, margin adds space OUTSIDE an element. Think of it like personal space between people! I write 'margin: 15px;' to add 15 pixels of space around the paragraph. This keeps it separated from other elements on the page.",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "margin: 15px;",
                  },
                },
              ],
              next_lesson_id: "css_lesson_03",
            },
            {
              id: "css_lesson_03",
              title: "Borders",
              body: "Borders draw lines around elements.",
              avatar_script:
                "Borders are outlines that help you see boxes clearly.",
              media: {},
              code_example: {
                code: "p {\n  border: 2px solid black;\n}",
                language: "css",
                description: "Border example",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "css_q07",
                  type: "multiple_choice",
                  question: "What do borders do?",
                  options: [
                    "Draw lines",
                    "Change text",
                    "Move content",
                    "Add images",
                  ],
                  answer: "Draw lines",
                  explanation: "Borders outline elements.",
                },
                {
                  id: "css_q08",
                  type: "true_false",
                  question: "Borders can show element edges.",
                  answer: true,
                  explanation: "Borders outline boxes.",
                },
                {
                  id: "css_q09",
                  type: "code_test",
                  question: "Add a black border.",
                  explanation:
                    "Excellent! Borders help define the edges of elements and make them stand out. You can use different thicknesses, styles, and colors!",
                  code_example: {
                    code: "p {\n  border: 2px solid black;\n}",
                    language: "css",
                    description: "Border",
                    explanation:
                      "Let me show you how borders work. The border property needs three things: thickness, style, and color. I write 'border: 2px solid black;' - that's 2 pixels thick, a solid line (not dotted or dashed), and black color. All three values go together separated by spaces. Now the paragraph has a nice frame around it!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "border: 2px solid black;",
                  },
                },
              ],
              next_lesson_id: "css_module_04",
            },
          ],
        },
        {
          id: "css_module_04",
          title: "Styling a Webpage",
          prerequisite: "css_module_03",
          lessons: [
            {
              id: "css_lesson_01",
              title: "Styling Text Together",
              body: "CSS can style text in many ways at once.",
              avatar_script:
                "You can change color, size, and spacing together.",
              media: {},
              code_example: {
                code: "p {\n  color: purple;\n  font-size: 18px;\n}",
                language: "css",
                description: "Styled text",
                autoRun: false,
                typingSpeed: 80,
              },
              questions: [
                {
                  id: "css_q01",
                  type: "true_false",
                  question: "CSS can use many rules together.",
                  answer: true,
                  explanation: "CSS rules can combine.",
                },
                {
                  id: "css_q02",
                  type: "multiple_choice",
                  question: "Which rule changes text size?",
                  options: ["font-size", "color", "border", "margin"],
                  answer: "font-size",
                  explanation: "font-size changes size.",
                },
                {
                  id: "css_q03",
                  type: "code_test",
                  question: "Make text brown and change size to 30px.",
                  explanation:
                    "Amazing! You've learned to combine multiple CSS properties together. This is how real web designers create beautiful, unique styles!",
                  code_example: {
                    code: "h2 {\n  font-size: 30px;\n  color: brown;\n}",
                    language: "css",
                    description: "Brown text and font-size of 30px",
                    explanation:
                      "Now let's combine multiple styles! I select 'h2' for subheadings. Inside the curly brackets, I can add as many properties as I want. First, 'font-size: 30px;' makes it big. Then on a new line, 'color: brown;' makes it brown. Each property ends with a semicolon. You can keep adding more styles to make your text look exactly how you want!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "font-size: 30px; color: brown",
                  },
                },
              ],
              next_lesson_id: null,
            },
          ],
        },
      ],
    },
  },
  {
    slug: "html-css-combined",
    curriculum: {
      title: "HTML and CSS Fundamentals",
      description:
        "Learn how to build and style webpages using HTML and CSS together. This course teaches structure, design, and layout step by step for young learners.",
      language: "en",
      modules: [
        {
          id: "htmlcss_module_01",
          title: "Introduction to HTML and CSS",
          prerequisite: null,
          lessons: [
            {
              id: "htmlcss_lesson_01",
              title: "What Are HTML and CSS?",
              body: "HTML builds the structure of a webpage while CSS controls how it looks.",
              avatar_script:
                "HTML is like the bones of a webpage. CSS is like the clothes and colors. HTML tells the browser what things are, and CSS makes them beautiful.",
              code_example: {
                code: "<h1>Hello</h1>\n<p>This is my page</p>",
                language: "html",
                description: "Simple HTML structure",
                autoRun: false,
                typingSpeed: 80,
              },
              media: {},
              questions: [
                {
                  id: "htmlcss_q01",
                  type: "multiple_choice",
                  question: "What does HTML do?",
                  options: [
                    "Styles the page",
                    "Builds the structure",
                    "Adds sound",
                    "Runs games",
                  ],
                  answer: "Builds the structure",
                  explanation: "HTML creates the page structure.",
                },
                {
                  id: "htmlcss_q02",
                  type: "true_false",
                  question: "CSS controls how a webpage looks.",
                  answer: true,
                  explanation: "CSS styles the page.",
                },
                {
                  id: "htmlcss_q03",
                  type: "code_test",
                  question: "Create a paragraph with the text 'Hello world'.",
                  explanation:
                    "Great job! Paragraphs are the building blocks of text content on webpages. They help organize your writing into readable chunks.",
                  code_example: {
                    code: "<p>Hello world</p>\n<p>This is another paragraph.</p>",
                    language: "html",
                    description: "HTML paragraph tags",
                    explanation:
                      "Let me show you how to create a paragraph. I use the 'p' tag - that stands for paragraph. I write the opening tag <p>, then my text 'Hello world', and close it with </p>. The text goes between the opening and closing tags. Every paragraph needs both tags to work properly!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedHTML: "<p>Hello world</p>",
                  },
                },
              ],
              next_lesson_id: "htmlcss_lesson_02",
            },
            {
              id: "htmlcss_lesson_02",
              title: "HTML Review: Headings and Text",
              body: "Headings show titles and paragraphs show text.",
              avatar_script:
                "Headings help people know what a page is about. Paragraphs explain ideas using text.",
              code_example: {
                code: "<h1>My Page</h1>\n<p>This is my website.</p>",
                language: "html",
                description: "Headings and paragraphs",
                autoRun: false,
                typingSpeed: 80,
              },
              media: {},
              questions: [
                {
                  id: "htmlcss_q04",
                  type: "multiple_choice",
                  question: "Which tag makes a heading?",
                  options: ["<p>", "<h1>", "<img>", "<a>"],
                  answer: "<h1>",
                  explanation: "h1 creates headings.",
                },
                {
                  id: "htmlcss_q05",
                  type: "true_false",
                  question: "Paragraphs are used to show text.",
                  answer: true,
                  explanation: "Paragraphs display text.",
                },
                {
                  id: "htmlcss_q06",
                  type: "code_test",
                  question: "Create an h2 heading with the text 'About Me'.",
                  explanation:
                    "Well done! Headings help organize your page into sections. The h2 tag is perfect for section titles, while h1 is usually for the main page title.",
                  code_example: {
                    code: "<h1>My Website</h1>\n<h2>About Me</h2>\n<p>I love coding!</p>",
                    language: "html",
                    description: "HTML heading tags",
                    explanation:
                      "Let me show you headings. HTML has six heading levels, from h1 (biggest) to h6 (smallest). I'm using h2 for a section title. I write <h2>, then my text 'About Me', and close with </h2>. Headings make your page easier to read and help people find what they're looking for!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedHTML: "<h2>About Me</h2>",
                  },
                },
              ],
              next_lesson_id: "htmlcss_lesson_03",
            },
            {
              id: "htmlcss_lesson_03",
              title: "What Is CSS?",
              body: "CSS is used to add color, size, and layout to webpages.",
              avatar_script:
                "CSS tells the browser how things should look. You can change colors, sizes, and spacing.",
              code_example: {
                code: "p {\n  color: blue;\n}",
                language: "css",
                description: "Basic CSS rule",
                autoRun: false,
                typingSpeed: 80,
              },
              media: {},
              questions: [
                {
                  id: "htmlcss_q07",
                  type: "multiple_choice",
                  question: "What does CSS change?",
                  options: ["Structure", "Style", "Internet", "Files"],
                  answer: "Style",
                  explanation: "CSS styles content.",
                },
                {
                  id: "htmlcss_q08",
                  type: "true_false",
                  question: "CSS can change text color.",
                  answer: true,
                  explanation: "CSS controls colors.",
                },
                {
                  id: "htmlcss_q09",
                  type: "code_test",
                  question: "Change paragraph text color to red.",
                  explanation:
                    "Excellent! You're learning how CSS styles HTML elements. The color property is one of the most useful CSS properties you'll use!",
                  code_example: {
                    code: "p {\n  color: red;\n}",
                    language: "css",
                    description: "CSS text color",
                    explanation:
                      "Now let's style with CSS! To change text color, I first write the selector 'p' to target paragraphs. Then I add curly brackets. Inside, I write 'color: red;' - 'color' is the property, and 'red' is the value. Don't forget the colon after the property and semicolon at the end!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "color: red;",
                  },
                },
              ],
              next_lesson_id: "htmlcss_module_02",
            },
          ],
        },

        {
          id: "htmlcss_module_02",
          title: "Styling Text and Colors",
          prerequisite: "htmlcss_module_01",
          lessons: [
            {
              id: "htmlcss_lesson_01",
              title: "Text Color and Size",
              body: "CSS can change how text looks.",
              avatar_script:
                "You can make text bigger, smaller, or colorful using CSS.",
              code_example: {
                code: "p {\n  font-size: 18px;\n  color: green;\n}",
                language: "css",
                description: "Text styling",
                autoRun: false,
                typingSpeed: 80,
              },
              media: {},
              questions: [
                {
                  id: "htmlcss_q01",
                  type: "multiple_choice",
                  question: "Which property changes text size?",
                  options: ["color", "font-size", "margin", "padding"],
                  answer: "font-size",
                  explanation: "font-size controls text size.",
                },
                {
                  id: "htmlcss_q02",
                  type: "true_false",
                  question: "CSS can change text color.",
                  answer: true,
                  explanation: "CSS controls colors.",
                },
                {
                  id: "htmlcss_q03",
                  type: "code_test",
                  question: "Set text size to 20px.",
                  explanation:
                    "Nice work! Controlling text size helps make your content readable. Bigger text is easier to read, while smaller text fits more content.",
                  code_example: {
                    code: "p {\n  font-size: 20px;\n}",
                    language: "css",
                    description: "CSS font size",
                    explanation:
                      "Let me show you how to change text size. I use the 'font-size' property - notice the hyphen between 'font' and 'size'. I set it to '20px', which means 20 pixels. Pixels are tiny dots on your screen. The bigger the number, the bigger the text will be!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "font-size: 20px;",
                  },
                },
              ],
              next_lesson_id: "htmlcss_lesson_02",
            },
            {
              id: "htmlcss_lesson_02",
              title: "Background Colors",
              body: "Background colors help sections stand out.",
              avatar_script:
                "Background colors make parts of your page easy to see.",
              code_example: {
                code: "div {\n  background-color: lightblue;\n}",
                language: "css",
                description: "Background color",
                autoRun: false,
                typingSpeed: 80,
              },
              media: {},
              questions: [
                {
                  id: "htmlcss_q04",
                  type: "multiple_choice",
                  question: "Which property changes background color?",
                  options: ["color", "background-color", "border", "width"],
                  answer: "background-color",
                  explanation: "background-color styles backgrounds.",
                },
                {
                  id: "htmlcss_q05",
                  type: "true_false",
                  question: "Background colors can be applied to divs.",
                  answer: true,
                  explanation: "Divs can have backgrounds.",
                },
                {
                  id: "htmlcss_q06",
                  type: "code_test",
                  question: "Set background color to yellow.",
                  explanation:
                    "Great! Background colors make your page sections pop and help organize content visually. Yellow is a bright, cheerful choice!",
                  code_example: {
                    code: "div {\n  background-color: yellow;\n}",
                    language: "css",
                    description: "CSS background color",
                    explanation:
                      "Let me show you background colors. I use 'background-color' as the property - notice the hyphen! I set it to 'yellow' to create a bright background. You can use any color name like yellow, pink, lightgreen, or even special codes for custom colors!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "background-color: yellow;",
                  },
                },
              ],
              next_lesson_id: "htmlcss_lesson_03",
            },
            {
              id: "htmlcss_lesson_03",
              title: "Styling Headings",
              body: "Headings can be styled to look bold and clear.",
              avatar_script:
                "Big colorful headings help people read your page easily.",
              code_example: {
                code: "h1 {\n  color: purple;\n}",
                language: "css",
                description: "Styled heading",
                autoRun: false,
                typingSpeed: 80,
              },
              media: {},
              questions: [
                {
                  id: "htmlcss_q07",
                  type: "multiple_choice",
                  question: "Which selector targets headings?",
                  options: ["p", "div", "h1", "img"],
                  answer: "h1",
                  explanation: "h1 targets headings.",
                },
                {
                  id: "htmlcss_q08",
                  type: "true_false",
                  question: "Headings can be styled using CSS.",
                  answer: true,
                  explanation: "CSS styles headings.",
                },
                {
                  id: "htmlcss_q09",
                  type: "code_test",
                  question: "Change heading color to blue.",
                  explanation:
                    "Well done! Colorful headings catch the reader's eye and make your page more interesting. Blue is a popular choice for professional-looking pages!",
                  code_example: {
                    code: "h1 {\n  color: blue;\n}",
                    language: "css",
                    description: "CSS heading color",
                    explanation:
                      "Let me style a heading. I use 'h1' as my selector to target the main heading. Then I set 'color: blue;' to make the text blue. This same technique works for h2, h3, and other heading levels too. You can make each heading level a different color if you want!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "color: blue;",
                  },
                },
              ],
              next_lesson_id: "htmlcss_module_03",
            },
          ],
        },

        {
          id: "htmlcss_module_03",
          title: "Layout, Boxes, and Spacing",
          prerequisite: "htmlcss_module_02",
          lessons: [
            {
              id: "htmlcss_lesson_01",
              title: "The Box Model",
              body: "Every HTML element is a box.",
              avatar_script:
                "Each box has content, padding, border, and margin.",
              code_example: {
                code: "div {\n  padding: 10px;\n  border: 2px solid black;\n  margin: 15px;\n}",
                language: "css",
                description: "Box model example",
                autoRun: false,
                typingSpeed: 80,
              },
              media: {},
              questions: [
                {
                  id: "htmlcss_q01",
                  type: "multiple_choice",
                  question: "What is inside the border?",
                  options: ["Margin", "Padding", "Screen", "Outline"],
                  answer: "Padding",
                  explanation: "Padding is inside the border.",
                },
                {
                  id: "htmlcss_q02",
                  type: "true_false",
                  question: "All elements are boxes.",
                  answer: true,
                  explanation: "Browsers treat elements as boxes.",
                },
                {
                  id: "htmlcss_q03",
                  type: "code_test",
                  question: "Add 20px padding.",
                  explanation:
                    "Perfect! Padding creates breathing room inside elements. It keeps your content from touching the edges, making everything look cleaner.",
                  code_example: {
                    code: "div {\n  padding: 20px;\n}",
                    language: "css",
                    description: "CSS padding",
                    explanation:
                      "Let me explain padding. Padding adds space INSIDE an element, between the content and its border. Think of it like the cushioning inside a picture frame. I write 'padding: 20px;' to add 20 pixels of space on all four sides. This makes the content feel less cramped!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "padding: 20px;",
                  },
                },
              ],
              next_lesson_id: "htmlcss_lesson_02",
            },
            {
              id: "htmlcss_lesson_02",
              title: "Margin and Padding",
              body: "Margin adds space outside elements.",
              avatar_script:
                "Margins push elements apart. Padding gives space inside.",
              code_example: {
                code: "p {\n  margin: 20px;\n}",
                language: "css",
                description: "Margin example",
                autoRun: false,
                typingSpeed: 80,
              },
              media: {},
              questions: [
                {
                  id: "htmlcss_q04",
                  type: "multiple_choice",
                  question: "What does margin do?",
                  options: [
                    "Inside space",
                    "Outside space",
                    "Text color",
                    "Size",
                  ],
                  answer: "Outside space",
                  explanation: "Margin creates outer space.",
                },
                {
                  id: "htmlcss_q05",
                  type: "true_false",
                  question: "Padding adds space inside.",
                  answer: true,
                  explanation: "Padding is inner spacing.",
                },
                {
                  id: "htmlcss_q06",
                  type: "code_test",
                  question: "Set margin to 30px.",
                  explanation:
                    "Excellent! Margin creates space OUTSIDE elements, keeping them from crowding each other. This helps your page look organized and professional.",
                  code_example: {
                    code: "p {\n  margin: 30px;\n}",
                    language: "css",
                    description: "CSS margin",
                    explanation:
                      "Now let's learn margin. Unlike padding which is inside, margin adds space OUTSIDE an element. It's like personal space between people standing in line! I write 'margin: 30px;' to add 30 pixels of space around the element. This keeps it separated from everything else on the page.",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "margin: 30px;",
                  },
                },
              ],
              next_lesson_id: "htmlcss_lesson_03",
            },
            {
              id: "htmlcss_lesson_03",
              title: "Width and Height",
              body: "Width and height control size.",
              avatar_script: "You can control how big things appear.",
              code_example: {
                code: "div {\n  width: 200px;\n  height: 100px;\n}",
                language: "css",
                description: "Width and height example",
                autoRun: false,
                typingSpeed: 80,
              },
              media: {},
              questions: [
                {
                  id: "htmlcss_q07",
                  type: "multiple_choice",
                  question: "Which property controls width?",
                  options: ["height", "width", "padding", "margin"],
                  answer: "width",
                  explanation: "Width controls horizontal size.",
                },
                {
                  id: "htmlcss_q08",
                  type: "true_false",
                  question: "Height controls how tall an element is.",
                  answer: true,
                  explanation: "Height sets vertical size.",
                },
                {
                  id: "htmlcss_q09",
                  type: "code_test",
                  question: "Set height to 150px.",
                  explanation:
                    "Great job! The height property lets you control exactly how tall an element should be. This is useful for creating consistent layouts.",
                  code_example: {
                    code: "div {\n  height: 150px;\n  width: 200px;\n}",
                    language: "css",
                    description: "CSS height and width",
                    explanation:
                      "Let me show you how to set height. The 'height' property controls how tall an element is. I write 'height: 150px;' to make it exactly 150 pixels tall. You can also use 'width' to control how wide it is. Together, these properties let you create boxes of any size you want!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "height: 150px;",
                  },
                },
              ],
              next_lesson_id: "htmlcss_module_04",
            },
          ],
        },

        {
          id: "htmlcss_module_04",
          title: "Building a Styled Webpage",
          prerequisite: "htmlcss_module_03",
          lessons: [
            {
              id: "htmlcss_lesson_01",
              title: "Combining HTML and CSS",
              body: "HTML builds pages and CSS styles them.",
              avatar_script:
                "When HTML and CSS work together, your page looks amazing.",
              code_example: {
                code: '<h1 class="title">My Page</h1>\n\n.title {\n  color: blue;\n}',
                language: "html",
                description: "HTML with CSS class",
                autoRun: false,
                typingSpeed: 80,
              },
              media: {},
              questions: [
                {
                  id: "htmlcss_q01",
                  type: "multiple_choice",
                  question: "What styles the page?",
                  options: ["HTML", "CSS", "Browser", "Server"],
                  answer: "CSS",
                  explanation: "CSS styles pages.",
                },
                {
                  id: "htmlcss_q02",
                  type: "true_false",
                  question: "HTML and CSS work together.",
                  answer: true,
                  explanation: "They are used together.",
                },
                {
                  id: "htmlcss_q03",
                  type: "code_test",
                  question: "Change text color to green.",
                  explanation:
                    "Wonderful! You're combining HTML and CSS like a real web developer. Green is a great color that's easy on the eyes!",
                  code_example: {
                    code: "p {\n  color: green;\n}",
                    language: "css",
                    description: "CSS green text",
                    explanation:
                      "Let me change the text to green. I select the element I want to style, then use 'color: green;' inside the curly brackets. CSS knows many color names - you can try green, darkgreen, lightgreen, or even lime for different shades of green!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "color: green;",
                  },
                },
              ],
              next_lesson_id: "htmlcss_lesson_02",
            },
            {
              id: "htmlcss_lesson_02",
              title: "Styling a Card",
              body: "Cards hold content neatly.",
              avatar_script: "Cards are used everywhere to group content.",
              code_example: {
                code: ".card {\n  border: 1px solid black;\n  padding: 15px;\n}",
                language: "css",
                description: "Card styling",
                autoRun: false,
                typingSpeed: 80,
              },
              media: {},
              questions: [
                {
                  id: "htmlcss_q04",
                  type: "multiple_choice",
                  question: "Which property adds inner space?",
                  options: ["margin", "padding", "border", "width"],
                  answer: "padding",
                  explanation: "Padding adds inner space.",
                },
                {
                  id: "htmlcss_q05",
                  type: "true_false",
                  question: "Cards help organize content.",
                  answer: true,
                  explanation: "Cards group content.",
                },
                {
                  id: "htmlcss_q06",
                  type: "code_test",
                  question: "Add a 2px solid border.",
                  explanation:
                    "Excellent! Borders frame your content and make cards look polished. You've learned how to combine thickness, style, and color in one property!",
                  code_example: {
                    code: ".card {\n  border: 2px solid black;\n  padding: 15px;\n}",
                    language: "css",
                    description: "CSS border styling",
                    explanation:
                      "Let me show you borders. The border property needs three values: thickness, style, and color. I write 'border: 2px solid black;' - that's 2 pixels thick, a solid line (not dotted or dashed), and black color. All three go together with spaces between them. This creates a nice frame around the element!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "border: 2px solid black;",
                  },
                },
              ],
              next_lesson_id: "htmlcss_lesson_03",
            },
            {
              id: "htmlcss_lesson_03",
              title: "My First Styled Page",
              body: "Build and style your own page.",
              avatar_script: "You are now a webpage designer!",
              code_example: {
                code: "<h1>Welcome</h1>\n<p>This is my website.</p>\n\nh1 { color: purple; }\np { font-size: 18px; }",
                language: "html",
                description: "Mini project page",
                autoRun: false,
                typingSpeed: 80,
              },
              media: {},
              questions: [
                {
                  id: "htmlcss_q07",
                  type: "multiple_choice",
                  question: "Which language styles text size?",
                  options: ["HTML", "CSS", "Python", "Scratch"],
                  answer: "CSS",
                  explanation: "CSS styles text.",
                },
                {
                  id: "htmlcss_q08",
                  type: "true_false",
                  question: "CSS can change font size.",
                  answer: true,
                  explanation: "CSS controls font size.",
                },
                {
                  id: "htmlcss_q09",
                  type: "code_test",
                  question: "Set paragraph font size to 20px.",
                  explanation:
                    "Congratulations! You've completed the course and learned how to build and style webpages. You're now a webpage designer!",
                  code_example: {
                    code: "p {\n  font-size: 20px;\n  color: purple;\n}",
                    language: "css",
                    description: "Final CSS styling",
                    explanation:
                      "For our final lesson, let's style paragraphs. I use 'font-size: 20px;' to make the text a nice readable size. Remember, you can combine multiple properties together - like adding color too! You've learned so much about HTML and CSS. Now you can create your own beautiful webpages!",
                    autoRun: false,
                    typingSpeed: 80,
                  },
                  testCriteria: {
                    expectedCSS: "font-size: 20px;",
                  },
                },
              ],
              next_lesson_id: null,
            },
          ],
        },
      ],
    },
  },
  beginnerDetailed as Curriculum,
  htmlcssJavascriptCurriculum as Curriculum,
  intermediateDetailed as Curriculum,
  professionalDetailed as Curriculum,
  pythonBeginner as Curriculum,
  pythonIntermediate as Curriculum,
  pythonAdvance as Curriculum,
  cssFlexGridLessons as Curriculum,
];

// Legacy export for backward compatibility (uses first curriculum)
export const curriculumData = curriculaData[0];
