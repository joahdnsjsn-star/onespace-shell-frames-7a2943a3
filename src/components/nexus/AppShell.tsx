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
import { LinkPill } from "./LinkPill";
import { AnimatedTitle, BackdropFX, NexusLogo, ScrollProgress } from "./NexusFX";
import { ButlerDock } from "./ButlerDock";
import { CommandBar } from "./CommandBar";
import { ALL_PAGES, PageLauncher, rememberPage } from "./PageLauncher";
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

/**
 * Material 3 navigation bar: 5 fixed destinations, sliding active pill.
 * Slot 5 is state-aware — while you're on a page that lives behind the hub it
 * morphs into that page's own icon/label, so the collapsed row never hides
 * where you actually are.
 */
export function TabBar({
  onOpenPages,
  pagesOpen,
}: {
  onOpenPages: () => void;
  pagesOpen: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const onPrimary = PRIMARY.some((t) =>
    t.to === "/" ? pathname === "/" : pathname.startsWith(t.to),
  );
  const hubPage = onPrimary
    ? undefined
    : ALL_PAGES.find((p) => p.to !== "/" && pathname.startsWith(p.to));
  const HubIcon = hubPage?.icon ?? LayoutGrid;
  const hubActive = pagesOpen || Boolean(hubPage);

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
          aria-label={hubPage ? `${hubPage.label} — open all pages` : "Open all pages"}
          data-active={hubActive}
          className={cn("nav-slot", hubActive ? "text-cyan" : "text-faint")}
        >
          <span className="nx-pill" aria-hidden="true" />
          <HubIcon size={21} strokeWidth={hubActive ? 2.1 : 1.7} className="relative" />
          <span className="relative max-w-full truncate text-[10px] font-semibold leading-none tracking-wide">
            {hubPage?.label ?? "Pages"}
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
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Route swap = an expected burst of work. Silence the governor briefly so a
  // normal page transition can never fire a false "performance mode" toast.
  useEffect(() => {
    perfQuiet(900);
  }, [title]);

  // Adaptive recents: every visit feeds the hub's "recent" chip row, so the
  // routes you actually use get faster to reach over time.
  useEffect(() => {
    rememberPage(pathname);
  }, [pathname]);

  // Hardware / gesture back closes the top-most sheet before it ever leaves
  // the app — exactly how an Android activity stack behaves.
  useAndroidBack(cmdOpen, () => setCmdOpen(false));
  useAndroidBack(pagesOpen, () => setPagesOpen(false));
  const exitArmed = useDoubleBackToExit(!cmdOpen && !pagesOpen);

  // Pull-to-refresh on scrolling pages.
  const ptr = usePullToRefresh(
    async () => {
      fx.success();
      perfQuiet(1200);
      await router.invalidate();
      await new Promise((r) => window.setTimeout(r, 420));
    },
    { enabled: !fill },
  );

  // Overlays live in the bundle already; we just keep them out of the tree
  // until the app is idle — or instantly, the moment the user opens one.
  const overlaysReady = useDeferredMount({ force: cmdOpen || pagesOpen, timeout: 3000 });

  return (
    <div
      className={cn(
        // Phone-only form factor: one fixed handset column, never a desktop
        // page. On anything wider than a phone the column is framed instead
        // of stretched, so every layout is the layout that ships on Android.
        "device-column relative mx-auto flex w-full flex-col",
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
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/60 to-transparent"
        />
        <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-2.5 sm:px-6">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-cyan/25 bg-surface-2/50 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--cyan)_18%,transparent)]">
            <NexusLogo size={28} className="press" status={offline ? "offline" : "online"} />
          </span>
          <AnimatedTitle title={title} subtitle={subtitle} online={!offline} />

          <div className="flex shrink-0 items-center gap-1.5">
            {accentLabel ? <Chip accent="cyan">{accentLabel}</Chip> : null}
            <LinkPill />
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

      {/* Material pull-to-refresh indicator — rides the finger, spins on release. */}
      {!fill && (ptr.pull > 0 || ptr.refreshing) ? (
        <div
          className="nx-ptr"
          data-spin={ptr.refreshing}
          style={{
            top: `calc(env(safe-area-inset-top) + ${ptr.pull}px)`,
            transform: `translate(-50%, -50%) rotate(${ptr.pull * 3}deg)`,
            opacity: Math.min(1, ptr.pull / 40 + (ptr.refreshing ? 1 : 0)),
          }}
        >
          {ptr.refreshing ? (
            <RefreshCw size={16} />
          ) : (
            <ArrowDown size={16} className={ptr.armed ? "text-ok" : undefined} />
          )}
        </div>
      ) : null}

      <main
        id="nexus-main"
        key={title}
        style={ptr.pull ? { transform: `translateY(${ptr.pull}px)` } : undefined}
        className={cn(
          "axis-in nexus-grid px-4 transition-transform duration-200 sm:px-6",
          fill
            ? "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden py-3"
            : "nx-stagger flex-1 space-y-5 pb-24 pt-5 sm:space-y-6 sm:pt-6",
        )}
      >
        {children}
      </main>

      <TabBar onOpenPages={() => setPagesOpen(true)} pagesOpen={pagesOpen} />
      {fill ? null : (
        <Defer timeout={4000}>
          <ButlerDock />
        </Defer>
      )}

      {/* Android "press back again to exit" snackbar. */}
      {exitArmed ? (
        <div
          role="status"
          className="snackbar pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-40 mx-auto w-fit max-w-[90vw] rounded-xl border border-dim/70 bg-surface-2/95 px-4 py-2.5 text-sm text-foreground shadow-lg backdrop-blur"
        >
          Press back again to exit
        </div>
      ) : null}

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
