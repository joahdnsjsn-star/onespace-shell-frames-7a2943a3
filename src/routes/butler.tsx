import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Mic, Paperclip, SendHorizonal, Undo2, User, Keyboard, Square } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Chip, IconBadge } from "@/components/nexus/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/butler")({
  head: () => ({
    meta: [
      { title: "Butler Chat — Butler AI NEXUS" },
      { name: "description", content: "Conversational control surface for your paired PC." },
      { property: "og:title", content: "Butler Chat — NEXUS" },
      { property: "og:description", content: "Talk to your local machine in plain language." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Butler,
});

const SUGGESTIONS = [
  "Show me disk usage",
  "Close all Chrome windows",
  "Summarise today's logs",
  "Copy clipboard from PC",
];

type Msg = { id: number; role: "user" | "bot"; text: string };

const SEED: Msg[] = [
  {
    id: 1,
    role: "bot",
    text: "Bridge connected. Ask me anything about this machine — I run locally and never leave your LAN.",
  },
  { id: 2, role: "user", text: "What's eating my memory right now?" },
  {
    id: 3,
    role: "bot",
    text: "Top consumer is chrome.exe at 3.4 GB across 14 renderer processes, then Photoshop at 1.9 GB.",
  },
];

function Butler() {
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [undone, setUndone] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [talking, setTalking] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [draft, setDraft] = useState("");
  const idRef = useRef(100);
  const endRef = useRef<HTMLDivElement>(null);

  const push = useCallback((text: string) => {
    if (!text.trim()) return;
    const mine: Msg = { id: ++idRef.current, role: "user", text: text.trim() };
    setMsgs((m) => [...m, mine]);
    setUndone([]);
    setDraft("");
    setTyping(true);
    window.setTimeout(() => {
      setMsgs((m) => [
        ...m,
        {
          id: ++idRef.current,
          role: "bot",
          text: "Shell offline — this build is a visual prototype, so responses are simulated.",
        },
      ]);
      setTyping(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }, 700);
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  }, []);

  const undo = useCallback(() => {
    setMsgs((m) => {
      if (m.length <= 1) return m;
      const trailing: Msg[] = [];
      const next = [...m];
      // pull back the last exchange (assistant reply + the user turn that caused it)
      while (next.length > 1 && next[next.length - 1]!.role === "bot") {
        trailing.unshift(next.pop()!);
      }
      if (next.length > 1 && next[next.length - 1]!.role === "user") {
        trailing.unshift(next.pop()!);
      }
      setUndone(trailing);
      return next;
    });
  }, []);

  const redo = useCallback(() => {
    if (!undone.length) return;
    setMsgs((m) => [...m, ...undone]);
    setUndone([]);
  }, [undone]);

  return (
    <AppShell title="BUTLER" subtitle="neural command interface" accentLabel="ai ready" fill>
      {/* transcript — the only scroll region on this page */}
      <div className="scroll-y min-h-0 flex-1 space-y-3 pr-0.5">
        {msgs.map((m) =>
          m.role === "bot" ? (
            <div key={m.id} className="flex gap-2">
              <IconBadge accent="neural" size={34}>
                <Bot size={16} />
              </IconBadge>
              <div className="nx-pop max-w-[84%] rounded-xl rounded-tl-sm border border-dim/60 bg-surface-2 p-3 text-sm leading-relaxed">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end gap-2">
              <div className="nx-pop max-w-[84%] rounded-xl rounded-tr-sm bg-cyan px-3 py-2 text-sm leading-relaxed text-primary-foreground">
                {m.text}
              </div>
              <IconBadge accent="cyan" size={34}>
                <User size={16} />
              </IconBadge>
            </div>
          ),
        )}

        {typing ? (
          <div className="flex gap-2">
            <IconBadge accent="neural" size={34}>
              <Bot size={16} />
            </IconBadge>
            <div className="flex items-center gap-1.5 rounded-xl rounded-tl-sm border border-dim/60 bg-surface-2 px-3 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-full bg-neural nx-typing"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {/* suggestions rail — horizontal, never grows the page */}
      <div className="scroll-x -mx-4 flex shrink-0 gap-2 px-4 pb-0.5 sm:-mx-6 sm:px-6">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => push(s)}
            className="press shrink-0 whitespace-nowrap rounded-full border border-dim bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground hover:border-cyan/40 hover:text-cyan"
          >
            {s}
          </button>
        ))}
      </div>

      {/* TALK — the headline action, impossible to miss */}
      <div className="shrink-0 space-y-2">
        <button
          type="button"
          onClick={() => setTalking((t) => !t)}
          aria-pressed={talking}
          className={cn(
            "press relative grid w-full place-items-center gap-2 overflow-hidden rounded-2xl border-2 py-4 transition-colors",
            talking
              ? "border-danger/70 bg-danger/15 text-danger"
              : "border-cyan/60 bg-cyan/12 text-cyan shadow-[0_14px_40px_-20px_var(--cyan)]",
          )}
        >
          <span
            className={cn(
              "grid size-14 place-items-center rounded-full border-2",
              talking
                ? "border-danger/70 bg-danger/20 animate-pulse"
                : "border-cyan/60 bg-cyan/15",
            )}
          >
            {talking ? <Square size={22} /> : <Mic size={26} />}
          </span>
          <span className="label-mono text-[11px] tracking-[0.22em]">
            {talking ? "listening — tap to stop" : "hold the bridge · tap to talk"}
          </span>
          {talking ? (
            <span className="flex h-4 items-end gap-1">
              {[6, 12, 9, 15, 7, 11].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-danger nx-typing"
                  style={{ height: h, animationDelay: `${i * 0.09}s` }}
                />
              ))}
            </span>
          ) : null}
        </button>

        {/* composer — tapping it does NOT raise the mobile keyboard */}
        <div className="flex items-center gap-2 rounded-2xl border border-dim bg-surface-2 p-2">
          <IconBadge accent="cyan" size={36}>
            <Paperclip size={16} />
          </IconBadge>

          {keyboardMode ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") push(draft);
                if (e.key === "Escape") setKeyboardMode(false);
              }}
              placeholder="Message Butler…"
              className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-faint"
            />
          ) : (
            <button
              type="button"
              onClick={() => setTalking(true)}
              className="min-w-0 flex-1 truncate px-1 text-left text-sm text-muted-foreground"
            >
              {draft || "Tap the mic to talk…"}
            </button>
          )}

          <button
            type="button"
            aria-label={keyboardMode ? "Hide keyboard" : "Type instead"}
            onClick={() => setKeyboardMode((k) => !k)}
            className={cn(
              "press grid size-9 place-items-center rounded-[0.7rem] border",
              keyboardMode
                ? "border-cyan/50 bg-cyan/15 text-cyan"
                : "border-dim bg-surface-3 text-faint",
            )}
          >
            <Keyboard size={16} />
          </button>

          <button
            type="button"
            aria-label="Send"
            onClick={() => push(draft || "Status report")}
            className="press grid size-9 place-items-center rounded-[0.7rem] bg-cyan text-primary-foreground"
          >
            <SendHorizonal size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Chip accent={typing ? "warn" : "ok"} dot>
            {typing ? "thinking" : "bridge idle"}
          </Chip>
          <div className="flex gap-2">
            {undone.length ? (
              <button
                type="button"
                onClick={redo}
                className="press rounded-lg border border-dim bg-surface-3 px-3 py-1.5 label-mono text-[10px] text-muted-foreground hover:text-cyan"
              >
                redo
              </button>
            ) : null}
            <button
              type="button"
              onClick={undo}
              disabled={msgs.length <= 1}
              className="press inline-flex items-center gap-1.5 rounded-lg border border-warn/40 bg-warn/12 px-3 py-1.5 label-mono text-[10px] text-warn disabled:opacity-40"
            >
              <Undo2 size={12} /> undo
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
