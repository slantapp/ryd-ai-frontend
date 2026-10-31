import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import NarratorAvatar, { type NarratorAvatarRef } from "@thattobi/narrator-avatar";
import { Check, Clipboard, Hand, Loader2, Play, Square, Volume2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { INSTRUCTORS, type InstructorType } from "@/stores/instructorStore";
import {
  normalizeAvatarGesture,
  playAvatarGesture,
  type AvatarGestureName,
} from "@/features/curriculum-preview/v2/avatarGesture";
import { GESTURE_DETAILS, GESTURE_GROUPS, VOICE_OPTIONS } from "./catalog";

const DEFAULT_SCRIPT =
  "Welcome to today's lesson! Let's look at one useful idea together. What do you think happens next?";
const MAX_SCRIPT_LENGTH = 320;
const DEMO_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY?.trim() ?? "";
/** Clears "Preparing…" if the avatar never reports speech start or an error. */
const SPEECH_START_TIMEOUT_MS = 15_000;
/** Anchor the teacher app deep-links to (`/teacher-playground#gestures`). */
const GESTURE_CATALOG_ID = "gestures";

export default function TeacherPlaygroundPage() {
  const avatarRef = useRef<NarratorAvatarRef | null>(null);
  const [instructor, setInstructor] = useState<InstructorType>("woman");
  const [voiceModel, setVoiceModel] = useState<string>("aura-2-aurora-en");
  const [gestureName, setGestureName] = useState<AvatarGestureName>("welcomeSequence");
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [ready, setReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechPending, setSpeechPending] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const instructorConfig = INSTRUCTORS[instructor];
  const voice = VOICE_OPTIONS.find((option) => option.model === voiceModel);
  const gesture = GESTURE_DETAILS[gestureName];
  const jsonSnippet = useMemo(
    () => JSON.stringify({ avatar: { text: script.trim() || DEFAULT_SCRIPT, gesture: gestureName } }, null, 2),
    [gestureName, script],
  );

  useEffect(() => () => avatarRef.current?.stopSpeaking(), []);

  useEffect(() => {
    if (!speechPending) return;
    const timer = window.setTimeout(() => {
      avatarRef.current?.stopSpeaking();
      setSpeechPending(false);
      setSpeaking(false);
      setError("The voice preview did not start. Check your connection and the Deepgram key, then try again.");
    }, SPEECH_START_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [speechPending]);

  // The teacher app links here with #gestures; the SPA renders after the browser's own
  // anchor jump, so scroll to the catalog once it exists.
  useEffect(() => {
    if (window.location.hash !== `#${GESTURE_CATALOG_ID}`) return;
    document.getElementById(GESTURE_CATALOG_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const selectInstructor = (next: InstructorType) => {
    avatarRef.current?.stopSpeaking();
    setInstructor(next);
    setVoiceModel(next === "woman" ? "aura-2-aurora-en" : "aura-2-mars-en");
    setReady(false);
    setSpeaking(false);
    setSpeechPending(false);
    setSubtitle("");
    setError("");
  };

  /** Same unlock the lesson player does inside the tap (WebKit autoplay policy). */
  const unlockAudio = () => {
    void (avatarRef.current as { resumeAudioContext?: () => Promise<void> } | null)
      ?.resumeAudioContext?.()
      ?.catch(() => {
        // Stays suspended until speakText on some WebKit builds.
      });
  };

  const tryGesture = (name: AvatarGestureName) => {
    setGestureName(name);
    setCopied(false);
    if (!ready) return;
    unlockAudio();
    playAvatarGesture(avatarRef.current, normalizeAvatarGesture(name));
  };

  const stopSpeech = () => {
    avatarRef.current?.stopSpeaking();
    setSpeaking(false);
    setSpeechPending(false);
    setSubtitle("");
  };

  const speakPreview = () => {
    const text = script.trim();
    if (!ready || !DEMO_KEY || !text || speechPending || speaking) return;
    setError("");
    setSubtitle("");
    setSpeechPending(true);
    unlockAudio();
    try {
      playAvatarGesture(avatarRef.current, normalizeAvatarGesture(gestureName));
      avatarRef.current?.speakText(text, { ttsVoice: voiceModel });
    } catch (cause) {
      setSpeechPending(false);
      setError(cause instanceof Error ? cause.message : "Voice preview could not start.");
    }
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonSnippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Copy was blocked by your browser. You can select the JSON below manually.");
    }
  };

  return (
    <div className="min-h-dvh bg-[#f8f7fc] text-slate-900 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primaryBlue">RYD Learning · Teacher tools</p>
          <h1 className="mt-1 font-solway text-2xl font-bold sm:text-3xl">Avatar gesture & voice playground</h1>
        </div>
        <Link to="/" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-primaryBlue shadow-sm hover:border-primaryBlue">
          Back to RYD Learning
        </Link>
      </header>

      <main className="flex flex-col gap-4 px-4 pb-6 sm:px-6 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] lg:gap-6 lg:px-8">
        {/* Pinned: sticky on phones, full column height on large screens, so gestures stay in view. */}
        <section
          className="sticky top-0 z-20 -mx-4 flex flex-col overflow-hidden border-b border-slate-200 bg-white shadow-sm sm:-mx-6 lg:static lg:mx-0 lg:min-h-0 lg:rounded-3xl lg:border"
          aria-label="Avatar preview"
        >
          <div className="relative h-[36vh] min-h-0 overflow-hidden bg-gradient-to-b from-[#f3efff] to-[#ece9f7] lg:h-auto lg:flex-1">
            <NarratorAvatar
              key={instructor}
              ref={avatarRef}
              // Auto mode is voice-only on phones with Deepgram; this page exists to show gestures.
              avatarMode="full"
              lazyMount={false}
              avatarUrl={instructorConfig.avatarUrl}
              avatarBody={instructorConfig.avatarBody}
              cameraView="mid"
              cameraDistance={-1.55}
              cameraY={-0.32}
              visualQuality="auto"
              ttsService="deepgram"
              // Keep the base voice stable; Speak auditions another model per request.
              ttsVoice={instructorConfig.ttsVoice}
              // Calls Deepgram directly, like the lesson avatar. The same-origin proxy exists only in dev and on Vercel.
              ttsApiKey={DEMO_KEY || undefined}
              accurateLipSync
              audioDrivenLipSync
              speechRate={0.9}
              speechGestures={false}
              onReady={() => { setReady(true); setError(""); }}
              onError={(cause) => { setError(cause.message || "Avatar preview failed."); setSpeechPending(false); setSpeaking(false); }}
              onSpeechStart={() => { setSpeechPending(false); setSpeaking(true); }}
              onSpeechEnd={() => { setSpeechPending(false); setSpeaking(false); }}
              onSubtitle={setSubtitle}
              className="h-full w-full"
            />
            <span className={`pointer-events-none absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {ready ? "Ready" : "Loading avatar…"}
            </span>
            <span className="pointer-events-none absolute top-3 left-3 max-w-[60%] truncate rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primaryBlue shadow-sm">
              {gesture.label}
            </span>
            {!ready && (
              <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading the selected avatar model
              </div>
            )}
          </div>
          <div className="relative z-10 space-y-2 border-t border-slate-100 bg-white px-4 py-3 lg:px-5 lg:py-4">
            <p className="line-clamp-2 min-h-5 text-sm text-slate-700 lg:min-h-10" aria-live="polite">
              {subtitle || (speaking ? "Speaking…" : "Pick a gesture, or choose a voice and press Speak.")}
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button type="button" disabled={!ready || !DEMO_KEY || !script.trim() || speechPending || speaking} onClick={speakPreview}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-primaryBlue px-2 py-2 text-xs sm:gap-2 font-semibold sm:px-3 sm:text-sm text-white hover:bg-[#023b84] disabled:cursor-not-allowed disabled:opacity-50 lg:px-4 lg:py-3">
                {speechPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />} {speechPending ? "Preparing…" : "Speak + gesture"}
              </button>
              <button type="button" disabled={!ready} onClick={() => tryGesture(gestureName)}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs sm:gap-2 font-semibold sm:px-3 sm:text-sm hover:bg-slate-50 disabled:opacity-50 lg:px-4 lg:py-3">
                <Hand className="h-4 w-4" /> Gesture only
              </button>
              <button type="button" disabled={!speechPending && !speaking} onClick={stopSpeech}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs sm:gap-2 font-semibold sm:px-3 sm:text-sm hover:bg-slate-50 disabled:opacity-50 lg:px-4 lg:py-3">
                <Square className="h-4 w-4" /> Stop
              </button>
            </div>
          </div>
        </section>

        {/* Scrolls on its own on large screens; on phones it scrolls under the pinned avatar. */}
        <section className="space-y-5 lg:min-h-0 lg:overflow-y-auto lg:pr-1 lg:pb-2" aria-label="Demo controls">
          <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="font-solway text-xl font-bold">Set up the preview</h2>
              <p className="mt-1 text-sm text-slate-600">Avatar and voice are independent—compare different voices on either model.</p>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Avatar</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["woman", "man"] as const).map((option) => (
                  <button key={option} type="button" aria-pressed={instructor === option} onClick={() => selectInstructor(option)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${instructor === option ? "border-primaryBlue bg-blue-50 text-primaryBlue" : "border-slate-200 hover:border-slate-400"}`}>
                    {option === "woman" ? "Female instructor" : "Male instructor"}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <Label htmlFor="teacher-demo-voice" className="mb-2 font-semibold">Deepgram voice</Label>
              <Select value={voiceModel} onValueChange={(value) => { stopSpeech(); setVoiceModel(value); }}>
                <SelectTrigger id="teacher-demo-voice" className="h-11 rounded-xl border-slate-300 shadow-none">
                  <SelectValue placeholder="Choose a voice" />
                </SelectTrigger>
                <SelectContent>
                  {["Women", "Men"].map((group) => (
                    <SelectGroup key={group}>
                      <SelectLabel>{group}'s voices</SelectLabel>
                      {VOICE_OPTIONS.filter((option) => option.group === group).map((option) => (
                        <SelectItem key={option.model} value={option.model}>{option.name} · {option.accent}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {voice && <p className="mt-2 text-xs text-slate-600">{voice.character} · <code className="break-all">{voice.model}</code></p>}
            </div>

            <div>
              <Label htmlFor="teacher-demo-script" className="mb-2 font-semibold">Short test script</Label>
              <Textarea id="teacher-demo-script" value={script} maxLength={MAX_SCRIPT_LENGTH} onChange={(event) => setScript(event.target.value)}
                rows={4} className="w-full resize-y rounded-xl border border-slate-300 px-3 py-3 text-sm leading-6 focus:border-primaryBlue focus:outline-none" />
              <p className="mt-1 text-right text-xs text-slate-500">{script.length}/{MAX_SCRIPT_LENGTH} characters</p>
            </div>

            {!DEMO_KEY && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900" role="status">
                Voice previews are unavailable until the demo’s <code>VITE_DEEPGRAM_API_KEY</code> is configured. Gesture previews still work.
              </p>
            )}
            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700" role="alert">{error}</p>}
            <p className="text-xs leading-5 text-slate-500">Voice previews use the temporary browser-side demo key. Keep the script short; this page is not a production TTS proxy.</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-primaryBlue">Selected gesture</p>
            <h3 className="mt-2 font-solway text-xl font-bold">{gesture.label}</h3>
            <code className="mt-1 block text-xs text-primaryBlue">{gestureName}</code>
            <p className="mt-3 text-sm leading-6 text-slate-700">{gesture.motion}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600"><strong>Use it for:</strong> {gesture.useWhen}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold">Curriculum JSON</h4>
              <button type="button" onClick={() => void copyJson()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-slate-50">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-100">{jsonSnippet}</pre>
            <p className="mt-3 text-xs leading-5 text-slate-500">Place <code>gesture</code> inside a v2 beat’s <code>avatar</code>. Question beats can also set <code>gesture_on_correct</code> and <code>gesture_on_wrong</code>.</p>
          </div>

          {/* Phones: offset the anchor jump by the pinned avatar so the heading isn't hidden under it. */}
          <div id={GESTURE_CATALOG_ID} className="scroll-mt-[calc(36vh+7rem)] space-y-4 lg:scroll-mt-0" aria-label="Gesture catalog">
            <div>
              <h2 className="font-solway text-2xl font-bold">Explore all 33 gestures</h2>
              <p className="mt-1 text-sm text-slate-600">Tap any card to see it on the avatar. The descriptions explain what the current rig-safe animation actually does.</p>
            </div>
            {GESTURE_GROUPS.map((group) => (
              <div key={group.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="font-solway text-lg font-bold">{group.label}</h3>
                <p className="mb-3 text-xs text-slate-500">{group.description}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.names.map((name) => {
                    const detail = GESTURE_DETAILS[name];
                    return (
                      <button key={name} type="button" aria-pressed={gestureName === name} onClick={() => tryGesture(name)}
                        className={`rounded-xl border p-3 text-left transition ${gestureName === name ? "border-primaryBlue bg-blue-50" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"}`}>
                        <span className="flex items-center justify-between gap-2 text-sm font-semibold"><span>{detail.label}</span><Play className="h-3.5 w-3.5 shrink-0" /></span>
                        <code className="mt-1 block text-[11px] text-primaryBlue">{name}</code>
                        <span className="mt-2 block text-xs leading-5 text-slate-600">{detail.motion}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
