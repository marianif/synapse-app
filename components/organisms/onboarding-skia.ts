/**
 * Native binding for the onboarding scene layer.
 *
 * Skia is imported through this module (instead of the package directly) so the
 * web bundle resolves `onboarding-skia.web.ts` and never evaluates Skia's web
 * build, which reads `global.CanvasKit` at import time. Web chapters render
 * static fallbacks instead; see `onboarding-scenes.tsx`.
 */
export * from "@shopify/react-native-skia";
