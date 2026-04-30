/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "watch",
  bundleIdentifier: config.ios.bundleIdentifier + ".watch",
  icon: "https://github.com/expo.png",
  colors: { $accent: "darkcyan" },
  deploymentTarget: "10.6",
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
  infoPlist: {
    NSMicrophoneUsageDescription:
      "This app needs access to the microphone to record notes.",
  },
});
