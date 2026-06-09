const {
  withInfoPlist,
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');

const withIosPermissions = (config) => {
  return withInfoPlist(config, (mod) => {
    mod.modResults['NSSpeechRecognitionUsageDescription'] =
      'Synapse uses speech recognition to let you create tasks with your voice.';
    mod.modResults['NSMicrophoneUsageDescription'] =
      'Synapse needs microphone access to record your voice for task creation.';
    return mod;
  });
};

const withAndroidPermissions = (config) => {
  return withAndroidManifest(config, (mod) => {
    AndroidConfig.Permissions.ensurePermissions(mod.modResults, [
      'android.permission.RECORD_AUDIO',
    ]);
    return mod;
  });
};

const withSpeechRecognizerPermissions = (config) => {
  config = withIosPermissions(config);
  config = withAndroidPermissions(config);
  return config;
};

module.exports = withSpeechRecognizerPermissions;
