import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Card } from "./ui";

export function LegalDoc({
  title,
  updated,
  sections,
  footer,
}: {
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg sm:max-w-xl lg:max-w-2xl flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-dim/70 glass px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6">
        <Link
          to="/settings"
          className="flex items-center gap-1 label-mono text-muted-foreground hover:text-cyan"
        >
          <ChevronLeft size={14} /> back
        </Link>
        <h1 className="mt-2 font-mono text-fluid-lg font-bold tracking-widest">{title}</h1>
        <p className="text-[11px] text-muted-foreground">last updated {updated}</p>
      </header>

      <main className="flex-1 space-y-4 px-4 py-5 sm:px-6 [&>section]:cv-auto">
        {sections.map((s, i) => (
          <Card key={s.heading}>
            <div className="label-mono text-cyan">
              {String(i + 1).padStart(2, "0")} · {s.heading}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </Card>
        ))}
        {footer}
        <p className="pb-6 text-center text-[10px] text-faint">
          © 2026 Butler AI — all processing happens on hardware you own.
        </p>
      </main>
    </div>
  );
}
