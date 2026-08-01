# OnSpace.ai parity — what this repo can and cannot be

Verified on 2026-08-01 against the real OnSpace project archive
(`butler-ai-final`, Butler AI 5.0.9).

## The one fact that decides everything

**OnSpace.ai is an Expo / React Native platform, not a web host.**

Evidence from the OnSpace project itself:

| Signal | Value |
| --- | --- |
| `package.json` name | `onspace-app` (OnSpace's own scaffold name) |
| Entry point | `expo-router/entry` |
| Runtime | Expo SDK 53, React Native 0.79.3, Metro bundler |
| Build pipeline | EAS (`eas.json`, APK / AAB, Gradle) |
| Preview | `react-native-web` + Metro web bundler |
| Store submit | `eas.json` → `submit.production.ios.appleId: contact@onspace.ai` |
| Its own docs | "The GitHub JSON is for the Lovable.dev web version (React + TanStack + Cloudflare Workers) — a completely different stack. **It cannot be directly imported into this React Native OnSpace.ai app.**" (`CODEWORD.md`) |

So there is no configuration, build flag, or adapter that makes a TanStack
Start web repo *import* into OnSpace as an app. Anyone promising "100 %
compatible" in that sense is wrong. What this repo can be is **100 % parity-
compatible**: the same product, same contracts, same paperwork, deployable as
the web/PWA face of Butler AI, with every shared value machine-checked so the
two repos cannot drift.

## What "compatible" means here, concretely

| Layer | Web repo (this one) | OnSpace/Expo repo | Enforced by |
| --- | --- | --- | --- |
| Android permissions | `app.permissions.json` | `expo.android.permissions` | `npm run parity` |
| Blocked permissions | `app.permissions.json` | `expo.android.blockedPermissions` | `npm run parity` |
| Package id | `com.butlerai.pc.automation` | `expo.android.package` | `npm run parity` |
| Deep-link scheme | `butlerai` | `expo.scheme` | `npm run parity` |
| Play listing link | `related_applications` in the PWA manifest | Play Console listing | `npm run parity` |
| Runtime permission UI | `/permissions` route | Permission screens | manual |
| Legal text | `/privacy-policy`, `/terms`, `/data-safety`, `/security-trust` | `PRIVACY_POLICY.md`, `DATA_SAFETY_FORM.md` | manual |

Run it any time:

```bash
npm run parity                                   # internal consistency
node scripts/check-native-parity.mjs ../butler-ai-final/app.json   # vs native
```

CI runs the internal check on every push.

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
