import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import {
  makeMutable,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

/** Any host component whose ref can be handed to `findNodeHandle` — the
 *  outer ScrollView here. Kept loose so `Animated.ScrollView`'s ref type
 *  slots in without a cast. */
export type MeasurableRef = MutableRefObject<unknown>;

/**
 * Shared registry that lets the IdeaConstellation draw amber tendrils from a
 * selected node down to each of its linked diary notes, with endpoints that
 * update on every scroll frame.
 *
 * The registry is spread across three parties:
 *   - the outer ScrollView (owner of `scrollY`)
 *   - each DiaryNote (registers its measured y-in-content)
 *   - the IdeaTimeline strip (registers its own y-in-content so tendrils know
 *     where they originate)
 *
 * All values are `SharedValue<number>` so the constellation's SVG animated
 * props can read them from the UI thread without a JS bridge crossing.
 */
export interface TendrilRegistry {
  /** Ref pointing at the outer ScrollView. Used as the measurement origin so
   *  every reported y is in the same coordinate system. */
  contentRef: MeasurableRef;
  /** Outer ScrollView vertical offset, driven by useAnimatedScrollHandler. */
  scrollY: SharedValue<number>;
  /** Strip's bottom edge in outer-ScrollView content coordinates. Tendrils
   *  originate from selected node (inside strip) and terminate at note rows
   *  below the strip, so this is the y that separates "above the strip" from
   *  "below the strip" for clipping. */
  stripBottomY: SharedValue<number>;
  /** Report the strip's bottom-edge y in content coordinates. */
  registerStripBottom: (y: number) => void;
  /** Idempotent-per-noteId. Returns a stable SharedValue<number> for that
   *  note's measured y-in-content. Callers write into `.value` from onLayout. */
  ensureNote: (noteId: string) => SharedValue<number>;
  /** Same shape as ensureNote, but returns `undefined` when the id isn't
   *  registered — used by the tendril renderer, which shouldn't create rows. */
  peekNote: (noteId: string) => SharedValue<number> | undefined;
  /** Called when a note unmounts. Cleans the map so a stale y doesn't drift
   *  a tendril endpoint into empty space. */
  releaseNote: (noteId: string) => void;
}

const TendrilContext = createContext<TendrilRegistry | null>(null);

/** Hook consumed by the outer diary screen — owns scrollY + the registry map. */
export function useTendrilRegistryOwner(): TendrilRegistry {
  const scrollY = useSharedValue(0);
  const stripBottomY = useSharedValue(0);
  const contentRef = useRef<unknown>(null);
  // Map lives in a ref, not state — mutating it must not re-render.
  const notes = useRef<Map<string, SharedValue<number>>>(new Map());

  const ensureNote = useCallback((noteId: string): SharedValue<number> => {
    const existing = notes.current.get(noteId);
    if (existing) return existing;
    // makeMutable creates a SharedValue outside a component body — safe here
    // because refs are stable and we only allocate once per note id.
    const fresh = makeMutable(0);
    notes.current.set(noteId, fresh);
    return fresh;
  }, []);

  const peekNote = useCallback(
    (noteId: string): SharedValue<number> | undefined =>
      notes.current.get(noteId),
    [],
  );

  const releaseNote = useCallback((noteId: string) => {
    notes.current.delete(noteId);
  }, []);

  const registerStripBottom = useCallback(
    (y: number) => {
      stripBottomY.value = y;
    },
    [stripBottomY],
  );

  return useMemo(
    () => ({
      contentRef,
      scrollY,
      stripBottomY,
      registerStripBottom,
      ensureNote,
      peekNote,
      releaseNote,
    }),
    [
      scrollY,
      stripBottomY,
      registerStripBottom,
      ensureNote,
      peekNote,
      releaseNote,
    ],
  );
}

export const TendrilRegistryProvider = TendrilContext.Provider;

export function useTendrilRegistry(): TendrilRegistry | null {
  return useContext(TendrilContext);
}
