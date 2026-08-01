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
  problems.push("manifest permissions_policy.camera must be [\"self\"]");
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
    if (!sameSet(a.blockedPermissions ?? [], contract.android.blockedPermissions)) {
      problems.push("expo.android.blockedPermissions differs from app.permissions.json");
    }
    if (a.package && a.package !== contract.native.androidPackage) {
      problems.push(`expo.android.package "${a.package}" != contract "${contract.native.androidPackage}"`);
    }
    if (expo.scheme && expo.scheme !== contract.native.scheme) {
      problems.push(`expo.scheme "${expo.scheme}" != contract "${contract.native.scheme}"`);
    }
  }
}

if (problems.length) {
  console.error("[parity] FAILED:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log(
  `[parity] OK — ${contract.android.permissions.length} requested, ${contract.android.blockedPermissions.length} blocked${nativePath ? ", matches native app.json" : ""}`,
);
