import { registerWebModule, NativeModule } from 'expo';

import { SpeechRecognizerModuleEvents } from './SpeechRecognizer.types';

class SpeechRecognizerModule extends NativeModule<SpeechRecognizerModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(SpeechRecognizerModule, 'SpeechRecognizerModule');
