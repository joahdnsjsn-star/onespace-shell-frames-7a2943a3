import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Code2, Play, Plus, Search, Terminal, Trash2, Undo2 } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Chip, IconBadge, Row } from "@/components/nexus/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scripts")({
  head: () => ({
    meta: [
      { title: "Scripts — Butler AI NEXUS" },
      {
        name: "description",
        content: "Library of local automation scripts with run history and a live output console.",
      },
      { property: "og:title", content: "Scripts — NEXUS" },
      {
        property: "og:description",
        content: "Run your own PowerShell, Bash and Python scripts from your phone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Scripts,
});

type Script = { name: string; lang: string; accent: "system" | "cyan" | "neural" | "net" };

const SEED: Script[] = [
  { name: "backup_docs.ps1", lang: "powershell", accent: "system" },
  { name: "clean_temp.sh", lang: "bash", accent: "cyan" },
  { name: "render_queue.py", lang: "python", accent: "neural" },
  { name: "wake_nas.ps1", lang: "powershell", accent: "net" },
  { name: "sync_photos.py", lang: "python", accent: "neural" },
  { name: "restart_spooler.ps1", lang: "powershell", accent: "system" },
];

const FILTERS = ["all", "powershell", "python", "bash"] as const;

function Scripts() {
  const [scripts, setScripts] = useState<Script[]>(SEED);
  const [trash, setTrash] = useState<{ item: Script; index: number }[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [out, setOut] = useState<string[]>(["> waiting for execution…"]);

  const visible = scripts.filter((s) => filter === "all" || s.lang === filter);

  const remove = useCallback((name: string) => {
    setScripts((list) => {
      const index = list.findIndex((s) => s.name === name);
      if (index < 0) return list;
      setTrash((t) => [...t, { item: list[index]!, index }]);
      return list.filter((_, i) => i !== index);
    });
  }, []);

  const undo = useCallback(() => {
    setTrash((t) => {
      const last = t[t.length - 1];
      if (!last) return t;
      setScripts((list) => {
        const next = [...list];
        next.splice(Math.min(last.index, next.length), 0, last.item);
        return next;
      });
      return t.slice(0, -1);
    });
  }, []);

  const run = useCallback((name: string) => {
    setOut((o) => [...o.slice(-40), `> run ${name}`, "  simulated — no host attached"]);
  }, []);

  return (
    <AppShell title="SCRIPTS" subtitle="local automation library" accentLabel={`${scripts.length} loaded`} fill>
      <div className="shrink-0 space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-dim bg-surface-2 px-3 py-2.5">
          <Search size={16} className="text-faint" />
          <span className="flex-1 text-sm text-muted-foreground">Search scripts…</span>
          <IconBadge accent="cyan" size={30}>
            <Plus size={14} />
          </IconBadge>
        </div>
        <div className="scroll-x -mx-4 flex gap-2 px-4 sm:-mx-6 sm:px-6">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className="press shrink-0">
              <span className={cn(filter === f ? "" : "opacity-55")}>
                <Chip accent={f === "all" ? "cyan" : f === "python" ? "neural" : f === "bash" ? "net" : "system"}>
                  {f}
                </Chip>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* library — the only scrolling region */}
      <div className="scroll-y min-h-0 flex-1 space-y-2 pr-0.5">
        {visible.map((s) => (
          <Row
            key={s.name}
            title={<span className="font-mono">{s.name}</span>}
            sub={`${s.lang} · never run`}
            left={
              <IconBadge accent={s.accent} size={34}>
                <Code2 size={16} />
              </IconBadge>
            }
            right={
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Delete ${s.name}`}
                  onClick={() => remove(s.name)}
                  className="press grid size-8 place-items-center rounded-lg border border-danger/35 bg-danger/10 text-danger"
                >
                  <Trash2 size={13} />
                </button>
                <button
                  type="button"
                  aria-label={`Run ${s.name}`}
                  onClick={() => run(s.name)}
                  className="press grid size-8 place-items-center rounded-lg border border-cyan/40 bg-cyan/10 text-cyan"
                >
                  <Play size={13} />
                </button>
              </span>
            }
          />
        ))}
        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-dim/70 p-6 text-center text-xs text-muted-foreground">
            No scripts match this filter.
          </p>
        ) : null}
      </div>

      {/* console + undo — pinned, no page scroll */}
      <div className="shrink-0 space-y-2">
        <div className="rounded-xl border border-dim/60 bg-surface-2 p-3">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-system" />
            <span className="label-mono text-muted-foreground">stdout</span>
          </div>
          <pre className="scroll-y mt-2 max-h-20 whitespace-pre-wrap break-words rounded-lg border border-dim/60 bg-background p-2.5 font-mono text-[11px] text-faint">
{out.join("\n")}
          </pre>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Chip accent="warn" dot>
            {trash.length ? `${trash.length} removed` : "library synced"}
          </Chip>
          <button
            type="button"
            onClick={undo}
            disabled={!trash.length}
            className="press inline-flex items-center gap-1.5 rounded-lg border border-warn/40 bg-warn/12 px-3 py-1.5 label-mono text-[10px] text-warn disabled:opacity-40"
          >
            <Undo2 size={12} /> undo
          </button>
        </div>
      </div>
    </AppShell>
  );
}
