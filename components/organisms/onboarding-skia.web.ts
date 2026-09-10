/**
 * Web stand-ins for the onboarding scene layer. Web chapters render the
 * static RN fallbacks in `onboarding-scenes.tsx` and never mount a canvas, so
 * these exist only to keep the module graph free of Skia's web build (which
 * would require loading CanvasKit on import).
 */
import type { ComponentType } from "react";

const NullComponent = (): null => null;

export const Canvas = NullComponent as ComponentType<Record<string, unknown>>;
export const Circle = NullComponent as ComponentType<Record<string, unknown>>;
export const Group = NullComponent as ComponentType<Record<string, unknown>>;
export const Line = NullComponent as ComponentType<Record<string, unknown>>;
export const Path = NullComponent as ComponentType<Record<string, unknown>>;
export const RoundedRect = NullComponent as ComponentType<
  Record<string, unknown>
>;
export const Skia = null as never;

export const vec = (x: number, y: number): { x: number; y: number } => ({
  x,
  y,
});
