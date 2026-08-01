/**
 * 🛡️ NEURAL TRIPWIRE — Behavioral Biometric Connection Guard
 * Ported from the native app's services/neuralTripwire.ts.
 *
 * Watches roundtrip latency from the heartbeat to build a statistical baseline
 * of "normal" for this specific server. Any session deviating >2σ raises an
 * alert — that is the fingerprint of a MITM proxy, traffic inspection,
 * rerouted packets or a VPN split.
 *
 * Fully on-device: no endpoint required, nothing leaves the handset.
 */

import { vaultPeek, vaultSet } from "./vault";

const BASELINE_KEY = "tripwire:baseline:v1";
const STATE_KEY = "tripwire:state:v1";
const SAMPLE_TARGET = 20;
const CHECK_EVERY = 5;
const SIGMA_THRESHOLD = 2.0;

export type TripwireStatus = "idle" | "learning" | "monitoring" | "alert" | "disabled";

export interface TripwireBaseline {
  meanMs: number;
  stddevMs: number;
  jitter: number;
  samples: number;
  savedAt: number;
  networkId: string;
}

export interface TripwireState {
  status: TripwireStatus;
  samplesCollected: number;
  samplesNeeded: number;
  baseline: TripwireBaseline | null;
  liveLastMs: number;
  liveMeanMs: number;
  deviationSigma: number;
  deviationRatio: number;
  alertLevel: "NONE" | "MEDIUM" | "HIGH";
  alertMessage: string;
  lastChecked: number;
}

const DEFAULT_STATE: TripwireState = {
  status: "idle",
  samplesCollected: 0,
  samplesNeeded: SAMPLE_TARGET,
  baseline: null,
  liveLastMs: 0,
  liveMeanMs: 0,
  deviationSigma: 0,
  deviationRatio: 1,
  alertLevel: "NONE",
  alertMessage: "",
  lastChecked: 0,
};

class NeuralTripwireService {
  private _samples: number[] = [];
  private _state: TripwireState = { ...DEFAULT_STATE };
  private _listeners = new Set<(s: TripwireState) => void>();
  private _currentNetworkId = "";
  private _enabled = true;
  private _hydrated = false;

  subscribe(fn: (s: TripwireState) => void): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  private _emit(): void {
    const snap = { ...this._state };
    this._listeners.forEach((fn) => {
      try {
        fn(snap);
      } catch {
        /* a bad listener never breaks monitoring */
      }
    });
  }

  getState(): TripwireState {
    return { ...this._state };
  }

  /** Restore the persisted state + baseline. Safe to call repeatedly. */
  load(): void {
    if (this._hydrated || typeof window === "undefined") return;
    this._hydrated = true;
    try {
      const saved = vaultPeek<Partial<TripwireState> | null>(STATE_KEY, null);
      if (saved) this._state = { ...DEFAULT_STATE, ...saved };
      const bl = vaultPeek<TripwireBaseline | null>(BASELINE_KEY, null);
      if (bl) {
        this._state.baseline = bl;
        this._state.status = "monitoring";
        this._state.samplesCollected = SAMPLE_TARGET;
        this._currentNetworkId = bl.networkId;
      }
    } catch {
      this._state = { ...DEFAULT_STATE };
    }
    this._emit();
  }

  private _save(): void {
    void vaultSet(STATE_KEY, this._state).catch(() => {});
  }

