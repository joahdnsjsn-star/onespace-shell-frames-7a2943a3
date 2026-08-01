import { useCallback, useEffect, useState } from "react";

const PREFIX = "nexus:";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/**
 * Persisted local setting. SSR-safe: renders the fallback on the server and the
 * first client paint, then hydrates from localStorage in an effect.
 */
export function useSetting<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(read(key, fallback));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(PREFIX + key, JSON.stringify(resolved));
        } catch {
          /* storage unavailable — keep in-memory only */
        }
        return resolved;
      });
    },
    [key],
  );

  const toggle = useCallback(() => {
    update(((prev: unknown) => !prev) as unknown as (p: T) => T);
  }, [update]);

  return { value, set: update, toggle, hydrated } as const;
}

/** Clear every NEXUS-scoped key. Used by the "erase local data" control. */
export function clearAllSettings() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}
