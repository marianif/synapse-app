import type { PermissionsResult, TranscriptUpdateEvent } from './SpeechRecognizerModule';

// Web stub — SFSpeechRecognizer is iOS-only.
export default {
  addListener(_eventName: string, _listener: (event: TranscriptUpdateEvent) => void) {
    return { remove: () => {} };
  },
  removeListener() {},
  async requestPermissions(): Promise<PermissionsResult> {
    return { speech: false, microphone: false };
  },
  async startRecognition(): Promise<void> {},
  async stopRecognition(): Promise<void> {},
};
