import { useSyncExternalStore } from "react";
import { bridgeSnapshot, subscribeBridge, type BridgeStatus } from "./butler-bridge";
import { pokeLink } from "./autoconnect";

/**
 * Live view of the bridge connection.
 *
 * This hook is a pure reader: the auto-connect engine (started once from the
 * root) owns every probe, timer and reconnect. Screens that need a fresh read
 * call `refresh()`, which just nudges that single engine instead of starting a
 * competing poll loop.
 */
export function useBridge(): {
  status: BridgeStatus;
  lastError: string;
  paired: boolean;
  refresh: () => void;
} {
  const snap = useSyncExternalStore(
    (cb) => subscribeBridge(cb),
    () => bridgeSnapshot(),
    () => bridgeSnapshot(),
  );

  return {
    status: snap.status,
    lastError: snap.lastError,
    paired: Boolean(snap.config.baseUrl),
    refresh: pokeLink,
  };
}
