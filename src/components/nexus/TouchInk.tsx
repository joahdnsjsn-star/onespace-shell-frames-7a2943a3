import { useEffect, useRef } from "react";

const INTERACTIVE =
  'button, a[href], [role="button"], [role="tab"], [data-ripple], input[type="checkbox"], input[type="radio"], label[for], summary';

/**
 * Android-style touch ink.
 *
 * Rather than injecting a ripple span into every button (which fights
 * `overflow`, borders and stacking contexts across ~20 bespoke components),
 * a single fixed overlay paints the ink burst at the exact contact point.
 * Zero layout impact, one DOM node per tap, self-cleaning, and it honours
 * reduced-motion.
 */
export function TouchInk() {
  const layer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onDown = (e: PointerEvent) => {
      const host = layer.current;
      if (!host) return;
      const target = (e.target as Element | null)?.closest?.(INTERACTIVE) as HTMLElement | null;
      if (!target || target.hasAttribute("data-no-ink") || target.ariaDisabled === "true") return;

      const rect = target.getBoundingClientRect();
      // Ink grows to cover the control it started on, capped so full-width rows
      // don't wash out the screen.
      const reach = Math.min(320, Math.max(rect.width, rect.height) * 1.05 + 24);

      const ink = document.createElement("span");
      ink.className = "nx-ink";
      ink.style.left = `${e.clientX}px`;
      ink.style.top = `${e.clientY}px`;
      ink.style.width = `${reach}px`;
      ink.style.height = `${reach}px`;
      host.appendChild(ink);
      ink.addEventListener("animationend", () => ink.remove(), { once: true });
      window.setTimeout(() => ink.remove(), 900);
    };

    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  return <div ref={layer} className="nx-ink-layer" aria-hidden="true" />;
}
