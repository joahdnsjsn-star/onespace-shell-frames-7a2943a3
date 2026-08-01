import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Code2, Play, Plus, Search, Terminal, Trash2, Undo2 } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Chip, IconBadge, Row } from "@/components/nexus/ui";
import { cn } from "@/lib/utils";
import { Coach } from "@/components/nexus/Coach";

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

const FILTERS = ["all", "system", "files", "media", "network"] as const;

const ACCENTS = ["system", "cyan", "neural", "net"] as const;
const accentFor = (id: string) =>
  ACCENTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % ACCENTS.length]!;

const COACH = [
  {
    target: "scripts-search",
    title: "find any script",
    body: "Start typing and your PC's library filters as you go — name, tag or category.",
  },
  {
    target: "scripts-filters",
    title: "filter by category",
    body: "Tap a chip to narrow the library in one press.",
  },
  {
    target: "scripts-list",
    title: "run or hide",
    body: "Green play runs the script on your paired PC; red bin hides it from this list.",
  },
  {
    target: "scripts-console",
    title: "live output & undo",
    body: "Output lands in this console. Undo rolls back the last run, or restores a hidden script.",
  },
];

function Scripts() {
  const { status, paired } = useBridge();
  const [scripts, setScripts] = useState<LibraryScript[]>([]);
  const [hidden, setHidden] = useState<{ item: LibraryScript; index: number }[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [out, setOut] = useState<string[]>(["> waiting for execution…"]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [lastUndoId, setLastUndoId] = useState<string | null>(null);

  const log = useCallback((...lines: string[]) => {
    setOut((o) => [...o, ...lines].slice(-80));
  }, []);

  // Pull the real library from the PC whenever the link comes up.
  useEffect(() => {
    if (status !== "online") return;
    let alive = true;
    void fetchLibrary()
      .then((list) => {
        if (alive) setScripts(list);
      })
      .catch((err: unknown) => {
        if (alive) log(`! library unavailable: ${(err as Error).message}`);
      });
    return () => {
      alive = false;
    };
  }, [log, status]);

  const q = query.trim().toLowerCase();
  const visible = scripts.filter(
    (s) =>
      (filter === "all" || s.category.toLowerCase().includes(filter)) &&
      (!q ||
        s.name.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))),
  );

  const remove = useCallback((id: string) => {
    setScripts((list) => {
      const index = list.findIndex((s) => s.id === id);
      if (index < 0) return list;
      setHidden((t) => [...t, { item: list[index]!, index }]);
      return list.filter((_, i) => i !== index);
    });
  }, []);

  const undo = useCallback(() => {
    // Rolling back a real run always wins over un-hiding a row.
    if (lastUndoId) {
      const id = lastUndoId;
      setLastUndoId(null);
      log(`> undo ${id}`);
      void undoRun(id)
        .then((r) => log(r.output || (r.ok ? "  rolled back" : "  undo refused")))
        .catch((err: unknown) => log(`! ${(err as Error).message}`));
      return;
    }
    setHidden((t) => {
      const last = t[t.length - 1];
      if (!last) return t;
      setScripts((list) => {
        const next = [...list];
        next.splice(Math.min(last.index, next.length), 0, last.item);
        return next;
      });
      return t.slice(0, -1);
    });
  }, [lastUndoId, log]);

  const run = useCallback(
    (s: LibraryScript) => {
      if (busy) return;
      fx.tap();
      setBusy(s.id);
      log(`> run ${s.name}`);
      void runScript(s.id)
        .then((r) => {
          log(r.output || (r.ok ? "  done" : "  failed"));
          setLastUndoId(r.undoId ?? null);
        })
        .catch((err: unknown) => {
          const message =
            err instanceof BridgeError && err.code === "no-config"
              ? "  no PC paired — open the LINK page first"
              : `! ${(err as Error).message}`;
          log(message);
        })
        .finally(() => setBusy(null));
    },
    [busy, log],
  );


  return (
    <AppShell title="SCRIPTS" subtitle="local automation library" accentLabel={`${visible.length}/${scripts.length}`} fill>
      <Coach id="scripts-lib" steps={COACH} />

      <div className="shrink-0 space-y-3">
        <div
          data-coach="scripts-search"
          className="flex items-center gap-2 rounded-xl border border-dim bg-surface-2 px-3 py-2 focus-within:border-cyan/55"
        >
          <Search size={16} className="shrink-0 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scripts…"
            aria-label="Search scripts"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-faint"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="press label-mono shrink-0 rounded-md border border-dim bg-surface-3 px-2 py-1 text-[10px] text-faint"
            >
              clear
            </button>
          ) : null}
          <button type="button" aria-label="Add script" className="press shrink-0">
            <IconBadge accent="cyan" size={30}>
              <Plus size={14} />
            </IconBadge>
          </button>
        </div>
        <div data-coach="scripts-filters" className="scroll-x -mx-4 flex gap-2 px-4 sm:-mx-6 sm:px-6">
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
      <div data-coach="scripts-list" className="scroll-y min-h-0 flex-1 space-y-2 pr-0.5">
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
            {q ? `Nothing matches “${query}”.` : "No scripts match this filter."}
          </p>
        ) : null}
      </div>

      {/* console + undo — pinned, no page scroll */}
      <div data-coach="scripts-console" className="shrink-0 space-y-2">
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
