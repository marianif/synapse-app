import { NativeModule, requireNativeModule } from 'expo';

import { SpeechRecognizerModuleEvents } from './SpeechRecognizer.types';

declare class SpeechRecognizerModule extends NativeModule<SpeechRecognizerModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<SpeechRecognizerModule>('SpeechRecognizer');
