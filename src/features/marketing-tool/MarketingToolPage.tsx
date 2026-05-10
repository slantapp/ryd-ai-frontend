import { useState, useCallback, useEffect } from "react";
import {
  Play,
  Square,
  RotateCcw,
  Video,
  ArrowLeft,
  Circle,
  Download,
  Trash2,
  AlertCircle,
  Maximize2,
  X,
} from "lucide-react";
import {
  useMarketingAvatar,
  TextInput,
  InstructorSelector,
  useAvatarRecorder,
} from "./components";

export function MarketingToolPage() {
  const [scriptText, setScriptText] = useState("");
  const [hasSpoken, setHasSpoken] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    AvatarComponent,
    speak,
    stop,
    isSpeaking,
    currentSubtitle,
    selectedInstructor,
    setSelectedInstructor,
  } = useMarketingAvatar();

  const {
    isRecording,
    recordedBlob,
    error: recordingError,
    startRecording,
    stopRecording,
    downloadRecording,
    clearRecording,
  } = useAvatarRecorder();

  const handleSpeak = useCallback(() => {
    if (!scriptText.trim()) return;
    speak(scriptText.trim());
    setHasSpoken(true);
  }, [scriptText, speak]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleReset = useCallback(() => {
    stop();
    setScriptText("");
    setHasSpoken(false);
  }, [stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const canSpeak = scriptText.trim().length > 0 && !isSpeaking;

  const handleStartRecording = useCallback(async () => {
    await startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleDownload = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
    downloadRecording(`avatar-video-${timestamp}.webm`);
  }, [downloadRecording]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isFullscreen]);

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isRecording && (
              <span className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white">
                <Circle className="h-2 w-2 fill-current animate-pulse" />
                REC
              </span>
            )}
            {isSpeaking && (
              <span className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                Speaking...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isRecording && !recordedBlob && (
              <button
                type="button"
                onClick={handleStartRecording}
                className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-600"
              >
                <Circle className="h-4 w-4 fill-current" />
                Record
              </button>
            )}

            {isRecording && (
              <button
                type="button"
                onClick={handleStopRecording}
                className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700"
              >
                <Square className="h-4 w-4 fill-current" />
                Stop
              </button>
            )}

            {recordedBlob && !isRecording && (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:bg-green-600"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={clearRecording}
                  className="flex items-center gap-2 rounded-full bg-gray-700 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:bg-gray-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center justify-center rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-all hover:bg-white/20"
              title="Exit fullscreen (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="relative w-full max-w-5xl aspect-[16/9]">
            <AvatarComponent className="h-full w-full rounded-2xl" />
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleSpeak}
            disabled={!canSpeak}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Speak
          </button>

          {isSpeaking && (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <Square className="h-4 w-4" />
              Stop Speaking
            </button>
          )}
        </div>

        {currentSubtitle && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 max-w-2xl">
            <div className="rounded-xl bg-black/70 px-6 py-3 text-center text-white backdrop-blur-sm">
              <p className="text-lg">{currentSubtitle}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 -m-4">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back</span>
            </a>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold text-gray-900">
                Marketing Video Tool
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isRecording && (
              <span className="flex items-center gap-2 text-sm text-red-600">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                Recording...
              </span>
            )}
            {isSpeaking && (
              <span className="flex items-center gap-2 text-sm text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Speaking...
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Configure Your Video
              </h2>

              <div className="space-y-6">
                <InstructorSelector
                  selected={selectedInstructor}
                  onChange={setSelectedInstructor}
                  disabled={isSpeaking}
                />

                <TextInput
                  value={scriptText}
                  onChange={setScriptText}
                  disabled={isSpeaking}
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSpeak}
                    disabled={!canSpeak}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    <span>Speak</span>
                  </button>

                  {isSpeaking && (
                    <button
                      type="button"
                      onClick={handleStop}
                      className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-3 text-sm font-semibold text-red-600 shadow-sm transition-all hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    >
                      <Square className="h-4 w-4" />
                      <span>Stop</span>
                    </button>
                  )}

                  {hasSpoken && !isSpeaking && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <h3 className="mb-2 text-sm font-medium text-primary">
                How to Record
              </h3>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>
                  Click the <strong>maximize button</strong> (top-right of avatar) for
                  fullscreen recording mode
                </li>
                <li>Click <strong>"Record"</strong> in fullscreen mode</li>
                <li>Select <strong>"This Tab"</strong> in the browser dialog</li>
                <li>
                  <strong>Important:</strong> Check <strong>"Share tab audio"</strong> to
                  capture the avatar's voice
                </li>
                <li>Click <strong>"Share"</strong> to begin recording</li>
                <li>Use the <strong>"Speak"</strong> button to make the avatar talk</li>
                <li>Click <strong>"Stop"</strong> when done, then download</li>
              </ol>
              <p className="text-xs text-gray-500 mt-3">
                Tip: Use fullscreen mode for the cleanest recordings — only the avatar
                will be visible!
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={`relative aspect-[4/3] overflow-hidden rounded-2xl border-2 ${isRecording ? "border-red-500" : "border-gray-200"
                } bg-linear-to-b from-gray-100 to-gray-200 shadow-lg transition-colors`}
            >
              <AvatarComponent className="h-full w-full" />
              {isRecording && (
                <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white">
                  <Circle className="h-2 w-2 fill-current animate-pulse" />
                  REC
                </div>
              )}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="absolute top-3 right-3 flex items-center justify-center rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/70"
                title="Maximize for recording"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-3">
              {!isRecording && !recordedBlob && (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 shadow-sm transition-all hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                >
                  <Circle className="h-4 w-4 fill-current" />
                  <span>Start Recording</span>
                </button>
              )}

              {isRecording && (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span>Stop Recording</span>
                </button>
              )}

              {recordedBlob && !isRecording && (
                <>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearRecording}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Discard</span>
                  </button>
                </>
              )}
            </div>

            {recordingError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{recordingError}</p>
              </div>
            )}

            {currentSubtitle && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-gray-500 mb-1">
                  Subtitles
                </p>
                <p className="text-gray-900">{currentSubtitle}</p>
              </div>
            )}

            {!currentSubtitle && scriptText.trim() && !isSpeaking && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-500 mb-1">
                  Preview
                </p>
                <p className="text-gray-600 line-clamp-3">{scriptText}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-8 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            AI Avatar Marketing Tool — Create engaging video content with
            AI-powered avatars
          </p>
        </div>
      </footer>
    </div>
  );
}
