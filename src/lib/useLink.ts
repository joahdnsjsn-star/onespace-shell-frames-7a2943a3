import { useSyncExternalStore } from "react";
import { linkSnapshot, pokeLink, subscribeLink, type LinkSnapshot } from "./autoconnect";

/**
 * Read-only view of the auto-connect engine. Every screen shares one engine —
 * mounting this hook never starts a new timer or a new probe.
 */
export function useLink(): LinkSnapshot & { retry: () => void } {
  const snap = useSyncExternalStore(subscribeLink, linkSnapshot, linkSnapshot);
  return { ...snap, retry: pokeLink };
}
