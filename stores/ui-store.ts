import { create } from "zustand";

interface UIState {
  /**
   * False while a surface with its own keyboard input (e.g. DirectDetailSheet's
   * inline title/when edit) is on screen. CaptureDock reads this and unmounts
   * itself rather than just visually hiding — it also runs a global keyboard
   * listener, so leaving it mounted would still lift and repaint it over
   * whatever else just opened the keyboard.
   */
  captureDockVisible: boolean;
  setCaptureDockVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  captureDockVisible: true,
  setCaptureDockVisible: (visible) => set({ captureDockVisible: visible }),
}));
