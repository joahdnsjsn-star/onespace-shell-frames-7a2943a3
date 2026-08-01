/**
 * Encrypted local vault.
 *
 * Everything Butler remembers on the handset — the bridge URL, the pairing
 * token, chat transcripts, script history — goes through here. Values are
 * AES-256-GCM encrypted with a non-extractable CryptoKey that lives in
 * IndexedDB, so a stolen localStorage dump is useless and no plaintext ever
 * touches disk. Nothing is uploaded: this file has no network code at all.
 */

const DB_NAME = "butler-vault";
const STORE = "keys";
const KEY_ID = "master";
const PREFIX = "nexus:v:";

/** Fast in-memory mirror so components can read synchronously after hydrate. */
const cache = new Map<string, unknown>();
let ready: Promise<void> | null = null;
let masterKey: CryptoKey | null = null;

function subtle(): SubtleCrypto | null {
  if (typeof window === "undefined") return null;
  return window.crypto?.subtle ?? null;
}

function idb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve) => {
    try {
      const r = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    try {
      const r = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
      r.onsuccess = () => resolve();
      r.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Load, or mint once, the device master key. Never leaves the device. */
async function getMasterKey(): Promise<CryptoKey | null> {
  if (masterKey) return masterKey;
  const s = subtle();
  if (!s) return null;
  const db = await idb();
  if (db) {
    const existing = await idbGet(db, KEY_ID);
    if (existing && typeof existing === "object" && "algorithm" in (existing as CryptoKey)) {
      masterKey = existing as CryptoKey;
      return masterKey;
    }
  }
  const key = await s.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  if (db) await idbPut(db, KEY_ID, key);
  masterKey = key;
  return masterKey;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = "";
  for (const b of bytes) out += String.fromCharCode(b);
  return btoa(out);
}

function fromB64(text: string): Uint8Array {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function encryptValue(value: unknown): Promise<string | null> {
  const s = subtle();
  const key = await getMasterKey();
  if (!s || !key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await s.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(value)));
  const merged = new Uint8Array(iv.length + ct.byteLength);
  merged.set(iv, 0);
  merged.set(new Uint8Array(ct), iv.length);
  return toB64(merged);
}

async function decryptValue<T>(payload: string): Promise<T | undefined> {
  const s = subtle();
  const key = await getMasterKey();
  if (!s || !key) return undefined;
  try {
    const raw = fromB64(payload);
    const iv = new Uint8Array(raw.slice(0, 12));
    const body = new Uint8Array(raw.slice(12));
    const pt = await s.decrypt({ name: "AES-GCM", iv }, key, body);

    return JSON.parse(dec.decode(pt)) as T;
  } catch {
    return undefined;
  }
}

/** Decrypt everything into the sync cache. Safe to call repeatedly. */
export function vaultReady(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (ready) return ready;
  ready = (async () => {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) {
      const raw = window.localStorage.getItem(k);
      if (!raw) continue;
      const value = await decryptValue<unknown>(raw);
      if (value !== undefined) cache.set(k.slice(PREFIX.length), value);
      else window.localStorage.removeItem(k); // unreadable → wiped, never guessed
    }
  })();
  return ready;
}

/** Synchronous read from the decrypted mirror. Call after `vaultReady()`. */
export function vaultPeek<T>(key: string, fallback: T): T {
  const v = cache.get(key);
  return v === undefined ? fallback : (v as T);
}

export async function vaultGet<T>(key: string, fallback: T): Promise<T> {
  await vaultReady();
  return vaultPeek(key, fallback);
}

export async function vaultSet(key: string, value: unknown): Promise<void> {
  if (typeof window === "undefined") return;
  cache.set(key, value);
  const payload = await encryptValue(value);
  try {
    if (payload) window.localStorage.setItem(PREFIX + key, payload);
  } catch {
    /* quota or private mode — the in-memory value still works this session */
  }
}

export function vaultRemove(key: string): void {
  cache.delete(key);
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* storage unavailable */
  }
}

/** Panic button: forget every encrypted value and the master key itself. */
export async function vaultWipe(): Promise<void> {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  for (const k of keys) window.localStorage.removeItem(k);
  cache.clear();
  masterKey = null;
  ready = null;
  const db = await idb();
  if (db) {
    try {
      db.transaction(STORE, "readwrite").objectStore(STORE).delete(KEY_ID);
    } catch {
      /* nothing to delete */
    }
  }
}

/** True when real WebCrypto encryption is available (not a degraded browser). */
export function vaultEncrypted(): boolean {
  return subtle() !== null;
}
