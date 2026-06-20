import { useCallback, useEffect, useRef, useState } from "react";

import { getUiPreference, setUiPreference } from "@/lib/settings";

/**
 * A persisted UI preference. Backed by the generic `ui_pref:` AsyncStorage
 * slot in `lib/settings.ts` — any surface that needs to remember a small
 * scalar choice (this card's mode, this section's layout, etc.) should reach
 * for this hook instead of touching AsyncStorage directly.
 *
 * The validator narrows the loose string read from storage back to T, so the
 * hook returns a typed value to the caller. If the stored value fails the
 * validator (corrupt, old, or absent), `defaultValue` is returned.
 *
 * Returns a tuple shaped like useState, plus a `loaded` flag the caller can
 * use to suppress a first-paint flicker if the difference between the default
 * and the stored value would be visually jarring. Most callers ignore it.
 */
export function useUiPreference<T extends string>(
  key: string,
  defaultValue: T,
  validator: (value: string | null) => value is T,
): readonly [T, (next: T) => void, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  // Keep the latest validator in a ref so the load effect doesn't re-run on
  // every render when the caller passes an inline arrow function.
  const validatorRef = useRef(validator);
  validatorRef.current = validator;

  useEffect(() => {
    let cancelled = false;
    void getUiPreference(key).then((raw) => {
      if (cancelled) return;
      if (validatorRef.current(raw)) setValue(raw);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const update = useCallback(
    (next: T): void => {
      setValue(next);
      void setUiPreference(key, next);
    },
    [key],
  );

  return [value, update, loaded] as const;
}
