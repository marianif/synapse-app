import { requireNativeView } from 'expo';
import * as React from 'react';

import { SpeechRecognizerViewProps } from './SpeechRecognizer.types';

const NativeView: React.ComponentType<SpeechRecognizerViewProps> =
  requireNativeView('SpeechRecognizer');

export default function SpeechRecognizerView(props: SpeechRecognizerViewProps) {
  return <NativeView {...props} />;
}
