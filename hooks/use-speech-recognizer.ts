import { useEventListener } from "expo";
import { useCallback, useEffect, useState } from "react";

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

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const result = await SpeechRecognizerModule.requestPermissions();
    const granted = result.speech && result.microphone;
    setPermissionsGranted(granted);
    return granted;
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    if (!permissionsGranted) {
      const granted = await requestPermissions();
      if (!granted) return;
    }
    setTranscript("");
    setError(null);
    try {
      await SpeechRecognizerModule.startRecognition();
      setIsRecording(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      console.error("[SpeechRecognizer] startRecognition failed:", message);
    }
  }, [permissionsGranted, requestPermissions]);

  const stopRecording = useCallback(async (): Promise<void> => {
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
      SpeechRecognizerModule.stopRecognition();
    };
  }, []);

  useEventListener(
    SpeechRecognizerModule,
    "onTranscriptUpdate",
    (event: TranscriptUpdateEvent) => {
      setTranscript(event.transcript);
      if (event.isFinal) {
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
