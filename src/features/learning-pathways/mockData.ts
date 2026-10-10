/**
 * Mock pathway content. Replace with API data once the backend exposes
 * pathways — the UI only depends on the shapes in `./types`.
 */
import type {
  PathNode,
  PathNodeType,
  PathUnit,
  Pathway,
  UnitPalette,
} from "./types";

/** Brand-derived palettes: plum (#AA468E) and blue (#0063F7), plus two blends between them. */
export const PALETTES = {
  plum: { base: "#AA468E", shade: "#7E2F68", soft: "#F8EAF3", accent: "#DDA5D2" },
  iris: { base: "#6A55D8", shade: "#4A38AE", soft: "#F3ECFE", accent: "#B9A9F7" },
  royal: { base: "#0063F7", shade: "#0047B3", soft: "#E6F0FF", accent: "#7DB0FF" },
  rose: { base: "#C2569F", shade: "#943C78", soft: "#FBEAF4", accent: "#EFB3DA" },
} satisfies Record<string, UnitPalette>;

type NodeSpec = [type: PathNodeType, title: string, description: string];

const MINUTES: Record<PathNodeType, number> = {
  lesson: 5,
  practice: 6,
  story: 4,
  build: 15,
  chest: 1,
  checkpoint: 12,
};

function unit(
  id: string,
  title: string,
  description: string,
  palette: UnitPalette,
  guide: string[],
  specs: NodeSpec[],
): PathUnit {
  const nodes: PathNode[] = specs.map(([type, nodeTitle, nodeDescription], i) => ({
    id: `${id}-${i + 1}`,
    type,
    title: nodeTitle,
    description: nodeDescription,
    minutes: MINUTES[type],
  }));
  return { id, title, description, palette, guide, nodes };
}

