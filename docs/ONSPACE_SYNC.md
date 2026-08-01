# GitHub → OnSpace.ai Sync Checklist

Butler AI NEXUS — web shell. Follow top to bottom; each step lists the
expected outcome so you can confirm before moving on.

---

## 0. Prerequisites

| Item | Value |
| --- | --- |
| Node | `22.x` (pinned in `.nvmrc`) |
| Package manager | `bun` (preferred) or `npm` |
| Repo visibility | public or private — both work with OnSpace |

---

## 1. Push the repo to GitHub

```bash
git init
git add -A
git commit -m "feat: Butler AI NEXUS shell"
git branch -M main
git remote add origin https://github.com/<you>/butler-ai-nexus.git
git push -u origin main
```

**Expected:** GitHub shows all files, and the **Actions** tab starts a run
named `CI` automatically (`.github/workflows/ci.yml`).

---

## 2. Confirm CI is green (automated)

`.github/workflows/ci.yml` runs on every push and PR:

1. `bun install --frozen-lockfile`
2. `bunx tsgo --noEmit` (type check)
3. `bun run build` (production build)

**Expected:** green check next to the commit. If it fails, fix locally with
the same three commands before continuing — OnSpace imports the same code.

---

## 3. CI gate

`.github/workflows/ci.yml` runs on every push: typecheck, lint, Android
permission parity, then the app bundle build. A red CI run means OnSpace will
fail the same way — fix it before importing.

---

## 4. Connect the repo in OnSpace.ai

1. Sign in at **onspace.ai** → **New Project → Import from GitHub**.
2. Authorize the OnSpace GitHub App; grant access to this repository only.
3. Pick the repo, branch `main`, root directory `/`.

**Expected:** OnSpace detects a Vite + TanStack Start project and pre-fills the
build settings below.

---

## 5. Build settings

This project builds **one target: the Android phone app**. There is no website
or desktop mode. `onspace.json` at the root is the machine-readable version of
this table.

| Field | Value |
| --- | --- |
| Target | Android phone (portrait, `com.butlerai.pc.automation`) |
| Framework preset | Vite / TanStack Start |
| Install command | `bun install` (or `npm install`) |
| Build command | `bun run build:node` |
| Output | `dist/server` (entry `dist/server/index.mjs`) + `dist/client` |
| Start command | `bun run start` (reads `$PORT`) |
| Node version | `22` (pinned in `.nvmrc`, `.node-version`, `engines`) |
| Permissions contract | `app.permissions.json` (checked in CI by `bun run parity`) |

**Expected:** first deploy finishes in ~1–2 min and OnSpace returns a live URL,
and every route deep-links correctly on reload.


---

## 6. Environment variables

This shell is **fully offline** — it ships with **zero required variables**.
Everything below is optional and only needed when you wire real services.
Copy names from `.env.example`.

| Variable | Required | Where it is read | Purpose |
| --- | --- | --- | --- |
| `VITE_APP_NAME` | no | client | Overrides the header wordmark |
| `VITE_API_BASE_URL` | no | client | Base URL of your Butler PC agent |
| `VITE_WS_URL` | no | client | WebSocket for live telemetry |
| `VITE_ENABLE_ANALYTICS` | no | client | `true` / `false` |

Rules:

- Anything the browser reads **must** start with `VITE_`.
- Never put a private key in a `VITE_` variable — it ships to the browser.
- Server-only secrets go in OnSpace → **Project → Settings → Environment
  Variables** (unprefixed) and are read only in server code.
- Add variables in **both** the Preview and Production environments.

**Expected:** after saving variables, trigger **Redeploy** — Vite inlines env
values at build time, so a rebuild is required for changes to take effect.

---

## 7. Turn on auto-sync (automated)

In OnSpace → **Project → Settings → Git**:

- Production branch: `main`
- Auto-deploy on push: **enabled**
- Preview deploys for pull requests: **enabled**

**Expected:** every `git push` to `main` redeploys production within a minute;
every PR gets its own preview URL commented on the PR.

---

## 8. Post-deploy verification

Open the live URL and confirm:

- [ ] Home dashboard renders with live-animating telemetry tiles
- [ ] Bottom bar shows 5 slots; **PAGES** opens the full launcher grid
- [ ] All 17 routes load with no console errors
- [ ] Deep-linking works — reload directly on `/settings` (SPA fallback)
- [ ] Settings toggles persist after a page refresh (localStorage)
- [ ] No horizontal scrolling at 320 px width
- [ ] Butler dock opens; `Ctrl/⌘ + K` opens the command bar

**Expected:** all boxes checked. Any 404 on refresh means SPA fallback in
step 5 is off.

---

## 9. Rollback

OnSpace keeps every deployment. **Deployments → … → Promote to Production**
restores an earlier build instantly; no Git revert needed.

---

## Quick local commands

```bash
bun install          # install
bun run dev          # dev server on :8080
bunx tsc --noEmit    # type check
bun run build:node   # Node SSR build  -> dist/server/index.mjs
bun run start        # run the Node SSR build (honours $PORT)
```

## Adaptive performance (v17)

The app ships a client-side performance governor (`src/lib/perf.ts`):

- samples real FPS, long tasks (>50ms) and JS heap once per second on a single rAF loop;
- writes `high | balanced | low` to `<html data-perf>`, which CSS uses to shed starfield,
  orbs, backdrop blur and infinite animations progressively;
- steps back up automatically after 8 healthy seconds;
- Settings → Performance lets users pin a tier (`auto/high/balanced/low`).

Host CPU/RAM pressure raises `nexus:host-alert`, shown as a rate-limited toast.
The PC bridge (`butler_server.py`) is offered as an in-app download on Link and in
Settings → PC Server. It has no web console by design — this app is the only UI.

## Permission parity (required for 100% OnSpace compatibility)

OnSpace.ai builds the native shell from the repo. To keep the web shell and the
native build in sync:

1. `app.permissions.json` at the repo root is the machine-readable contract.
2. Copy `android.permissions` -> `expo.android.permissions` and
   `android.blockedPermissions` -> `expo.android.blockedPermissions` in the native `app.json`.
3. Copy `ios.NSCameraUsageDescription` into `expo.ios.infoPlist`.
4. The web/PWA side is already aligned: `public/manifest.webmanifest` declares
   `permissions_policy` (camera self-only; microphone, geolocation and interest-cohort disabled).
5. Verify in-app at `/permissions` — it reads live browser permission state and lists the
   exact native strings next to each entry.

Expected outcome after import: build command `bun run build`, output `dist`, Node 22,
no environment variables required (the shell has no backend), and the permission prompt
list on device matches the table in `docs/PERMISSIONS.md` exactly.
