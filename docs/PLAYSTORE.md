# Play Store distribution (Trusted Web Activity)

The app ships as an installable PWA, which means it can be wrapped as an Android
app and published to Google Play without rewriting anything.

## What is already in place

- `public/manifest.webmanifest` — name, `id`, `start_url`, `scope`,
  `display: standalone`, portrait orientation, theme/background colours, app
  shortcuts.
- Icons: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (Play requires
  a maskable icon), `apple-touch-icon.png`, `favicon.png`.
- Head tags: `theme-color`, `color-scheme`, `mobile-web-app-capable`,
  Apple status-bar style, `manifest` link.
- Safe-area padding on the header and tab bar, `100dvh` layouts, no horizontal
  overflow at 320px.

## Steps

1. Deploy the app bundle to a public HTTPS origin via OnSpace (`bun run build:node`
   + `bun run start`). Note the origin, e.g. `https://nexus.example.com`.
2. Install Bubblewrap: `npm i -g @bubblewrap/cli`
3. Initialise the wrapper:
   `bubblewrap init --manifest https://nexus.example.com/manifest.webmanifest`
   - Application ID: `com.yourcompany.nexus`
   - Display mode: `standalone`, orientation `portrait`
4. Build and sign: `bubblewrap build` → produces `app-release-bundle.aab`.
5. Publish Digital Asset Links so the app runs without a URL bar. Bubblewrap
   prints `assetlinks.json`; host it at
   `https://nexus.example.com/.well-known/assetlinks.json`.
6. Upload the `.aab` in Play Console → Production → Create release.

## Play Console content requirements

| Item | Where it comes from |
| --- | --- |
| Privacy policy URL | `/privacy-policy` route |
| Data safety form | `/data-safety` route — the shell stores settings only in the device's local storage; no accounts, no analytics, no data leaves the device |
| Terms | `/terms` route |
| Security statement | `/security-trust` route |
| Feature graphic / screenshots | Capture Home, Butler, Scripts, Settings at 1080x1920 |

## Verification checklist

- Lighthouse → Installable: pass.
- Chrome on Android shows the "Install app" prompt.
- After install, the app opens full-screen with no browser chrome.
- Rotate/resize: no clipped text, no horizontal scroll.

---

## Compliance source of truth (synced from the native Expo repo, 2026-08-01)

These files are verbatim copies of the submission documents used by the
`com.butlerai.pc.automation` Expo build. Do not edit one side only.

| File | Use in Play Console |
|---|---|
| `docs/native/DATA_SAFETY_FORM.md` | Exact answers for App content → Data safety, plus the Notes for reviewer text |
| `docs/native/PROMINENT_DISCLOSURES.md` | Evidence that every disclosure (remote control, camera, LAN scan, 18+, deletion) is shown in-app |
| `docs/native/PRIVACY_POLICY.md` | Source text for the hosted policy URL |
| `docs/native/SECURITY_AND_PLAYSTORE_COMPLIANCE.md` | Device & Network Abuse policy justification |
| `docs/native/THIRD_PARTY_LICENSES.md` | Open-source attributions |
| `docs/native/PLAYSTORE_SUBMISSION_GUIDE.md` / `PLAYSTORE_DEPLOYMENT_AUTOMATION.md` | Step-by-step upload + EAS submit automation |
| `docs/native/COPYRIGHT.md` | Ownership notice matching `native.copyright` |

### Machine-checked invariants

`bun run parity` (also run by `bun run verify` and CI) fails the build if:

- requested/blocked Android permissions drift from the Expo `app.json`
- `native.version` / `androidVersionCode` / `copyright` / `minAge: 18` are missing or drift
- the Data safety declaration in `app.permissions.json` loses "encrypted in transit",
  gains a shared data type, or drops the deletion path
- the in-app `/data-safety` page stops disclosing a declared data type, or
  contradicts the form by claiming "no data is collected"
- any compliance doc above is deleted
- `onspace.json` stops targeting Android or drifts from the package/scheme

Run it against the real native manifest before every submission:

```bash
node scripts/check-native-parity.mjs ../butler-ai-final/app.json
```

### In-app gates that reviewers will look for

- Onboarding step 3 blocks progress until all **seven** binding checkboxes are
  ticked, including the explicit 18+ confirmation and the "every command needs a
  manual tap" acknowledgement.
- `src/components/nexus/Disclosure.tsx` shows a prominent disclosure sheet
  **before** any OS prompt for camera, notifications, file picking and LAN scan.
- `/privacy-policy`, `/data-safety`, `/terms` and `/security-trust` are reachable
  offline from inside the app, not just as external links.
