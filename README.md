# Butler AI — NEXUS (Web Shell)

A dark, HUD-style command-centre UI for **Butler AI: PC Automation**, a local-PC assistant.
This repository is the **Android-focused web shell** for OnSpace.ai: every screen,
component and interaction state is built and optimized for a phone form factor.
The PC automation engine itself is a separate self-hosted Python server; the shell
talks to it privately over the local LAN.


Built with **TanStack Start (React 19) · Vite 7 · Tailwind CSS v4 · TypeScript**.

---

## 1. Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | **22** | `.nvmrc` and `.node-version` pin 22. |
| Package manager | **bun** 1.2+ | Preferred; npm/pnpm also work. |
| Git | any | Only needed for deploying. |

Check your version first:

```bash
node -v     # must print v22.x
bun -v      # must print 1.2.x
```

Using nvm:

```bash
nvm install   # reads .nvmrc
nvm use
```


## 2. Run it from scratch

```bash
git clone https://github.com/<you>/<repo>.git
cd <repo>

bun install            # install dependencies
cp .env.example .env   # optional — no vars are required for the shell

bun run dev            # http://localhost:8080
```

Other scripts:

```bash
bun run build         # production build (Cloudflare Worker output)
bun run build:node    # Node SSR build — what OnSpace uses
bun run start         # serve the Node SSR build on $PORT (default 3000)
bun run preview       # preview the Vite client build
bun run lint          # eslint
bunx tsc --noEmit     # typecheck
bun run parity        # verify OnSpace/Expo permission parity
```


### Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Unsupported engine` / crypto errors on install | You are on Node 20 or older. Switch to Node 22. |
| Port 8080 already in use | `bun run dev -- --port 5173` |
| Blank page after adding a route | Route files under `src/routes/` regenerate `src/routeTree.gen.ts`. Never edit that file by hand; restart `bun run dev`. |
| Stale build / weird module errors | `rm -rf node_modules .output dist && bun install` |
| Tailwind class not applying | Tokens live in `src/styles.css` (`@theme`). There is no `tailwind.config.js`. |


## 3. Environment variables

The shell needs **none**. `.env.example` documents the shape for later:

- Server-only secrets are read inside server-function handlers via `process.env.*`.
- Browser-visible values must be prefixed `VITE_` and read via `import.meta.env.*`.
- Never commit `.env` — it is git-ignored.

## 4. Deployment

> **Syncing with OnSpace.ai?** Follow the step-by-step checklist in
> [`docs/ONSPACE_SYNC.md`](docs/ONSPACE_SYNC.md) — it covers GitHub push, CI,
> OnSpace import, build settings, environment variables, auto-deploy and
> post-deploy verification.


### 4.1 Push to GitHub

```bash
git init
git add .
git commit -m "Butler AI NEXUS shell"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

CI runs automatically: `.github/workflows/ci.yml` installs, typechecks and builds on
every push and pull request to `main`.

### 4.2 OnSpace.ai (Android wrapper / TWA build)

This repo is the **Android-focused web shell** of Butler AI. It is not a native
Expo/React Native project; instead, OnSpace.ai should wrap it as a **Trusted Web
Activity (TWA)** or PWA-style Android app using the phone form factor settings below.

| Setting | Value |
| --- | --- |
| Install command | `bun install` |
| Build command | `bun run build:node` |
| Start command | `bun run start` |
| Output directory | `dist` |
| Server entry | `dist/server/index.mjs` |
| Static assets | `dist/client` |
| Dev command | `bun run dev` |
| Node version | `22` |
| Health check | `/api/health` |
| Env vars | none required |
| Form factor | phone (portrait) |
| Android package | `com.butlerai.package.automation` |
| URL scheme | `butlerai` |

If you need a true native Android APK/AAB built with Expo, use the separate Expo
native repo (`butler-ai-final`) instead of this web shell.

### 4.2.1 Expo Android APK / AAB (EAS Build)

This repo includes `src/app/` Expo Router screens and an `eas.json` build configuration.
To build a native Android APK or AAB:

```bash
# Install EAS CLI once
npm install -g eas-cli

# Authenticate with Expo
eas login

