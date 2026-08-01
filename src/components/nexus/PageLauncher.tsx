import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bot,
  Code2,
  Brain,
  BarChart3,
  Hammer,
  FolderOpen,
  Server,
  Palette,
  SlidersHorizontal,
  Rocket,
  ShieldCheck,
  FileText,
  Database,
  Lock,
  Bug,
  Search,
  History,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fx } from "@/lib/fx";

export type PageEntry = {
  to: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  accent: "cyan" | "neural" | "warn" | "ok" | "net" | "system" | "danger";
  /** Extra search terms so intent finds the page ("qr" → Connect). */
  keywords?: string;
};

export const PAGE_GROUPS: { group: string; pages: PageEntry[] }[] = [
  {
    group: "core",
    pages: [
      {
        to: "/",
        label: "Home",
        desc: "Live telemetry & core",
        icon: LayoutDashboard,
        accent: "cyan",
        keywords: "dashboard start overview status",
      },
      {
        to: "/butler",
        label: "Butler AI",
        desc: "Chat with your machine",
        icon: Bot,
        accent: "neural",
        keywords: "chat assistant ask voice talk prompt",
      },
      {
        to: "/scripts",
        label: "Scripts",
        desc: "Automation library",
        icon: Code2,
        accent: "ok",
        keywords: "forge automation macro run command library",
      },
      {
        to: "/knowledge",
        label: "Brain",
        desc: "Crawler graph & recall",
        icon: Brain,
        accent: "neural",
        keywords: "kb memory notes learn docs crawler graph knowledge index search",
      },
    ],
  },
  {
    group: "modules",
    pages: [
      {
        to: "/logs",
        label: "Logs",
        desc: "System event stream",
        icon: BarChart3,
        accent: "warn",
        keywords: "events history errors console trace",
      },
      {
        to: "/builder",
        label: "Builder",
        desc: "Visual flow composer",
        icon: Hammer,
        accent: "warn",
        keywords: "flow nodes compose create workflow",
      },
      {
        to: "/fileshare",
        label: "Fileshare",
        desc: "LAN transfer bridge",
        icon: FolderOpen,
        accent: "net",
        keywords: "vault files send transfer upload lan",
      },
      {
        to: "/connect",
        label: "Connect",
        desc: "Pair a new device",
        icon: Server,
        accent: "system",
        keywords: "pair qr scan link device server ip",
      },
    ],
  },
  {
    group: "system",
    pages: [
      {
        to: "/cosmetic",
        label: "Cosmetic",
        desc: "Theme & HUD density",
        icon: Palette,
        accent: "neural",
        keywords: "skins theme colour color appearance",
      },
      {
        to: "/settings",
        label: "Settings",
        desc: "Every configuration",
        icon: SlidersHorizontal,
        accent: "cyan",
        keywords: "config options preferences sound haptics voice",
      },
      {
        to: "/onboarding",
        label: "Onboarding",
        desc: "Replay setup sequence",
        icon: Rocket,
        accent: "ok",
        keywords: "setup tutorial walkthrough intro tips",
      },
    ],
  },
  {
    group: "legal & trust",
    pages: [
      {
        to: "/permissions",
        label: "Permissions",
        desc: "What the app may touch",
        icon: ShieldCheck,
        accent: "ok",
        keywords: "camera mic access grant android",
      },
      {
        to: "/security-trust",
        label: "Security & trust",
        desc: "How data is protected",
        icon: ShieldCheck,
        accent: "ok",
        keywords: "encryption safety trust",
      },
      {
        to: "/privacy-policy",
        label: "Privacy policy",
        desc: "What we never collect",
        icon: Lock,
        accent: "system",
        keywords: "gdpr data privacy policy",
      },
      {
        to: "/terms",
        label: "Terms",
        desc: "Terms of service",
        icon: FileText,
        accent: "system",
        keywords: "legal tos agreement",
      },
      {
        to: "/data-safety",
        label: "Data safety",
        desc: "Store disclosure",
        icon: Database,
        accent: "net",
        keywords: "playstore disclosure collection",
      },
      {
        to: "/crash-report",
        label: "Crash report",
        desc: "Diagnostics bundle",
        icon: Bug,
        accent: "danger",
        keywords: "debug diagnostics error report",
      },
    ],
  },
];

export const ALL_PAGES: PageEntry[] = PAGE_GROUPS.flatMap((g) => g.pages);

