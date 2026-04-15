// Reexport the native module. On web, it will be resolved to SpeechRecognizerModule.web.ts
// and on native platforms to SpeechRecognizerModule.ts
export { default } from './SpeechRecognizerModule';
export { default as SpeechRecognizerView } from './SpeechRecognizerView';
export * from  './SpeechRecognizer.types';
