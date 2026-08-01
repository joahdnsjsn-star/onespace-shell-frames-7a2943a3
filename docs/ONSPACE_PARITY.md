# OnSpace.ai parity — what this repo can and cannot be

Verified on 2026-08-01 against the real OnSpace project archive
(`butler-ai-final`, Butler AI 5.0.9).

## The one fact that decides everything

**OnSpace.ai is primarily an Expo / React Native platform.** Its native build
pipeline expects `expo-router`, Metro, EAS, and Gradle. A generic TanStack Start
web repo cannot be imported as a native Expo project and will be rejected if it
claims to be one.

This repo is therefore a **Vite + TanStack Start web shell that targets the
Android phone form factor**. OnSpace.ai can wrap it as a **Trusted Web Activity
(TWA)** or PWA-style Android app: the web shell is the UI, the PC automation
engine stays a separate self-hosted Python server on the user's local network.

What this repo is **100 % compatible on** is the shared product contract:

- Same Android package id, scheme, and version
- Same Android permission request / block lists
- Same legal / Data Safety disclosures
- Same Play Store identity and assets
- Same health-check endpoint for OnSpace deploy verification

Those values are machine-checked by `bun run parity` so the two repos cannot drift.


## What "compatible" means here, concretely

| Layer | Web repo (this one) | OnSpace/Expo repo | Enforced by |
| --- | --- | --- | --- |
| Android target | `onspace.json target: android` | `expo.android` | `bun run parity` |
| Android permissions | `app.permissions.json` | `expo.android.permissions` | `bun run parity` |
| Blocked permissions | `app.permissions.json` | `expo.android.blockedPermissions` | `bun run parity` |
| Package id | `com.butlerai.pc.automation` | `expo.android.package` | `bun run parity` |
| Deep-link scheme | `butlerai` | `expo.scheme` | `bun run parity` |
| Play listing link | `related_applications` in the PWA manifest | Play Console listing | `bun run parity` |
| Health check | `/api/health` server route | n/a (OnSpace verification) | CI + manual |
| Runtime permission UI | `/permissions` route | Permission screens | manual |
| Legal text | `/privacy-policy`, `/terms`, `/data-safety`, `/security-trust` | `PRIVACY_POLICY.md`, `DATA_SAFETY_FORM.md` | manual |

Run it any time:

```bash
bun run parity                                   # internal consistency
node scripts/check-native-parity.mjs ../butler-ai-final/app.json   # vs native
```

CI runs the internal check plus the Node SSR build on every push.


## Findings from the native archive (action needed there, not here)

1. **`READ_CONTACTS` is not blocked** in the native `app.json`, although the
   privacy paperwork on both sides says contacts are never touched. Add
   `"android.permission.READ_CONTACTS"` to `expo.android.blockedPermissions`.
   The parity script fails on exactly this until it is fixed.
2. **No `NSCameraUsageDescription`** in `expo.ios.infoPlist` — only a copyright
   string. iOS review rejects a camera-using build without it. Copy the string
   from `ios.NSCameraUsageDescription` in `app.permissions.json`.
3. **A live-looking AI API key is committed in plain text** in the native
   `CODEBASE_INDEX.md`. Rotate it; treat it as already public.
4. **Data Safety form mismatch**: the native `constants/dataSafety.ts` still
   claims chat text is sent to a cloud model, which the code does not do.
   The truthful "nothing leaves the device except to your own PC" wording is
   what this repo's `/data-safety` route already says — copy it across.
5. Native `blockedPermissions` also carries `PHONE_CALL`; it is now in this
   repo's contract too, so the lists are a strict superset match.

## Values now synced into this repo

From the native `app.json`: name `Butler AI`, slug `butler-ai`, scheme
`butlerai`, package/bundle `com.butlerai.pc.automation`, dark UI, portrait,
background `#0C0E14`. Stored under `native` in `app.permissions.json`.

Not adopted deliberately: the native colour palette (`primary #FF6A1F` orange,
`surface #131620`). This shell's HUD palette is an intentional design choice
and changing it would be a visual rewrite, not a compatibility fix.

## Native-side rules worth respecting if these repos ever merge

- Never construct an `Animated.Value` at module scope — it crashes the
  `react-native-web` preview.
- OnSpace's browser preview runs `react-native-web`; devices run Hermes.
  "Looks right in preview" is not proof an APK is safe.
- Minimum font size 11 px, tap targets 44×44 (iOS) / 48×48 (Android).

## Deploying this repo

This repo is the web/PWA face. See `docs/ONSPACE_SYNC.md` for the three build
modes (static / Node SSR / edge) and `docs/PLAYSTORE.md` for the Trusted Web
Activity route if you ever want a store build from the web code instead of the
Expo one.
