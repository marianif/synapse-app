/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "watch-widget",
  bundleIdentifier: config.ios.bundleIdentifier + ".watch.watchwidget",

  colors: { $accent: "darkcyan" },
  deploymentTarget: "9.4",
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
