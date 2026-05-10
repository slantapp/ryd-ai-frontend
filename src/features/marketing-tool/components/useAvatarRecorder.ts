import { useRef, useState, useCallback } from "react";

export type RecordingStatus = "idle" | "recording" | "stopping" | "processing";

interface UseAvatarRecorderOptions {
  onRecordingStart?: () => void;
  onRecordingStop?: (blob: Blob) => void;
  onError?: (error: Error) => void;
}

export function useAvatarRecorder(options: UseAvatarRecorderOptions = {}) {
  const { onRecordingStart, onRecordingStop, onError } = options;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordedBlob(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
          frameRate: 60,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
        preferCurrentTab: true,
      } as DisplayMediaStreamOptions);

      mediaStreamRef.current = stream;

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn(
          "No audio track captured. Make sure to select 'Share tab audio' when prompted."
        );
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 12000000,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setStatus("processing");

        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        onRecordingStop?.(blob);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        setStatus("idle");
      };

      mediaRecorder.onerror = (event) => {
        const errorMessage =
          event instanceof ErrorEvent ? event.message : "Recording error occurred";
        setError(errorMessage);
        onError?.(new Error(errorMessage));
        setStatus("idle");
      };

      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      };

      mediaRecorder.start(1000);
      setStatus("recording");
      onRecordingStart?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(errorMessage);
      onError?.(new Error(errorMessage));
      setStatus("idle");
    }
  }, [onRecordingStart, onRecordingStop, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      setStatus("stopping");
      mediaRecorderRef.current.stop();
    }
  }, []);

  const downloadRecording = useCallback(
    (filename = "avatar-recording.webm") => {
      if (!recordedBlob) return;

      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [recordedBlob]
  );

  const clearRecording = useCallback(() => {
    setRecordedBlob(null);
    setError(null);
    chunksRef.current = [];
  }, []);

  return {
    status,
    isRecording: status === "recording",
    recordedBlob,
    error,
    startRecording,
    stopRecording,
    downloadRecording,
    clearRecording,
  };
}
