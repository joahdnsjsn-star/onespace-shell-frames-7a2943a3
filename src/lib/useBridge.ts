import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  bridgeSnapshot,
  checkHealth,
  loadBridge,
  subscribeBridge,
  type BridgeStatus,
} from "./butler-bridge";

/**
 * Live view of the bridge connection. Loads the encrypted config once, then
 * probes health on mount, on reconnect and whenever the app returns to the
 * foreground — so the UI always tells the truth about the PC link.
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

  const refresh = useCallback(() => {
    void loadBridge().then((cfg) => {
      if (cfg.baseUrl) void checkHealth().catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);

  return {
    status: snap.status,
    lastError: snap.lastError,
    paired: Boolean(snap.config.baseUrl),
    refresh,
  };
}
