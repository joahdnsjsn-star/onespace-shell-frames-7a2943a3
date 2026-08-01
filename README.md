# Butler AI — NEXUS (Web Shell)

A dark, HUD-style command-centre UI shell for **Butler AI NEXUS** — a local-PC assistant.
This repository contains the **visual shell only**: every screen, component and interaction
state is built, but nothing is wired to a backend.

Built with **TanStack Start (React 19) + Vite + Tailwind CSS v4 + TypeScript**.

---

## Quick start

```bash
# install (npm, pnpm, bun or yarn all work)
npm install

# dev server -> http://localhost:8080
npm run dev

# production build
npm run build

# preview the production build
npm run preview

# lint
npm run lint
```

Node **20+** is required (see `.nvmrc`).

## Deploying / importing

This project is a standard Vite + TanStack Start app, so it imports cleanly into
GitHub, OnSpace.ai, Vercel, Netlify, Cloudflare or any Node host.

| Setting        | Value           |
| -------------- | --------------- |
| Install        | `npm install`   |
| Build          | `npm run build` |
| Output dir     | `dist`          |
| Dev command    | `npm run dev`   |
| Node version   | `20`            |

No environment variables are required to run the shell. Copy `.env.example` to
`.env` if you later add keys.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Home telemetry dashboard |
| `/onboarding` | 10-step initialisation flow |
| `/butler` | Butler AI chat |
| `/scripts` | Automation script library + console |
| `/knowledge` | Neural knowledge base |
| `/logs` | Event stream + filters |
| `/builder` | Visual automation composer |
| `/fileshare` | LAN file bridge |
| `/connect` | Device pairing / QR |
| `/cosmetic` | Theme + HUD density |
| `/settings` | Configuration hub |
| `/components` | Full component gallery |
| `/privacy-policy`, `/terms`, `/data-safety`, `/security-trust`, `/crash-report` | Legal & utility docs |

## Project structure

```
src/
  routes/                 # file-based routes (TanStack Router)
  components/
    nexus/
      AppShell.tsx        # header, tab bar, backdrop, dock, palette
      NexusFX.tsx         # animated SVG logo, ambient backdrop, scroll meter
      ButlerDock.tsx      # floating AI chat dock
      CommandBar.tsx      # Cmd/Ctrl+K command palette
      OfflineBanner.tsx
      LegalDoc.tsx
      ui.tsx              # design-system primitives
    ui/                   # shadcn primitives
  styles.css              # design tokens, utilities, animations
```

## Design system

All colour, elevation and motion values live as tokens in `src/styles.css`
(OKLCH). Never hardcode colours in components — use the semantic tokens
(`cyan`, `ok`, `warn`, `danger`, `neural`, `system`, `net`, `surface*`, `dim`, `faint`).

## Keyboard

- `Cmd/Ctrl + K` — command palette
- `Esc` — close palette / chat dock
- `Enter` — send in Butler dock (`Shift+Enter` for newline)

## License

MIT — see [LICENSE](./LICENSE).
