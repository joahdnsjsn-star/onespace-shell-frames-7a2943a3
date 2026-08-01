import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
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
  RefreshCw,
  ArrowDown,
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
import { Defer } from "./Lazy";
import { useDeferredMount } from "@/lib/defer";
import { perfQuiet } from "@/lib/perf";
import { useAndroidBack, useDoubleBackToExit, usePullToRefresh } from "@/lib/android";

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
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/butler", label: "Butler", icon: Bot },
  { to: "/scripts", label: "Scripts", icon: Code2 },
  { to: "/settings", label: "Config", icon: SlidersHorizontal },
] as const;

/** Material 3 navigation bar: 5 fixed destinations, sliding active pill. */
export function TabBar({ onOpenPages, pagesOpen }: { onOpenPages: () => void; pagesOpen: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      data-coach="nav-bar"
      className="sticky bottom-0 z-30 border-t border-dim/70 glass hull-plate pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-stretch gap-0.5 px-1.5 pt-1">
        {PRIMARY.map((t) => {
          const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              data-active={active && !pagesOpen}
              aria-current={active ? "page" : undefined}
              className={cn("nav-slot", active && !pagesOpen ? "text-cyan" : "text-faint")}
              onClick={() => fx.tap()}
            >
              <span className="nx-pill" aria-hidden="true" />
              <t.icon size={21} strokeWidth={active ? 2.1 : 1.7} className="relative" />
              <span className="relative text-[10px] font-semibold leading-none tracking-wide">
                {t.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onOpenPages}
          aria-label="Open all pages"
          data-active={pagesOpen}
          className={cn("nav-slot", pagesOpen ? "text-cyan" : "text-faint")}
        >
          <span className="nx-pill" aria-hidden="true" />
          <LayoutGrid size={21} strokeWidth={pagesOpen ? 2.1 : 1.7} className="relative" />
          <span className="relative text-[10px] font-semibold leading-none tracking-wide">
            Pages
          </span>
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
      if (!seen && !calm) {
        perfQuiet(4000);
        setBooting(true);
      }
      window.sessionStorage.setItem("nexus:booted", "1");
    } catch {
      /* storage blocked — skip the splash */
    }
    return cleanup;
  }, []);
  const [pagesOpen, setPagesOpen] = useState(false);

  // Route swap = an expected burst of work. Silence the governor briefly so a
  // normal page transition can never fire a false "performance mode" toast.
  useEffect(() => {
    perfQuiet(900);
  }, [title]);

  // Overlays live in the bundle already; we just keep them out of the tree
  // until the app is idle — or instantly, the moment the user opens one.
  const overlaysReady = useDeferredMount({ force: cmdOpen || pagesOpen, timeout: 3000 });

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-lg flex-col sm:max-w-xl lg:max-w-2xl",
        fill ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      <Defer timeout={1800} skipOnLowTier>
        <BackdropFX />
      </Defer>
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
      {fill ? null : (
        <Defer timeout={4000}>
          <ButlerDock />
        </Defer>
      )}
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
      {overlaysReady ? (
        <>
          <CommandBar open={cmdOpen} onOpenChange={setCmdOpen} />
          <PageLauncher open={pagesOpen} onOpenChange={setPagesOpen} />
        </>
      ) : null}
    </div>
  );
}

