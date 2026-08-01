import { useEffect, useRef, useState } from "react";
import { Bot, Mic, Paperclip, Send, X, Sparkle, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { id: number; role: "user" | "butler"; text: string };

const SUGGESTIONS = ["System status", "Free up RAM", "Run backup script", "Open downloads"];

const CANNED = [
  "Acknowledged. Routing that through the local host — no cloud hop.",
  "Host is idle at 12% CPU. I can queue that now or schedule it.",
  "Done in the shell preview. Wire the executor to make it live.",
];

/** Floating Butler chat dock — local echo only (visual shell). */
export function ButlerDock() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [typing, setTyping] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 0, role: "butler", text: "Butler online. Local link secured. What do you need?" },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [msgs, typing, open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const id = Date.now();
    setMsgs((m) => [...m, { id, role: "user", text: t }]);
    setValue("");
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [
        ...m,
        { id: id + 1, role: "butler", text: CANNED[m.length % CANNED.length] ?? CANNED[0]! },
      ]);
    }, 900);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Butler" : "Ask Butler"}
        className={cn(
          "press fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-40 grid size-13 place-items-center rounded-2xl border border-cyan/35 bg-surface-2/90 text-cyan shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--cyan)_60%,transparent)] backdrop-blur-md transition-transform hover:scale-105",
          open && "rotate-90",
        )}
      >
        {open ? <X size={20} /> : <Bot size={21} />}
        {!open && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-ok pulse-dot" />}
      </button>

      {open ? (
        <div className="fixed inset-x-3 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md">
          <div className="nx-pop flex max-h-[60dvh] flex-col overflow-hidden rounded-2xl border border-dim/70 glass shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-2 border-b border-dim/60 px-3 py-2">
              <Sparkle size={14} className="text-neural" />
              <span className="label-mono text-[10px] text-faint">BUTLER · LOCAL</span>
              <span className="ml-auto label-mono text-[10px] text-ok">READY</span>
            </div>

            <div className="scroll-y flex-1 space-y-2 px-3 py-3">
              {msgs.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "nx-pop max-w-[80%] rounded-xl px-3 py-2 text-fluid-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-cyan/15 text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cyan)_28%,transparent)]"
                        : "bg-surface-2/70 text-foreground/90",
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {typing ? (
                <div className="flex items-center gap-1 rounded-xl bg-surface-2/70 px-3 py-2.5 w-fit">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="nx-typing-dot size-1.5 rounded-full bg-cyan"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              ) : null}
              <div ref={endRef} />
            </div>

            <div className="scroll-x flex gap-1.5 border-t border-dim/50 px-3 py-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="press shrink-0 rounded-full border border-dim/70 bg-surface-2/60 px-2.5 py-1 label-mono text-[10px] text-faint hover:border-cyan/40 hover:text-cyan"
                >
                  {s}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(value);
              }}
              className="flex items-end gap-2 border-t border-dim/60 px-3 py-2"
            >
              <button type="button" aria-label="Attach" className="press grid size-8 shrink-0 place-items-center rounded-lg text-faint hover:text-cyan">
                <Paperclip size={16} />
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(value);
                  }
                }}
                placeholder="Ask Butler anything…"
                className="max-h-24 min-h-9 flex-1 resize-none bg-transparent py-2 text-fluid-sm leading-snug text-foreground outline-none placeholder:text-faint"
              />
              <button type="button" aria-label="Voice" className="press grid size-8 shrink-0 place-items-center rounded-lg text-faint hover:text-neural">
                <Mic size={16} />
              </button>
              <button
                type="submit"
                aria-label="Send"
                disabled={!value.trim() && !typing}
                className="press grid size-9 shrink-0 place-items-center rounded-xl bg-cyan/18 text-cyan shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cyan)_32%,transparent)] disabled:opacity-40"
              >
                {typing ? <Square size={14} /> : <Send size={16} />}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