# Configure the project (first time)
eas build:configure

# Build a preview APK (installable side-load)
bun run eas:build:preview
# or: eas build --platform android --profile preview

# Build a production AAB (Play Store upload)
bun run eas:build:production
# or: eas build --platform android --profile production
```

#### OnSpace URL

The native screen opens **`https://onspace.ai`** by default.
Override it by setting the `EXPO_PUBLIC_ONSPACE_URL` environment variable
in your EAS project secrets or a local `.env` file:

```
EXPO_PUBLIC_ONSPACE_URL=https://your-custom-deployment.onspace.ai
```

The app validates the URL with `Linking.canOpenURL` before opening it and shows
an actionable alert if the URL cannot be reached.


### 4.3 Docker / container run

```bash
bun install
bun run build:node
docker build -t butler-ai-nexus .
docker run -p 3000:3000 butler-ai-nexus
```

A `healthcheck` is built into the image and hits `/api/health` every 30 seconds.


### 4.4 Self-hosting the production build

```bash
bun install
bun run build:node
bun start            # serves the app bundle on $PORT (default 3000)
```

This is the same command OnSpace runs; the output is the Android app bundle the
wrapper loads. There is no separate website build.


## 5. Routes

| Route | Screen |
| --- | --- |
| `/` | Home telemetry dashboard (gauges, neural core, live clock) |
| `/onboarding` | Guided 10-step walkthrough (one step at a time, gated agreements) |
| `/butler` | Butler AI chat — non-scrolling page, big talk button, undo |
| `/scripts` | Script library — non-scrolling page, run console, undo |
| `/knowledge` | Neural knowledge base |
| `/logs` | Event stream + filters |
| `/builder` | Visual automation composer |
| `/fileshare` | LAN file bridge |
| `/connect` | Device pairing / QR |
| `/cosmetic` | Theme + HUD density |
| `/settings` | Configuration hub (persisted via localStorage) |
| `/components` | Full component gallery |
| `/privacy-policy`, `/terms`, `/data-safety`, `/security-trust`, `/crash-report` | Legal & utility docs |

## 6. Project structure

```
.github/workflows/     ci.yml (typecheck + build), deploy-pages.yml
src/
  routes/              file-based routes (TanStack Router)
  components/
    nexus/
      AppShell.tsx     header, 5-slot tab bar, backdrop, dock, palette, `fill` mode
      PageLauncher.tsx full-screen press-to-go page grid
      CommandBar.tsx   Cmd/Ctrl+K command palette
      NexusFX.tsx      animated SVG logo, ambient backdrop, scroll meter
      Instruments.tsx  RadialGauge, NeuralCore, ScanFrame, LiveClock
      ButlerDock.tsx   floating AI chat dock
      OfflineBanner.tsx, LegalDoc.tsx
      ui.tsx           design-system primitives
    ui/                shadcn primitives
  hooks/               useSetting (persisted), useTelemetry (demo stream)
  styles.css           design tokens, utilities, animations
```

## 7. Navigation model

- Bottom bar has **5 fixed slots** — Home · Butler · Scripts · Config · **PAGES**.
  Nothing scrolls horizontally, nothing is hidden.
- **PAGES** opens a full-screen launcher listing every route as a large press-to-go card,
  grouped core / modules / system / legal.
- `Cmd/Ctrl + K` opens the command palette over the same route list.

## 8. Design system

All colour, elevation and motion values are OKLCH tokens in `src/styles.css`.
Never hardcode colours in components — use the semantic tokens (`cyan`, `ok`, `warn`,
`danger`, `neural`, `system`, `net`, `surface*`, `dim`, `faint`).

Pages that must not scroll pass `fill` to `<AppShell>`; the page locks to `100dvh` and
child regions own their own scroll areas.

## 9. Keyboard

- `Cmd/Ctrl + K` — command palette
- `Esc` — close palette / launcher / chat input
- `Enter` — send in the Butler composer

## License

MIT — see [LICENSE](./LICENSE).

## Android / Play Store

The app is an installable PWA. See [docs/PLAYSTORE.md](docs/PLAYSTORE.md) for the Bubblewrap/TWA packaging steps and the Play Console content checklist.
