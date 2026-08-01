// Static-site export for hosts that can only serve files
// (OnSpace.ai static hosting, GitHub Pages, any CDN bucket).
//
// Why this exists: `vite build` emits `dist/client` (assets, no HTML) plus
// `dist/server` (an SSR server). Serving `dist/client` alone renders a blank
// page, because the TanStack Start client entry hydrates server-rendered
// markup instead of mounting into an empty body.
//
// So: boot the real Node SSR server, crawl every route, and write the returned
// HTML into `dist/static`. Each page keeps its real per-route <title>/meta,
// and a `404.html` + `_redirects` fallback covers deep links.
//
// Run it through `npm run build:static`, which first builds with
// NITRO_PRESET=node-server so `dist/server/index.mjs` is a plain Node server.
import { spawn } from "node:child_process";
import { cpSync, mkdirSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const PORT = Number(process.env["PRERENDER_PORT"] ?? 41730);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const ROOT = process.cwd();
const OUT = resolve(ROOT, "dist/static");
const CLIENT = resolve(ROOT, "dist/client");
const SERVER_ENTRY = resolve(ROOT, "dist/server/index.mjs");
const ROUTES_DIR = resolve(ROOT, "src/routes");

if (!existsSync(CLIENT) || !existsSync(SERVER_ENTRY)) {
  console.error("[prerender] dist/ missing — run `npm run build:node` first.");
  process.exit(1);
}

// Derive routes from the file-based router: dots -> slashes, `index` -> "/".
const routes = [
  "/",
  ...readdirSync(ROUTES_DIR)
    .filter((f) => f.endsWith(".tsx") && !f.startsWith("_"))
    .map((f) => f.replace(/\.tsx$/, ""))
    .filter((n) => n !== "index")
    .map((n) => "/" + n.replace(/\./g, "/")),
];

const server = spawn(process.execPath, [SERVER_ENTRY], {
  stdio: ["ignore", "ignore", "inherit"],
  env: { ...process.env, NODE_ENV: "production", PORT: String(PORT), HOST: "127.0.0.1" },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${ORIGIN}/`);
      if (res.ok) return true;
    } catch {
      /* not listening yet */
    }
    await sleep(500);
  }
  return false;
}

try {
  if (!(await waitForServer())) throw new Error(`SSR server never answered on ${ORIGIN}`);

  mkdirSync(OUT, { recursive: true });
  cpSync(CLIENT, OUT, { recursive: true });

  let home = "";
  for (const route of routes) {
    const res = await fetch(ORIGIN + route, { headers: { accept: "text/html" } });
    if (!res.ok) throw new Error(`${route} -> HTTP ${res.status}`);
    const html = await res.text();
    if (route === "/") {
      home = html;
      writeFileSync(join(OUT, "index.html"), html);
    } else {
      const dir = join(OUT, route);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "index.html"), html);
      // Also emit `/route.html` for hosts without directory-index rewriting.
      writeFileSync(join(OUT, `${route.replace(/^\//, "")}.html`), html);
    }
  }

  writeFileSync(join(OUT, "404.html"), home);
  writeFileSync(join(OUT, "_redirects"), "/*    /index.html   200\n");
  writeFileSync(join(OUT, ".nojekyll"), "");

  console.log(`[prerender] wrote ${routes.length} static pages to dist/static`);
} catch (error) {
  console.error("[prerender]", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
