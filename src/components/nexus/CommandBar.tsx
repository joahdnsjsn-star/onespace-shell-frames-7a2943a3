import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, CornerDownLeft, Command } from "lucide-react";
import { ALL_PAGES } from "./PageLauncher";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string };

export function CommandBar({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const all: Item[] = ALL_PAGES.map((p) => ({ to: p.to, label: p.label.toUpperCase() }));
    const needle = q.trim().toLowerCase();
    return needle ? all.filter((x) => x.label.toLowerCase().includes(needle) || x.to.includes(needle)) : all;
  }, [q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 px-4 pt-[18vh] backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div
        className="nx-pop w-full max-w-md overflow-hidden rounded-2xl border border-dim/70 glass shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-dim/60 px-3 py-2.5">
          <Search size={15} className="text-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setI(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setI((v) => (v + 1) % Math.max(1, items.length));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setI((v) => (v - 1 + items.length) % Math.max(1, items.length));
              } else if (e.key === "Enter") {
                const it = items[i];
                if (it) go(it.to);
              }
            }}
            placeholder="Jump to a module…"
            className="flex-1 bg-transparent text-fluid-sm text-foreground outline-none placeholder:text-faint"
          />
          <kbd className="label-mono rounded border border-dim/70 px-1.5 py-0.5 text-[9px] text-faint">ESC</kbd>
        </div>
        <div className="scroll-y max-h-[46dvh] p-1.5">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-fluid-xs text-faint">No module matches “{q}”.</p>
          ) : (
            items.map((it, idx) => (
              <button
                key={it.to}
                type="button"
                onMouseEnter={() => setI(idx)}
                onClick={() => go(it.to)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors",
                  idx === i ? "bg-cyan/12 text-cyan" : "text-foreground/80 hover:bg-surface-3/50",
                )}
              >
                <span className="label-mono text-[11px]">{it.label}</span>
                <span className="ml-auto font-mono text-[10px] text-faint">{it.to}</span>
                {idx === i ? <CornerDownLeft size={13} /> : null}
              </button>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-dim/60 px-3 py-1.5 label-mono text-[9px] text-faint">
          <Command size={11} /> K to toggle · ↑↓ navigate · ⏎ open
        </div>
      </div>
    </div>
  );
}