const ACCENT: Record<PageEntry["accent"], string> = {
  cyan: "text-cyan border-cyan/30 bg-cyan/10",
  neural: "text-neural border-neural/30 bg-neural/10",
  warn: "text-warn border-warn/30 bg-warn/10",
  ok: "text-ok border-ok/30 bg-ok/10",
  net: "text-net border-net/30 bg-net/10",
  system: "text-system border-system/30 bg-system/10",
  danger: "text-danger border-danger/30 bg-danger/10",
};

const RECENT_KEY = "nexus:hub-recent";
const MAX_RECENT = 4;

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((r) => typeof r === "string") : [];
  } catch {
    return [];
  }
}

/** Records a hub destination so muscle-memory routes surface as chips over time. */
export function rememberPage(to: string) {
  try {
    const next = [to, ...readRecent().filter((r) => r !== to)].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — recents are a nicety, never a requirement */
  }
}

export function PageLauncher({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setRecent(readRecent());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return null;
    return ALL_PAGES.filter((p) =>
      `${p.label} ${p.desc} ${p.keywords ?? ""} ${p.to}`.toLowerCase().includes(q),
    );
  }, [q]);

  const recentPages = useMemo(
    () =>
      recent
        .map((to) => ALL_PAGES.find((p) => p.to === to))
        .filter((p): p is PageEntry => Boolean(p)),
    [recent],
  );

  if (!open) return null;

  const go = (to: string) => {
    rememberPage(to);
    fx.select();
    onOpenChange(false);
  };

  const tile = (p: PageEntry) => (
    <Link
      key={p.to}
      to={p.to}
      activeOptions={{ exact: p.to === "/" }}
      onClick={() => go(p.to)}
      className="press lift flex items-start gap-2.5 rounded-2xl border border-dim/60 bg-surface-2/60 p-3 hover:border-cyan/30 hover:bg-surface-3/70"
      activeProps={{ className: "border-cyan/45 bg-cyan/8" }}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl border",
          ACCENT[p.accent],
        )}
      >
        <p.icon size={17} strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-snug text-balance">{p.label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
          {p.desc}
        </span>
      </span>
    </Link>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="All pages"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="scroll-y mx-auto flex h-dvh w-full max-w-lg flex-col sm:max-w-xl lg:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-dim/70 glass px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="label-mono text-cyan">all pages</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tap any module — or search by what it does
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                fx.close();
                onOpenChange(false);
              }}
              aria-label="Close page list"
              className="press grid size-9 shrink-0 place-items-center rounded-xl border border-dim/70 bg-surface-2/60 text-faint hover:border-cyan/40 hover:text-cyan"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-dim/70 bg-surface-2/60 px-3 py-2 focus-within:border-cyan/40">
            <Search size={15} className="shrink-0 text-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              inputMode="search"
              placeholder='Search pages — try "qr" or "theme"'
              aria-label="Search pages"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="press shrink-0 text-faint hover:text-cyan"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="nx-stagger space-y-5 px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4">
          {results ? (
            results.length ? (
              <section>
                <div className="label-mono mb-2 text-faint">
                  {results.length} match{results.length === 1 ? "" : "es"}
                </div>
                <div className="grid grid-cols-2 gap-2.5">{results.map(tile)}</div>
              </section>
            ) : (
              <p className="rounded-2xl border border-dim/60 bg-surface-2/50 p-4 text-center text-sm text-muted-foreground">
                Nothing matches “{query}”.
              </p>
            )
          ) : (
            <>
              {recentPages.length ? (
                <section>
                  <div className="label-mono mb-2 flex items-center gap-1.5 text-faint">
                    <History size={11} /> recent
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentPages.map((p) => (
                      <Link
                        key={p.to}
                        to={p.to}
                        activeOptions={{ exact: p.to === "/" }}
                        onClick={() => go(p.to)}
                        className="press inline-flex items-center gap-1.5 rounded-full border border-dim/60 bg-surface-2/60 px-3 py-1.5 text-xs font-medium hover:border-cyan/40 hover:text-cyan"
                      >
                        <p.icon size={13} strokeWidth={1.9} />
                        {p.label}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {PAGE_GROUPS.map((g) => (
                <section key={g.group}>
                  <div className="label-mono mb-2 text-faint">{g.group}</div>
                  <div className="grid grid-cols-2 gap-2.5">{g.pages.map(tile)}</div>
                </section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
