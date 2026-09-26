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
const DEEPGRAM_DEMO_ENDPOINT = "/api/deepgram/v1/speak";

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

  const tryGesture = (name: AvatarGestureName) => {
    setGestureName(name);
    setCopied(false);
    if (!ready) return;
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
    <div className="min-h-screen bg-[#f8f7fc] px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primaryBlue">RYD Learning · Teacher tools</p>
            <h1 className="mt-2 font-solway text-3xl font-bold sm:text-4xl">Avatar gesture & voice playground</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Try the instructor’s actual gestures and English voice models before choosing what belongs in a curriculum.
              No account or curriculum code is required.
            </p>
          </div>
          <Link to="/" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-primaryBlue shadow-sm hover:border-primaryBlue">
            Back to RYD Learning
          </Link>
        </header>

        <main className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-label="Avatar preview">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-solway text-xl font-bold">Live instructor</h2>
                <p className="text-xs text-slate-500">Half-body framing; gestures use the same package as the learning environment.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {ready ? "Ready" : "Loading avatar…"}
              </span>
            </div>
            <div className="relative h-[360px] min-h-0 bg-gradient-to-b from-[#f3efff] to-[#ece9f7] sm:h-[480px]">
              <NarratorAvatar
                key={instructor}
                ref={avatarRef}
                avatarMode="full"
                lazyMount={false}
                avatarUrl={instructorConfig.avatarUrl}
                avatarBody={instructorConfig.avatarBody}
                cameraView="mid"
                cameraDistance={-1.55}
                cameraY={-0.32}
                visualQuality="auto"
                ttsService="deepgram"
                ttsVoice={voiceModel}
                ttsApiKey={DEMO_KEY || undefined}
                deepgramEndpoint={DEEPGRAM_DEMO_ENDPOINT}
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
              {!ready && (
                <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading the selected avatar model
                </div>
              )}
            </div>
            <div className="min-h-16 border-t border-slate-100 px-5 py-4 text-sm text-slate-700" aria-live="polite">
              {subtitle || (speaking ? "Speaking…" : "Select a gesture below, or choose a voice and press Speak.")}
            </div>
          </section>

          <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Demo controls">
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
                rows={5} className="w-full resize-y rounded-xl border border-slate-300 px-3 py-3 text-sm leading-6 focus:border-primaryBlue focus:outline-none" />
              <p className="mt-1 text-right text-xs text-slate-500">{script.length}/{MAX_SCRIPT_LENGTH} characters</p>
            </div>

            {!DEMO_KEY && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900" role="status">
                Voice previews are unavailable until the demo’s <code>VITE_DEEPGRAM_API_KEY</code> is configured. Gesture previews still work.
              </p>
            )}
            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700" role="alert">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!ready || !DEMO_KEY || !script.trim() || speechPending || speaking} onClick={speakPreview}
                className="inline-flex items-center gap-2 rounded-xl bg-primaryBlue px-4 py-3 text-sm font-semibold text-white hover:bg-[#023b84] disabled:cursor-not-allowed disabled:opacity-50">
                <Volume2 className="h-4 w-4" /> {speechPending ? "Preparing…" : "Speak + gesture"}
              </button>
              <button type="button" disabled={!ready} onClick={() => tryGesture(gestureName)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
                <Hand className="h-4 w-4" /> Gesture only
              </button>
              <button type="button" disabled={!speechPending && !speaking} onClick={stopSpeech}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
                <Square className="h-4 w-4" /> Stop
              </button>
            </div>
            <p className="text-xs leading-5 text-slate-500">Voice previews use the temporary browser-side demo key. Keep the script short; this page is not a production TTS proxy.</p>
          </section>

          <section className="lg:col-span-2" aria-label="Gesture catalog">
            <div className="mb-4">
              <h2 className="font-solway text-2xl font-bold">Explore all 33 gestures</h2>
              <p className="mt-1 text-sm text-slate-600">Tap any card to see it on the avatar. The descriptions explain what the current rig-safe animation actually does.</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                {GESTURE_GROUPS.map((group) => (
                  <div key={group.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="font-solway text-lg font-bold">{group.label}</h3>
                    <p className="mb-3 text-xs text-slate-500">{group.description}</p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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

              <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-5">
                <p className="text-xs font-bold uppercase tracking-wider text-primaryBlue">Selected gesture</p>
                <h3 className="mt-2 font-solway text-xl font-bold">{gesture.label}</h3>
                <code className="mt-1 block text-xs text-primaryBlue">{gestureName}</code>
                <p className="mt-4 text-sm leading-6 text-slate-700">{gesture.motion}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600"><strong>Use it for:</strong> {gesture.useWhen}</p>
                <div className="mt-5 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold">Curriculum JSON</h4>
                  <button type="button" onClick={() => void copyJson()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-slate-50">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-100">{jsonSnippet}</pre>
                <p className="mt-3 text-xs leading-5 text-slate-500">Place <code>gesture</code> inside a v2 beat’s <code>avatar</code>. Question beats can also set <code>gesture_on_correct</code> and <code>gesture_on_wrong</code>.</p>
              </aside>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
