/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "share",
  displayName: "Synapse",
  icon: "https://github.com/expo.png",
  // Same App Group the widget uses — the share extension and the app can read
  // each other's shared container. We route via deep link (below), but keeping
  // the group entitlement lets the extension fall back to a shared write later.
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
