# Butler AI — NEXUS (Web Shell)

A dark, HUD-style command-centre UI for **Butler AI NEXUS**, a local-PC assistant.
This repository is the **visual shell**: every screen, component and interaction state is
built and interactive, but nothing talks to a real backend yet.

Built with **TanStack Start (React 19) · Vite 7 · Tailwind CSS v4 · TypeScript**.

---

## 1. Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | **20 or 22** | `.nvmrc` pins 20. Node 18 will fail (Vite 7 requires 20.19+). |
| Package manager | npm 10+ / pnpm 9+ / bun 1.1+ | Any works; examples use npm. |
| Git | any | Only needed for cloning/deploying. |

Check your version first:

```bash
node -v     # must print v20.x or v22.x
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

npm install            # install dependencies
cp .env.example .env   # optional — no vars are required for the shell

npm run dev            # http://localhost:8080
```

Other scripts:

```bash
npm run build     # production build
npm run preview   # serve the production build locally
npm run lint      # eslint
npx tsgo --noEmit # typecheck (or: npx tsc --noEmit)
```

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Unsupported engine` / crypto errors on install | You are on Node 18 or older. Switch to Node 20+. |
| Port 8080 already in use | `npm run dev -- --port 5173` |
| Blank page after adding a route | Route files under `src/routes/` regenerate `src/routeTree.gen.ts`. Never edit that file by hand; restart `npm run dev`. |
| Stale build / weird module errors | `rm -rf node_modules .output dist && npm install` |
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

### 4.2 OnSpace.ai (Android app build)

Import the repository and use:

| Setting | Value |
| --- | --- |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Dev command | `npm run dev` |
| Node version | `20` |
| Env vars | none required |

### 4.4 Self-hosting the production build

```bash
npm ci
npm run build:node
npm start            # serves the app bundle on $PORT (default 3000)
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