export const MOCK_PATHWAYS: Pathway[] = [
  {
    id: "python",
    title: "Python Explorer",
    tagline: "Write your first programs and make the computer do your bidding.",
    language: "Python",
    level: "Beginner",
    icon: "python",
    palette: PALETTES.plum,
    units: [
      unit(
        "py-u1",
        "Hello, Python",
        "Print messages, store values and meet your first bugs.",
        PALETTES.plum,
        ["print() shows text on screen", "Variables are labelled boxes", "Strings live inside quotes"],
        [
          ["lesson", "Say hello", "Use print() to make Python talk back."],
          ["lesson", "Boxes called variables", "Store names, ages and scores."],
          ["story", "The talking robot", "Help Robo greet the class using strings."],
          ["practice", "Fix the typos", "Spot and squash five tiny bugs."],
          ["chest", "Treasure chest", "Open a surprise!"],
          ["lesson", "Doing maths", "Add, subtract and multiply like a calculator."],
          ["checkpoint", "Unit 1 checkpoint", "Show what you've learned to unlock Unit 2."],
        ],
      ),
      unit(
        "py-u2",
        "Making decisions",
        "Teach your code to choose with if, elif and else.",
        PALETTES.iris,
        ["Comparisons give True or False", "if runs code only when True", "elif and else handle other cases"],
        [
          ["lesson", "True or false?", "Compare numbers with ==, < and >."],
          ["lesson", "If this, then that", "Run code only when a condition is met."],
          ["practice", "Grade calculator", "Turn scores into A, B or C."],
          ["story", "The secret door", "Guess the password to open the vault."],
          ["chest", "Treasure chest", "Open a surprise!"],
          ["build", "Build: Rock, paper, scissors", "Code a game you can play against the computer."],
          ["checkpoint", "Unit 2 checkpoint", "Prove your decision-making skills."],
        ],
      ),
      unit(
        "py-u3",
        "Loops & patterns",
        "Repeat without retyping and draw art with turtle.",
        PALETTES.royal,
        ["for loops repeat a set number of times", "while loops repeat until something changes", "range() makes counting easy"],
        [
          ["lesson", "Repeat after me", "Your first for loop."],
          ["lesson", "Counting with range", "Count up, down and in steps."],
          ["build", "Build: Turtle spiral", "Draw a colourful spiral with a loop."],
          ["practice", "Loop puzzles", "Predict what each loop prints."],
          ["chest", "Treasure chest", "Open a surprise!"],
          ["lesson", "While loops", "Keep going until the player says stop."],
          ["checkpoint", "Unit 3 checkpoint", "Master loops to move on."],
        ],
      ),
      unit(
        "py-u4",
        "Functions",
        "Package code into reusable superpowers.",
        PALETTES.rose,
        ["def creates a function", "Parameters pass information in", "return sends a result back"],
        [
          ["lesson", "Your first function", "Name a block of code and reuse it."],
          ["lesson", "Inputs and outputs", "Use parameters and return values."],
          ["story", "The pizza factory", "Write functions that bake custom pizzas."],
          ["practice", "Function workout", "Five quick function challenges."],
          ["build", "Build: Quiz game", "Combine everything into a quiz app."],
          ["checkpoint", "Python Explorer final", "Earn your Python Explorer badge!"],
        ],
      ),
    ],
  },
  {
    id: "web",
    title: "Web Creator",
    tagline: "Design and launch your own website with HTML, CSS and JavaScript.",
    language: "HTML · CSS · JS",
    level: "Beginner",
    icon: "web",
    palette: PALETTES.royal,
    units: [
      unit(
        "web-u1",
        "Your first webpage",
        "Headings, paragraphs, images and links.",
        PALETTES.royal,
        ["Tags wrap content like <h1>…</h1>", "Images need a src and alt text", "Links use <a href>"],
        [
          ["lesson", "What is HTML?", "Meet tags, the building blocks of the web."],
          ["lesson", "Headings & paragraphs", "Structure a page about yourself."],
          ["practice", "Tag detective", "Find the missing closing tags."],
          ["chest", "Treasure chest", "Open a surprise!"],
          ["build", "Build: All about me", "Publish a page with a photo and links."],
          ["checkpoint", "Unit 1 checkpoint", "Show off your HTML skills."],
        ],
      ),
      unit(
        "web-u2",
        "Style with CSS",
        "Colours, fonts and layouts that pop.",
        PALETTES.rose,
        ["Selectors pick what to style", "The box model: margin, border, padding", "Flexbox lines things up"],
        [
          ["lesson", "Colour me in", "Change text and background colours."],
          ["lesson", "The box model", "Space things out with margin and padding."],
          ["story", "Fashion show", "Restyle a plain page into a runway look."],
          ["practice", "Flexbox frogs", "Line up the frogs with flexbox."],
          ["chest", "Treasure chest", "Open a surprise!"],
          ["checkpoint", "Unit 2 checkpoint", "Prove your styling skills."],
        ],
      ),
      unit(
        "web-u3",
        "Make it interactive",
        "Buttons that click back with JavaScript.",
        PALETTES.iris,
        ["Events react to clicks and keys", "The DOM lets JS change the page", "Variables remember state"],
        [
          ["lesson", "Hello, JavaScript", "Make your page respond to a click."],
          ["lesson", "Changing the page", "Update text and colours with code."],
          ["practice", "Event match-up", "Match events to what triggers them."],
          ["build", "Build: Click counter game", "How fast can you click?"],
          ["checkpoint", "Web Creator final", "Earn your Web Creator badge!"],
        ],
      ),
    ],
  },
  {
    id: "game",
    title: "Game Maker",
    tagline: "Bring characters to life and build games your friends can play.",
    language: "JavaScript",
    level: "Intermediate",
    icon: "game",
    palette: PALETTES.rose,
    units: [
      unit(
        "game-u1",
        "Game loops",
        "How every game redraws itself many times a second.",
        PALETTES.rose,
        ["A game loop updates then draws", "Frames per second control smoothness", "The canvas is your drawing board"],
        [
          ["lesson", "Inside a game loop", "Update, draw, repeat."],
          ["lesson", "Drawing on canvas", "Paint shapes and colours."],
          ["practice", "Frame by frame", "Predict where the ball moves next."],
          ["chest", "Treasure chest", "Open a surprise!"],
          ["build", "Build: Bouncing ball", "Make a ball bounce off the walls."],
          ["checkpoint", "Unit 1 checkpoint", "Show you understand the loop."],
        ],
      ),
      unit(
        "game-u2",
        "Heroes & controls",
        "Move a character with the keyboard.",
        PALETTES.plum,
        ["Key events capture input", "Velocity moves sprites smoothly", "Collision boxes detect hits"],
        [
          ["lesson", "Keyboard controls", "Move with arrow keys."],
          ["lesson", "Collisions", "Detect when two things touch."],
          ["story", "The coin collector", "Help Pip grab every coin."],
          ["build", "Build: Dodge the meteors", "Survive as long as you can."],
          ["checkpoint", "Game Maker final", "Earn your Game Maker badge!"],
        ],
      ),
    ],
  },
  {
    id: "ai",
    title: "AI Explorer",
    tagline: "Discover how computers learn — and teach one yourself.",
    language: "No code needed",
    level: "Beginner",
    icon: "ai",
    palette: PALETTES.iris,
    units: [
      unit(
        "ai-u1",
        "What is AI?",
        "Spot AI around you and how it makes guesses.",
        PALETTES.iris,
        ["AI learns patterns from examples", "More good data means better guesses", "AI can make mistakes too"],
        [
          ["lesson", "AI all around us", "Find AI in apps you already use."],
          ["story", "The sorting robot", "Help a robot learn cats from dogs."],
          ["practice", "Human or AI?", "Can you tell who made it?"],
          ["chest", "Treasure chest", "Open a surprise!"],
          ["build", "Build: Train an image sorter", "Teach a model with your own pictures."],
          ["checkpoint", "AI Explorer final", "Earn your AI Explorer badge!"],
        ],
      ),
    ],
  },
];

/** Node ids already completed when the mock store is first created. */
export const MOCK_INITIAL_COMPLETED: Record<string, Record<string, number>> = {
  python: {
    "py-u1-1": 3,
    "py-u1-2": 3,
    "py-u1-3": 2,
    "py-u1-4": 3,
    "py-u1-5": 3,
    "py-u1-6": 2,
    "py-u1-7": 3,
    "py-u2-1": 3,
    "py-u2-2": 2,
  },
  web: { "web-u1-1": 3, "web-u1-2": 2 },
};
