import type { ExpoConfig } from "expo/config";
import appJson from "./app.json";

const PROFILE = process.env.EAS_BUILD_PROFILE ?? "development";
const IS_DEVELOPMENT = PROFILE === "development";

const BASE_BUNDLE_ID = "dev.the-wedge.synapse-app";
const BUNDLE_ID = `${BASE_BUNDLE_ID}${IS_DEVELOPMENT ? ".dev" : ""}`;
const APP_GROUP = `group.${BUNDLE_ID}`;

const expo = appJson.expo as unknown as ExpoConfig;

const appExtensions =
  expo.extra?.eas?.build?.experimental?.ios?.appExtensions?.map((ext: { bundleIdentifier: string; entitlements?: Record<string, unknown> }) => ({
    ...ext,
    bundleIdentifier: `${BUNDLE_ID}${ext.bundleIdentifier.replace(BASE_BUNDLE_ID, "")}`,
    entitlements: {
      ...ext.entitlements,
      "com.apple.security.application-groups": [APP_GROUP],
    },
  })) ?? [];

const config: ExpoConfig = {
  ...expo,
  ios: {
    ...expo.ios,
    bundleIdentifier: BUNDLE_ID,
    entitlements: {
      ...expo.ios?.entitlements,
      "com.apple.security.application-groups": [APP_GROUP, APP_GROUP],
    },
  },
  extra: {
    ...expo.extra,
    eas: {
      ...expo.extra?.eas,
      build: {
        ...expo.extra?.eas?.build,
        experimental: {
          ...expo.extra?.eas?.build?.experimental,
          ios: {
            ...expo.extra?.eas?.build?.experimental?.ios,
            appExtensions,
          },
        },
      },
    },
  },
};

export default config;