  /** Called by the heartbeat after every successful ping. */
  recordLatency(ms: number, serverIp?: string, serverPort?: string): void {
    if (!this._enabled || ms <= 0 || typeof window === "undefined") return;
    this.load();

    const networkId = serverIp && serverPort ? `${serverIp}:${serverPort}` : "unknown";
    if (networkId !== "unknown" && networkId !== this._currentNetworkId) {
      this._currentNetworkId = networkId;
      this._samples = [];
      this._state = { ...DEFAULT_STATE, status: "learning", samplesNeeded: SAMPLE_TARGET };
      this._emit();
    }

    this._samples.push(ms);
    if (this._samples.length > 100) this._samples.shift();

    this._state.samplesCollected = Math.min(this._samples.length, SAMPLE_TARGET);
    this._state.liveLastMs = ms;
    this._state.lastChecked = Date.now();

    // Phase 1 — collect the baseline.
    if (!this._state.baseline && this._samples.length < SAMPLE_TARGET) {
      this._state.status = "learning";
      this._emit();
      return;
    }
    if (!this._state.baseline && this._samples.length >= SAMPLE_TARGET) {
      this._buildBaseline(networkId);
      this._state.status = "monitoring";
      this._emit();
      this._save();
      return;
    }

    // Phase 2 — compare every N samples.
    if (this._state.baseline && this._samples.length % CHECK_EVERY === 0) {
      this._compareToBaseline();
      this._emit();
      this._save();
    } else {
      this._emit();
    }
  }

  private _mean(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
  }

  private _stddev(arr: number[]): number {
    const m = this._mean(arr);
    return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, arr.length));
  }

  private _buildBaseline(networkId: string): void {
    const slice = this._samples.slice(0, SAMPLE_TARGET);
    const baseline: TripwireBaseline = {
      meanMs: this._mean(slice),
      stddevMs: this._stddev(slice),
      jitter: Math.max(...slice) - Math.min(...slice),
      samples: slice.length,
      savedAt: Date.now(),
      networkId,
    };
    this._state.baseline = baseline;
    this._state.liveMeanMs = Math.round(baseline.meanMs);
    this._state.deviationSigma = 0;
    this._state.deviationRatio = 1;
    this._state.alertLevel = "NONE";
    this._state.alertMessage = "";
    void vaultSet(BASELINE_KEY, baseline).catch(() => {});
  }

  private _compareToBaseline(): void {
    const bl = this._state.baseline;
    if (!bl) return;

    const recent = this._samples.slice(-10);
    const liveMean = this._mean(recent);
    this._state.liveMeanMs = Math.round(liveMean);

    const sigma = Math.max(bl.stddevMs, 1);
    const deviationSigma = (liveMean - bl.meanMs) / sigma;
    const deviationRatio = liveMean / Math.max(bl.meanMs, 1);
    this._state.deviationSigma = Math.round(deviationSigma * 10) / 10;
    this._state.deviationRatio = Math.round(deviationRatio * 100) / 100;

    const isAnomaly = deviationSigma > SIGMA_THRESHOLD || deviationRatio > 2.5;
    if (isAnomaly) {
      const isHigh = deviationSigma > SIGMA_THRESHOLD * 1.5 || deviationRatio > 3.0;
      this._state.status = "alert";
      this._state.alertLevel = isHigh ? "HIGH" : "MEDIUM";
      this._state.alertMessage =
        `Latency ${Math.round(liveMean)}ms vs baseline ${Math.round(bl.meanMs)}ms ` +
        `(${deviationRatio.toFixed(1)}× normal, ${deviationSigma.toFixed(1)}σ). ` +
        (isHigh
          ? "Possible MITM proxy or traffic inspection detected."
          : "Unusual latency — the network may be routed differently.");
    } else {
      this._state.status = "monitoring";
      this._state.alertLevel = "NONE";
      this._state.alertMessage = "";
    }
  }

  reset(): void {
    this._samples = [];
    this._currentNetworkId = "";
    this._state = { ...DEFAULT_STATE, status: "idle" };
    void vaultSet(BASELINE_KEY, null).catch(() => {});
    void vaultSet(STATE_KEY, null).catch(() => {});
    this._emit();
  }

  setEnabled(v: boolean): void {
    this._enabled = v;
    if (!v) {
      this._state.status = "disabled";
      this._emit();
    }
  }

  isEnabled(): boolean {
    return this._enabled;
  }
}

export const neuralTripwire = new NeuralTripwireService();
