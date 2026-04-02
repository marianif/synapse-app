const { withInfoPlist } = require('@expo/config-plugins');

const withSpeechRecognizerPermissions = (config) => {
  return withInfoPlist(config, (mod) => {
    mod.modResults['NSSpeechRecognitionUsageDescription'] =
      'Synapse uses speech recognition to let you create tasks with your voice.';
    mod.modResults['NSMicrophoneUsageDescription'] =
      'Synapse needs microphone access to record your voice for task creation.';
    return mod;
  });
};

module.exports = withSpeechRecognizerPermissions;
