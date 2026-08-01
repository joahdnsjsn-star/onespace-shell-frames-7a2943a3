import { useState, type ReactNode } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Chip } from "./ui";
import { OfflineBanner } from "./OfflineBanner";
import { BackdropFX, NexusLogo, ScrollProgress } from "./NexusFX";
import { ButlerDock } from "./ButlerDock";
import { CommandBar } from "./CommandBar";

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

export function TabBar() {
  return (
    <nav className="sticky bottom-0 z-30 border-t border-dim/70 glass pb-[env(safe-area-inset-bottom)]">
      <div className="scroll-x flex gap-1 px-2 py-2">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="group press flex min-w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-faint hover:bg-surface-3/60 hover:text-cyan"
            activeOptions={{ exact: t.to === "/" }}
            activeProps={{
              className:
                "bg-cyan/12 text-cyan shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cyan)_28%,transparent)]",
            }}
          >
            <t.icon size={19} strokeWidth={1.7} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
            <span className="label-mono text-[9px] leading-none">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function AppShell({
  title,
  subtitle,
  accentLabel,
  offline,
  children,
}: {
  title: string;
  subtitle?: string;
  accentLabel?: string;
  offline?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background sm:max-w-xl lg:max-w-2xl">
      <header className="sticky top-0 z-20 border-b border-dim/70 glass pt-[env(safe-area-inset-top)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full bg-ok pulse-dot" aria-hidden />
              <h1 className="truncate font-mono text-fluid-lg font-bold tracking-[0.12em]">{title}</h1>
            </div>
            {subtitle ? (
              <p className="mt-1 truncate text-fluid-xs leading-snug text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {accentLabel ? (
            <div className="shrink-0">
              <Chip accent="cyan">{accentLabel}</Chip>
            </div>
          ) : null}
        </div>
        <OfflineBanner online={!offline} />

      </header>

      <main
        key={title}
        className={cn(
          "rise-in nexus-grid flex-1 space-y-5 px-4 pb-12 pt-5 sm:space-y-6 sm:px-6 sm:pt-6",
        )}
      >
        {children}
      </main>

      <TabBar />
    </div>
  );
}
