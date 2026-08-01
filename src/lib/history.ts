/**
 * Execution history — the last 20 script runs, kept in the encrypted vault.
 *
 * Ported from the native `executionHistory` service. Used for the "recent"
 * quick-run strip and for post-mortem when a run misbehaves.
 */

import { vaultGet, vaultPeek, vaultSet } from "./vault";

const KEY = "butler_exec_history_v1";
const MAX = 20;

export type RunRecord = {
  id: string;
  scriptId: string;
  name: string;
  category: string;
  ok: boolean;
  ms: number;
  at: number;
  error?: string;
};

const listeners = new Set<() => void>();
let cache: RunRecord[] = [];
let hydrated = false;

function emit() {
  for (const l of listeners) l();
}

export function subscribeHistory(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function historySnapshot(): RunRecord[] {
  return cache;
}

export async function loadHistory(): Promise<RunRecord[]> {
  if (hydrated) return cache;
  cache = await vaultGet<RunRecord[]>(KEY, vaultPeek<RunRecord[]>(KEY, []));
  hydrated = true;
  emit();
  return cache;
}

export async function recordRun(entry: Omit<RunRecord, "id" | "at">): Promise<void> {
  await loadHistory();
  const next: RunRecord = { ...entry, id: `${Date.now()}-${entry.scriptId}`, at: Date.now() };
  cache = [next, ...cache.filter((r) => r.id !== next.id)].slice(0, MAX);
  emit();
  await vaultSet(KEY, cache);
}

export async function clearHistory(): Promise<void> {
  cache = [];
  emit();
  await vaultSet(KEY, cache);
}
