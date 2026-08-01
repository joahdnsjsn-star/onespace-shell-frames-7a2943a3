# Butler AI — Codebase Index (read this first)

> OnSpace.ai convention file. This repo is the **Android-focused web shell** of
> Butler AI: PC Automation. It is **not** an Expo/React Native project — do not
> run Metro, EAS, or `expo` commands against it. OnSpace wraps this build as a
> Trusted Web Activity / PWA-style Android app.

## Identity (must match the native Expo `app.json`)

| Field | Value |
| --- | --- |
| App name | Butler AI |
| Slug | butler-ai |
| Version | 5.0.9 |
| Android package | com.butlerai.pc.automation |
| Deep-link scheme | butlerai |
| Orientation | portrait, dark UI |
| Theme / background | `#070a10` (shell), native splash `#0C0E14` |

Machine-readable copies live in `onspace.json` (build contract) and
`app.permissions.json` (permission contract). `bun run parity` fails the build
if either drifts from the native `app.json`.

## Build contract

| Field | Value |
| --- | --- |
| Framework | Vite 8 + TanStack Start (React 19) |
| Node | 22 (`.nvmrc`, `.node-version`, `engines`) |
| Package manager | bun |
| Install | `bun install` |
| Build | `bun run build:node` |
| Output | `dist/server/index.mjs` + `dist/client` |
| Start | `bun run start` (honours `$PORT`, default 3000) |
| Health check | `GET /api/health` |
| Env vars required | none (fully offline shell) |

Full gate before pushing: `bun run onspace:verify`
(typecheck → lint → permission parity → Node SSR build).

## Layout

| Path | What lives there |
| --- | --- |
| `src/routes/` | 18 file-based routes; `api/health.ts` is the deploy probe |
| `src/components/nexus/` | The whole HUD UI kit (shell, dock, charts, instruments) |
| `src/lib/` | Bridge, autoconnect, discovery, vault, logger, perf, knowledge |
| `scripts/check-native-parity.mjs` | Permission/identity parity checker |
| `docs/ONSPACE_SYNC.md` | Step-by-step import + deploy checklist |
| `docs/ONSPACE_PARITY.md` | Exactly what is and isn't shared with the Expo app |
| `docs/native/` | Copies of the native repo's legal / Play Store docs |

## Rules for any AI or contributor

1. No React Native imports. This side is DOM React; the two codebases cannot
   share component files.
2. Never edit `src/routeTree.gen.ts` — it is generated from `src/routes/`.
3. Any permission change goes into `app.permissions.json` **and** the native
   `app.json`, then `bun run parity` must pass.
4. Keep `/api/health` responding 200 — OnSpace uses it to verify deploys.
5. No secrets in the repo, `.md` files included. Browser-visible config must be
   `VITE_`-prefixed; anything else is server-only.
