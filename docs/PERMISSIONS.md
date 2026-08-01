# Permission policy

Single source of truth: `app.permissions.json` (build tooling) and
`src/lib/permissions.ts` (runtime UI). They must stay identical.
The in-app Permission Centre lives at `/permissions`.

## Principles

1. Nothing is requested at launch. Every runtime permission is triggered by an explicit tap.
2. Every permission has a stated reason and a working fallback if refused.
3. Anything not needed is **blocked at build time**, so no transitive dependency can widen the footprint.

## Requested

| Permission | Android | Why | If refused |
|---|---|---|---|
| Local network | `INTERNET` | Reach the PC bridge on the LAN | Offline demo mode |
| Camera | `CAMERA` | Scan the pairing QR once | Type the 6-digit code |
| Haptics | `VIBRATE` | Tap/alert confirmation | Sound + motion only |
| Notifications | — (web) | Script finished / host lost | In-app toasts |
| Clipboard | — (web) | Copy output and codes | Manual selection |
| File access | — (user-picked only) | Fileshare uploads | Receive-only |
| Screen wake lock | — (web) | Keep screen on during long runs | Screen dims normally |

## Blocked at build time

`RECORD_AUDIO`, all location, contacts, phone state, all external-storage and media-library reads,
`MEDIA_PROJECTION`, foreground services, body sensors, activity recognition.

Keep `expo.android.blockedPermissions` in the native `app.json` byte-identical to
`android.blockedPermissions` in `app.permissions.json`.

## Play Store data safety

No data collected, no data shared, no analytics SDKs, encrypted in transit on the LAN.
See `/data-safety` in the app and `docs/PLAYSTORE.md`.
