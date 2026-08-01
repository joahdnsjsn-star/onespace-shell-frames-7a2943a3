// Parity checker: keeps this web repo's permission contract identical to the
// OnSpace.ai / Expo native app's app.json.
//
//   node scripts/check-native-parity.mjs [path/to/native/app.json]
//
// With no argument it only validates internal consistency
// (app.permissions.json <-> src/lib/permissions.ts <-> manifest).
// With a path it also diffs against the real Expo manifest, so a permission
// added on either side fails loudly instead of silently widening the Play
// Store data-safety footprint.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const contract = JSON.parse(readFileSync(resolve(ROOT, "app.permissions.json"), "utf8"));
const registry = readFileSync(resolve(ROOT, "src/lib/permissions.ts"), "utf8");
const manifest = JSON.parse(readFileSync(resolve(ROOT, "public/manifest.webmanifest"), "utf8"));

const problems = [];
const sorted = (a) => [...a].sort();
const sameSet = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

// 1. Every native string in the contract must exist in the runtime registry.
for (const p of [...contract.android.permissions, ...contract.android.blockedPermissions]) {
  if (!registry.includes(p)) problems.push(`src/lib/permissions.ts is missing "${p}"`);
}

// 2. Requested and blocked sets must not overlap.
for (const p of contract.android.permissions) {
  if (contract.android.blockedPermissions.includes(p)) {
    problems.push(`"${p}" is both requested and blocked`);
  }
}

// 3. PWA manifest must keep the strict permissions policy and point at the
//    same Play Store listing as the native package id.
const policy = manifest["permissions_policy"] ?? {};
if (JSON.stringify(policy["camera"]) !== JSON.stringify(["self"])) {
  problems.push('manifest permissions_policy.camera must be ["self"]');
}
for (const key of ["microphone", "geolocation", "interest-cohort"]) {
  if (JSON.stringify(policy[key]) !== "[]") {
    problems.push(`manifest permissions_policy.${key} must be []`);
  }
}
const play = (manifest["related_applications"] ?? []).find((a) => a.platform === "play");
if (play && play.id !== contract.native.androidPackage) {
  problems.push(
    `manifest related_applications play id "${play.id}" != native package "${contract.native.androidPackage}"`,
  );
}

// 4. Optional: diff against the real Expo app.json.
const nativePath = process.argv[2];
if (nativePath) {
  if (!existsSync(nativePath)) {
    problems.push(`native app.json not found at ${nativePath}`);
  } else {
    const expo = JSON.parse(readFileSync(nativePath, "utf8")).expo ?? {};
    const a = expo.android ?? {};
    if (!sameSet(a.permissions ?? [], contract.android.permissions)) {
      problems.push("expo.android.permissions differs from app.permissions.json");
    }
    // Blocked list: the contract may be a strict superset (blocking more is
    // always safe), but the native app must never block LESS than we promise.
    const nativeBlocked = new Set(a.blockedPermissions ?? []);
    const missing = contract.android.blockedPermissions.filter((p) => !nativeBlocked.has(p));
    const extra = [...nativeBlocked].filter(
      (p) => !contract.android.blockedPermissions.includes(p),
    );
    if (missing.length) {
      problems.push(`native app.json does not block: ${missing.join(", ")}`);
    }
    if (extra.length) {
      problems.push(`native app.json blocks extras not in the contract: ${extra.join(", ")}`);
    }
    if (a.package && a.package !== contract.native.androidPackage) {
      problems.push(
        `expo.android.package "${a.package}" != contract "${contract.native.androidPackage}"`,
      );
    }
    if (expo.scheme && expo.scheme !== contract.native.scheme) {
      problems.push(`expo.scheme "${expo.scheme}" != contract "${contract.native.scheme}"`);
    }
    if (expo.version && expo.version !== contract.native.version) {
      problems.push(`expo.version "${expo.version}" != contract "${contract.native.version}"`);
    }
    if (a.versionCode && a.versionCode !== contract.native.androidVersionCode) {
      problems.push(
        `expo.android.versionCode ${a.versionCode} != contract ${contract.native.androidVersionCode}`,
      );
    }
  }
}

