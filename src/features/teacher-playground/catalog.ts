import type { AvatarGestureName } from "@/features/curriculum-preview/v2/avatarGesture";
import { AVATAR_HAND_GESTURE_NAMES, AVATAR_TEACHING_GESTURE_NAMES } from "@/features/curriculum-preview/v2/avatarGesture";

type GestureDetail = { label: string; motion: string; useWhen: string };

/** Descriptions match the rig-safe poses and sequences in narrator-avatar 1.1.10. */
export const GESTURE_DETAILS: Record<AvatarGestureName, GestureDetail> = {
  handup: { label: "Hand up", motion: "Raises one hand with an open palm.", useWhen: "Greeting or inviting attention." },
  index: { label: "Point", motion: "Raises an index finger to point out a detail.", useWhen: "Directing attention to one idea or step." },
  ok: { label: "OK", motion: "Makes an OK hand sign.", useWhen: "Acknowledging a correct step." },
  thumbup: { label: "Thumbs up", motion: "Shows a thumbs-up pose.", useWhen: "Positive feedback or encouragement." },
  thumbdown: { label: "Thumbs down", motion: "Shows a thumbs-down pose.", useWhen: "A clear negative cue; use sparingly with learners." },
  side: { label: "Present to side", motion: "Opens an arm to the side as if presenting something.", useWhen: "Introducing content on the lesson board." },
  shrug: { label: "Shrug", motion: "Lifts the shoulders and hands in a questioning pose.", useWhen: "Inviting a guess or showing uncertainty." },
  namaste: { label: "Hands together", motion: "Brings the hands together in a thankful pose.", useWhen: "Thanks or a respectful sign-off." },
  greet: { label: "Greet", motion: "Raises a hand, then opens to the side with a greeting cue.", useWhen: "Starting a lesson." },
  invite: { label: "Invite", motion: "Raises a hand and holds eye contact.", useWhen: "Asking learners to join in." },
  explain: { label: "Explain", motion: "Presents to the side, then points to a detail.", useWhen: "Walking through a concept." },
  count: { label: "Count", motion: "Points with one finger, then lifts a hand.", useWhen: "Numbered steps or examples." },
  emphasize: { label: "Emphasize", motion: "Points, then gives an OK sign.", useWhen: "Highlighting a key takeaway." },
  celebrate: { label: "Celebrate", motion: "Gives a thumbs-up with a happy expression.", useWhen: "Correct answers or milestones." },
  encourage: { label: "Encourage", motion: "Gives an OK sign with a friendly smile.", useWhen: "Reassuring a learner who is trying." },
  think: { label: "Think", motion: "Shrugs with a thoughtful facial cue.", useWhen: "Pausing for reflection or a question." },
  caution: { label: "Caution", motion: "Presents to the side with a concerned facial cue.", useWhen: "Flagging a common mistake." },
  thanks: { label: "Thanks", motion: "Brings hands together and smiles.", useWhen: "Thanking the class." },
  recap: { label: "Recap", motion: "Raises a hand, then gives a thumbs-up.", useWhen: "Reviewing what was learned." },
  transition: { label: "Transition", motion: "Opens an arm to the side with a light smile.", useWhen: "Moving to the next activity." },
  wave: { label: "Wave", motion: "Uses a raised-hand greeting pose with a cheerful face cue.", useWhen: "A friendly hello or goodbye." },
  bow: { label: "Respectful close", motion: "Uses the hands-together pose with a thankful face cue; it is not a full-body bow.", useWhen: "A polite close." },
  nod: { label: "Agree", motion: "Uses an OK hand sign with an affirmative face/head cue.", useWhen: "Confirming an answer." },
  disagree: { label: "Disagree", motion: "Opens an arm to the side with a negative face/head cue.", useWhen: "Gently correcting a misconception." },
  present: { label: "Present", motion: "Opens an arm to the side and directs attention outward.", useWhen: "Showing an example or board item." },
  whiteboard: { label: "Point to board", motion: "Points with an index finger and an attentive face cue.", useWhen: "Calling out a diagram or line of text." },
  welcomeSequence: { label: "Welcome sequence", motion: "Raises a hand, presents to the side, then gives an affirmative cue.", useWhen: "A complete lesson opening." },
  boardExplainSequence: { label: "Board explanation", motion: "Presents to the side, points to the board, then presents again.", useWhen: "Explaining something displayed on screen." },
  guidedQuestionSequence: { label: "Guided question", motion: "Raises a hand, presents the question, then gives an affirmative cue.", useWhen: "Asking learners to think and respond." },
  celebrateSequence: { label: "Celebration sequence", motion: "Gives a thumbs-up, an affirmative cue, then a raised-hand greeting.", useWhen: "Celebrating a correct answer or completion." },
  gentleCorrectionSequence: { label: "Gentle correction", motion: "Presents, gives a mild negative cue, then presents the next idea.", useWhen: "Feedback after a wrong answer." },
  recapSequence: { label: "Recap sequence", motion: "Points, points to the board, then gives an affirmative cue.", useWhen: "Summarizing several key points." },
  goodbyeSequence: { label: "Goodbye sequence", motion: "Raises a hand, repeats the greeting cue, then brings hands together.", useWhen: "Ending a lesson warmly." },
};

export const GESTURE_GROUPS = [
  { label: "Hand poses", description: "Single rig-safe poses", names: AVATAR_HAND_GESTURE_NAMES },
  { label: "Teaching beats", description: "Short teaching actions with eye or face cues", names: AVATAR_TEACHING_GESTURE_NAMES.slice(0, 12) },
  { label: "Reactions", description: "Quick responses to what the learner sees or says", names: AVATAR_TEACHING_GESTURE_NAMES.slice(12, 18) },
  { label: "Combined sequences", description: "Multi-step performances for a lesson moment", names: AVATAR_TEACHING_GESTURE_NAMES.slice(18) },
] as const;

export const VOICE_OPTIONS = [
  { group: "Women", name: "Aurora", model: "aura-2-aurora-en", character: "Cheerful, expressive, energetic", accent: "American" },
  { group: "Women", name: "Thalia", model: "aura-2-thalia-en", character: "Clear, confident, energetic", accent: "American" },
  { group: "Women", name: "Helena", model: "aura-2-helena-en", character: "Caring, natural, friendly", accent: "American" },
  { group: "Women", name: "Athena", model: "aura-2-athena-en", character: "Calm, smooth, professional", accent: "American" },
  { group: "Women", name: "Vesta", model: "aura-2-vesta-en", character: "Patient, empathetic, expressive", accent: "American" },
  { group: "Men", name: "Mars", model: "aura-2-mars-en", character: "Smooth, patient baritone", accent: "American" },
  { group: "Men", name: "Arcas", model: "aura-2-arcas-en", character: "Natural, smooth, clear", accent: "American" },
  { group: "Men", name: "Aries", model: "aura-2-aries-en", character: "Warm, energetic", accent: "American" },
  { group: "Men", name: "Hermes", model: "aura-2-hermes-en", character: "Expressive, engaging", accent: "American" },
  { group: "Men", name: "Draco", model: "aura-2-draco-en", character: "Warm, trustworthy baritone", accent: "British" },
] as const;
