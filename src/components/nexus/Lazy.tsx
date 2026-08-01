import { type ReactNode } from "react";
import { useDeferredMount, useInView, type DeferOptions } from "@/lib/defer";

/**
 * Mounts children only once the app is idle. Never used for anything the user
 * can act on immediately — pass `force` to mount instantly on demand.
 */
export function Defer({
  children,
  fallback = null,
  ...opts
}: DeferOptions & { children: ReactNode; fallback?: ReactNode }) {
  const ready = useDeferredMount(opts);
  return <>{ready ? children : fallback}</>;
}

/**
 * Viewport lazy section. Reserves `minHeight` up-front so revealing content
 * can never shift the layout or cause a scroll jump.
 */
export function LazySection({
  children,
  minHeight = 120,
  className,
  rootMargin,
}: {
  children: ReactNode;
  minHeight?: number;
  className?: string;
  rootMargin?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(rootMargin ? { rootMargin } : undefined);
  return (
    <div
      ref={ref}
      className={className}
      style={inView ? undefined : { minHeight, contentVisibility: "auto" }}
    >
      {inView ? children : null}
    </div>
  );
}
