import { useEffect, useState, type ReactNode } from "react";
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
  Search,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fx } from "@/lib/fx";
import { primeAudio } from "@/lib/sound";
import { SplashScreen } from "./Mascot";
import { butlerSay } from "@/lib/voice";
import { Chip } from "./ui";
import { OfflineBanner } from "./OfflineBanner";
import { AnimatedTitle, BackdropFX, NexusLogo, ScrollProgress } from "./NexusFX";
import { ButlerDock } from "./ButlerDock";
import { CommandBar } from "./CommandBar";
import { PageLauncher } from "./PageLauncher";

export const TABS = [
  { to: "/", label: "HOME", icon: LayoutDashboard },
  { to: "/butler", label: "BUTLER", icon: Bot },
  { to: "/scripts", label: "SCRIPTS", icon: Code2 },
  { to: "/knowledge", label: "BRAIN", icon: Brain },
  { to: "/logs", label: "LOGS", icon: BarChart3 },
  { to: "/builder", label: "BUILD", icon: Hammer },
  { to: "/fileshare", label: "FILES", icon: FolderOpen },
  { to: "/connect", label: "LINK", icon: Server },
  { to: "/cosmetic", label: "SKIN", icon: Palette },
  { to: "/settings", label: "CONFIG", icon: SlidersHorizontal },
] as const;

/** Fixed 5-slot bar — no horizontal scrolling. Slot 5 opens the full page list. */
const PRIMARY = [
  { to: "/", label: "HOME", icon: LayoutDashboard },
  { to: "/butler", label: "BUTLER", icon: Bot },
  { to: "/scripts", label: "SCRIPTS", icon: Code2 },
  { to: "/settings", label: "CONFIG", icon: SlidersHorizontal },
] as const;

export function TabBar({ onOpenPages }: { onOpenPages: () => void }) {
  const item =
    "group press flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-faint hover:bg-surface-3/60 hover:text-cyan";
  return (
    <nav className="sticky bottom-0 z-30 border-t border-dim/70 glass hull-plate pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch gap-1 px-2 py-2">
        {PRIMARY.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={item}
            onClick={() => fx.tap()}
            activeOptions={{ exact: t.to === "/" }}
            activeProps={{
              className:
                "bg-cyan/12 text-cyan shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cyan)_28%,transparent)]",
            }}
          >
            <t.icon
              size={19}
              strokeWidth={1.7}
              className="transition-transform duration-200 group-hover:-translate-y-0.5"
            />
            <span className="label-mono text-[9px] leading-none">{t.label}</span>
          </Link>
        ))}
        <button type="button" onClick={onOpenPages} aria-label="Open all pages" className={item}>
          <LayoutGrid
            size={19}
            strokeWidth={1.7}
            className="transition-transform duration-200 group-hover:-translate-y-0.5"
          />
          <span className="label-mono text-[9px] leading-none">PAGES</span>
        </button>
      </div>
    </nav>
  );
}


export function AppShell({
  title,
  subtitle,
  accentLabel,
  offline,
  fill,
  children,
}: {
  title: string;
  subtitle?: string;
  accentLabel?: string;
  offline?: boolean;
  /** Locks the page to the viewport — no page scrolling; children own their own scroll areas. */
  fill?: boolean;
  children: ReactNode;
}) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [booting, setBooting] = useState(false);

  // Boot splash: client-only, once per browser session, never for reduced-motion users.
  useEffect(() => {
    const cleanup = primeAudio();
    try {
      const seen = window.sessionStorage.getItem("nexus:booted") === "1";
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!seen && !calm) setBooting(true);
      window.sessionStorage.setItem("nexus:booted", "1");
    } catch {
      /* storage blocked — skip the splash */
    }
    return cleanup;
  }, []);
  const [pagesOpen, setPagesOpen] = useState(false);

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-lg flex-col sm:max-w-xl lg:max-w-2xl",
        fill ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      <BackdropFX />
      <a href="#nexus-main" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-dim/70 glass hull-plate pt-[env(safe-area-inset-top)]">

        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-4 py-3 sm:px-6">
          <NexusLogo size={30} className="press" status={offline ? "offline" : "online"} />
          <AnimatedTitle title={title} subtitle={subtitle} online={!offline} />

          <div className="flex shrink-0 items-center gap-2">
            {accentLabel ? <Chip accent="cyan">{accentLabel}</Chip> : null}
            <button
              type="button"
              onClick={() => {
                fx.open();
                setCmdOpen(true);
              }}
              aria-label="Open command palette"
              className="press grid size-9 place-items-center rounded-xl border border-dim/70 bg-surface-2/60 text-faint hover:border-cyan/40 hover:text-cyan"
            >
              <Search size={16} />
            </button>
          </div>
        </div>
        <OfflineBanner online={!offline} />
        {fill ? null : <ScrollProgress />}
      </header>

      <main
        id="nexus-main"
        key={title}

        className={cn(
          "rise-in nexus-grid px-4 sm:px-6",
          fill
            ? "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden py-3"
            : "nx-stagger flex-1 space-y-5 pb-24 pt-5 sm:space-y-6 sm:pt-6",
        )}
      >
        {children}
      </main>

      <TabBar onOpenPages={() => setPagesOpen(true)} />
      {fill ? null : <ButlerDock />}
      {booting ? (
        <SplashScreen
          onDone={() => {
            setBooting(false);
            window.setTimeout(
              () =>
                butlerSay("All systems nominal. Butler online and standing by.", {
                  tone: "ok",
                  label: "ONLINE",
                  hold: 2400,
                }),
              700,
            );
          }}
        />
      ) : null}
      <CommandBar open={cmdOpen} onOpenChange={setCmdOpen} />
      <PageLauncher open={pagesOpen} onOpenChange={setPagesOpen} />
    </div>
  );
}

