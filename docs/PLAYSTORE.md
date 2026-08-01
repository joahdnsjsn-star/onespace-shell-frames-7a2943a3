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
