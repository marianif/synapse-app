import { useEventListener } from "expo";
import { useCallback, useEffect, useRef, useState } from "react";

import { SpeechRecognizerModule } from "@/modules/speech-recognizer";
import type { TranscriptUpdateEvent } from "@/modules/speech-recognizer";

export type UseSpeechRecognizerOptions = {
  autoStart?: boolean;
};

export type UseSpeechRecognizerReturn = {
  isRecording: boolean;
  transcript: string;
  permissionsGranted: boolean | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  toggleRecording: () => Promise<void>;
};

export function useSpeechRecognizer(
  options: UseSpeechRecognizerOptions = {}
): UseSpeechRecognizerReturn {
  const { autoStart = false } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Whether the user *intends* to be recording. iOS auto-finalizes after a
  // brief silence, so a session can end within a second of landing if the user
  // hasn't started speaking yet. We keep this intent flag to auto-restart the
  // recognizer through that initial silence (see the event listener below).
  const wantsRecording = useRef(false);
  // Whether the current session has captured any speech. We only auto-restart
  // empty silent timeouts — once there are words, an empty final is intentional.
  const hasTranscript = useRef(false);
  // Pending auto-restart timer, so we can cancel it on unmount / manual stop.
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const result = await SpeechRecognizerModule.requestPermissions();
    const granted = result.speech && result.microphone;
    setPermissionsGranted(granted);
    return granted;
  }, []);

  // Low-level start: spins up native recognition and flips UI state. Does NOT
  // reset the transcript, so it can be reused to silently restart a session
  // that iOS auto-finalized during the opening silence.
  const beginRecognition = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await SpeechRecognizerModule.startRecognition();
      setIsRecording(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      console.error("[SpeechRecognizer] startRecognition failed:", message);
    }
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    if (!permissionsGranted) {
      const granted = await requestPermissions();
      if (!granted) return;
    }
    wantsRecording.current = true;
    hasTranscript.current = false;
    setTranscript("");
    await beginRecognition();
  }, [permissionsGranted, requestPermissions, beginRecognition]);

  const stopRecording = useCallback(async (): Promise<void> => {
    wantsRecording.current = false;
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
    await SpeechRecognizerModule.stopRecognition();
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(async (): Promise<void> => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    if (autoStart) {
      requestPermissions().then((granted) => {
        if (granted) {
          startRecording();
        }
      });
    }
  }, [autoStart, requestPermissions, startRecording]);

  useEffect(() => {
    return () => {
      wantsRecording.current = false;
      if (restartTimer.current) {
        clearTimeout(restartTimer.current);
        restartTimer.current = null;
      }
      SpeechRecognizerModule.stopRecognition();
    };
  }, []);

  useEventListener(
    SpeechRecognizerModule,
    "onTranscriptUpdate",
    (event: TranscriptUpdateEvent) => {
      if (event.error) {
        setError(event.error);
      }
      // Stopping recognition can deliver a final, empty-string event (the task
      // is cancelled before it finalizes). Never let that clobber a transcript
      // the user already dictated — only overwrite with non-empty text.
      if (event.transcript) {
        hasTranscript.current = true;
        setTranscript(event.transcript);
      }
      if (event.isFinal) {
        // iOS auto-finalizes after a brief silence. If that happens before the
        // user has said anything but they still intend to record (e.g. they
        // just landed on the screen), restart the session after a short delay
        // so the mic stays open instead of dying within a second.
        if (wantsRecording.current && !hasTranscript.current && !event.error) {
          restartTimer.current = setTimeout(() => {
            restartTimer.current = null;
            if (wantsRecording.current) {
              beginRecognition();
            }
          }, 400);
          return;
        }
        setIsRecording(false);
      }
    }
  );

  return {
    isRecording,
    transcript,
    permissionsGranted,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