// 5. Play Store readiness: identity, data-safety declaration and the compliance
//    docs the Play Console submission depends on must all be present and in sync.
const n = contract.native ?? {};
for (const key of ["version", "androidVersionCode", "description", "copyright", "minAge"]) {
  if (n[key] === undefined || n[key] === "")
    problems.push(`app.permissions.json native.${key} is missing`);
}
if (n.minAge !== 18) problems.push("native.minAge must stay 18 (Play target audience is 18+)");
if (!/^\d+\.\d+\.\d+$/.test(String(n.version ?? ""))) {
  problems.push(`native.version "${n.version}" is not semver`);
}
const ps = contract.playStore ?? {};
if (ps.encryptedInTransit !== true) problems.push("playStore.encryptedInTransit must be true");
if (ps.adsOrTracking !== false) problems.push("playStore.adsOrTracking must be false");
if ((ps.dataShared ?? []).length)
  problems.push("playStore.dataShared must stay empty (nothing is shared)");
if (!(ps.dataCollected ?? []).length) {
  problems.push("playStore.dataCollected must list what the Data safety form declares");
}
if (!String(ps.deletionPath ?? "").trim())
  problems.push("playStore.deletionPath is required by Play policy");

const requiredDocs = [
  "docs/native/DATA_SAFETY_FORM.md",
  "docs/native/PROMINENT_DISCLOSURES.md",
  "docs/native/PRIVACY_POLICY.md",
  "docs/native/THIRD_PARTY_LICENSES.md",
  "docs/native/SECURITY_AND_PLAYSTORE_COMPLIANCE.md",
  "docs/PLAYSTORE.md",
  "docs/ONSPACE_SYNC.md",
  "docs/ONSPACE_PARITY.md",
];
for (const d of requiredDocs) {
  if (!existsSync(resolve(ROOT, d))) problems.push(`required compliance doc missing: ${d}`);
}

// 6. In-app legal surfaces must exist and must not contradict the Data safety
//    form (a "we collect nothing" page next to a "Yes" declaration is a
//    rejection trigger).
for (const route of ["privacy-policy", "data-safety", "terms"]) {
  const f = resolve(ROOT, `src/routes/${route}.tsx`);
  if (!existsSync(f)) problems.push(`src/routes/${route}.tsx is missing`);
}
const safety = existsSync(resolve(ROOT, "src/routes/data-safety.tsx"))
  ? readFileSync(resolve(ROOT, "src/routes/data-safety.tsx"), "utf8")
  : "";
for (const t of ps.dataCollected ?? []) {
  if (!safety.toLowerCase().includes(t.toLowerCase().split(" ")[0])) {
    problems.push(`src/routes/data-safety.tsx does not disclose declared data type "${t}"`);
  }
}
if (/no data is collected/i.test(safety)) {
  problems.push(
    'src/routes/data-safety.tsx claims "no data is collected" but the form declares data types',
  );
}

// 7. The OnSpace build contract must target the same package/scheme.
const onspacePath = resolve(ROOT, "onspace.json");
if (existsSync(onspacePath)) {
  const onspace = JSON.parse(readFileSync(onspacePath, "utf8"));
  if (onspace.android?.package !== contract.native.androidPackage) {
    problems.push("onspace.json android.package != contract native.androidPackage");
  }
  if (onspace.android?.scheme !== contract.native.scheme) {
    problems.push("onspace.json android.scheme != contract native.scheme");
  }
  if (onspace.target !== "android") problems.push('onspace.json target must be "android"');
} else {
  problems.push("onspace.json is missing");
}

if (problems.length) {
  console.error("[parity] FAILED:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log(
  `[parity] OK — ${contract.android.permissions.length} requested, ${contract.android.blockedPermissions.length} blocked${nativePath ? ", matches native app.json" : ""}`,
);
