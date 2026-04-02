import { NativeModule, requireNativeModule } from 'expo-modules-core';

export type TranscriptUpdateEvent = {
  transcript: string;
  isFinal: boolean;
  error?: string;
};

export type PermissionsResult = {
  speech: boolean;
  microphone: boolean;
};

type SpeechRecognizerModuleEvents = {
  onTranscriptUpdate: (event: TranscriptUpdateEvent) => void;
};

declare class SpeechRecognizerNativeModule extends NativeModule<SpeechRecognizerModuleEvents> {
  requestPermissions(): Promise<PermissionsResult>;
  startRecognition(): Promise<void>;
  stopRecognition(): Promise<void>;
}

export default requireNativeModule<SpeechRecognizerNativeModule>('SpeechRecognizer');
