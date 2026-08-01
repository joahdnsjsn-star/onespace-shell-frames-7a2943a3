import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Paperclip, SendHorizonal, Undo2, User, Sparkles } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Chip, IconBadge } from "@/components/nexus/ui";
import { Coach } from "@/components/nexus/Coach";
import { fx } from "@/lib/fx";
import { askButler, BridgeError } from "@/lib/butler-bridge";
import { useBridge } from "@/lib/useBridge";
import { vaultGet, vaultSet } from "@/lib/vault";


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
  "List running processes",
  "Lock the workstation",
];

const COACH = [
  {
    target: "chat-transcript",
    title: "the transcript",
    body: "Everything Butler reports lands here. It is the only part of this page that scrolls, so the controls never move on you.",
  },
  {
    target: "chat-suggestions",
    title: "quick prompts",
    body: "Swipe this rail and tap a prompt to fire it instantly — the fastest way to get an answer with zero typing.",
  },
  {
    target: "chat-composer",
    title: "write anything",
    body: "The box is always ready. Type in plain language and hit send; Enter works too.",
  },
  {
    target: "chat-undo",
    title: "undo & redo",
    body: "Sent something by mistake? Undo pulls back the last exchange, and redo puts it right back.",
  },
];

type Msg = { id: number; role: "user" | "bot"; text: string };

const GREETING: Msg = {
  id: 1,
  role: "bot",
  text: "Butler here. Pair your PC on the LINK page and I answer from the model running on your own machine — nothing leaves your network.",
};

const TRANSCRIPT_KEY = "butler.transcript";
const MAX_REMEMBERED = 60;

function Butler() {
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [undone, setUndone] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const idRef = useRef(100);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { status, paired } = useBridge();

  // Restore the encrypted transcript so Butler remembers the conversation.
  useEffect(() => {
    let alive = true;
    void vaultGet<Msg[]>(TRANSCRIPT_KEY, []).then((saved) => {
      if (!alive || !saved.length) return;
      idRef.current = Math.max(100, ...saved.map((m) => m.id));
      setMsgs([GREETING, ...saved]);
    });
    return () => {
      alive = false;
    };
  }, []);

  const remember = useCallback((next: Msg[]) => {
    void vaultSet(TRANSCRIPT_KEY, next.filter((m) => m.id !== GREETING.id).slice(-MAX_REMEMBERED));
  }, []);

  const push = useCallback(
    (text: string) => {
      const clean = text.trim().slice(0, 4000);
      if (!clean || typing) return;
      fx.tap();
      const mine: Msg = { id: ++idRef.current, role: "user", text: clean };
      const history = msgs
        .filter((m) => m.id !== GREETING.id)
        .slice(-12)
        .map((m) => ({ role: m.role === "bot" ? ("assistant" as const) : ("user" as const), content: m.text }));

      setMsgs((m) => {
        const next = [...m, mine];
        remember(next);
        return next;
      });
      setUndone([]);
      setDraft("");
      setTyping(true);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      void askButler(clean, history, controller.signal)
        .then((reply) => {
          setMsgs((m) => {
            const next = [...m, { id: ++idRef.current, role: "bot" as const, text: reply.text }];
            remember(next);
            return next;
          });
        })
        .catch((err: unknown) => {
          const message =
            err instanceof BridgeError
              ? err.code === "no-config"
                ? "No PC paired yet. Open the LINK page and scan the QR code shown by butler_server.py."
                : err.message
              : "Something went wrong talking to your PC.";
          setMsgs((m) => [...m, { id: ++idRef.current, role: "bot" as const, text: message }]);
        })
        .finally(() => {
          setTyping(false);
          requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
        });
    },
    [msgs, remember, typing],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  const undo = useCallback(() => {
    setMsgs((m) => {
      if (m.length <= 1) return m;
      const trailing: Msg[] = [];
      const next = [...m];
      while (next.length > 1 && next[next.length - 1]!.role === "bot") {
        trailing.unshift(next.pop()!);
      }
      if (next.length > 1 && next[next.length - 1]!.role === "user") {
        trailing.unshift(next.pop()!);
      }
      setUndone(trailing);
      remember(next);
      return next;
    });
  }, [remember]);

  const redo = useCallback(() => {
    if (!undone.length) return;
    setMsgs((m) => {
      const next = [...m, ...undone];
      remember(next);
      return next;
    });
    setUndone([]);
  }, [remember, undone]);


  return (
    <AppShell title="BUTLER" subtitle="neural command interface" accentLabel="ai ready" fill>
      <Coach id="butler-chat" steps={COACH} />

      {/* transcript — the only scroll region on this page */}
      <div data-coach="chat-transcript" className="scroll-y min-h-0 flex-1 space-y-3 pr-0.5">
        {msgs.map((m) =>
          m.role === "bot" ? (
            <div key={m.id} className="flex gap-2">
              <IconBadge accent="neural" size={34}>
                <Bot size={16} />
              </IconBadge>
              <div className="nx-pop max-w-[84%] rounded-2xl rounded-tl-sm border border-dim/60 bg-surface-2 p-3 text-[13.5px] leading-relaxed">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end gap-2">
              <div className="nx-pop max-w-[84%] rounded-2xl rounded-tr-sm bg-cyan px-3 py-2 text-[13.5px] leading-relaxed text-primary-foreground">
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
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-dim/60 bg-surface-2 px-3 py-3">
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
      <div className="shrink-0 space-y-2">
        <div className="flex items-center gap-1.5 px-0.5">
          <Sparkles size={12} className="text-neural" />
          <span className="label-mono text-[10px] text-faint">quick prompts</span>
        </div>
        <div
          data-coach="chat-suggestions"
          className="scroll-x -mx-4 flex gap-2 px-4 pb-0.5 sm:-mx-6 sm:px-6"
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => push(s)}
              className="press shrink-0 whitespace-nowrap rounded-full border border-cyan/25 bg-cyan/8 px-3.5 py-2 text-xs text-cyan/90 transition-colors hover:border-cyan/60 hover:bg-cyan/15"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* composer — always writable, big hit targets */}
      <div className="shrink-0 space-y-2">
        <div
          data-coach="chat-composer"
          className="flex items-end gap-2 rounded-2xl border border-cyan/30 bg-surface-2 p-2 shadow-[0_18px_44px_-30px_var(--cyan)] focus-within:border-cyan/60"
        >
          <button
            type="button"
            aria-label="Attach a file"
            className="press grid size-10 shrink-0 place-items-center rounded-xl border border-dim bg-surface-3 text-faint hover:text-cyan"
          >
            <Paperclip size={16} />
          </button>

          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                push(draft);
              }
            }}
            placeholder="Message Butler…"
            className="scroll-y max-h-24 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm leading-snug outline-none placeholder:text-faint"
          />

          <button
            type="button"
            aria-label="Send message"
            onClick={() => push(draft)}
            disabled={!draft.trim()}
            className="press grid size-10 shrink-0 place-items-center rounded-xl bg-cyan text-primary-foreground transition-opacity disabled:opacity-35"
          >
            <SendHorizonal size={17} />
          </button>
        </div>

        <div data-coach="chat-undo" className="flex items-center justify-between gap-2">
          <Chip accent={typing ? "warn" : status === "online" ? "ok" : paired ? "warn" : "danger"} dot>
            {typing
              ? "thinking"
              : status === "online"
                ? "bridge online"
                : paired
                  ? "bridge offline"
                  : "no pc paired"}
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
