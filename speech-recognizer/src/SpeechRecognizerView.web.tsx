import * as React from 'react';

import { SpeechRecognizerViewProps } from './SpeechRecognizer.types';

export default function SpeechRecognizerView(props: SpeechRecognizerViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
