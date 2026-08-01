import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Ban, RefreshCw, Check, X, HelpCircle, Minus } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Card, Chip, IconBadge, Row, SectionHeader, ActionButton } from "@/components/nexus/ui";
import { fx } from "@/lib/fx";
import {
  PERMISSIONS,
  DENIED_NATIVE,
  STATE_LABEL,
  queryPermission,
  requestPermission,
  type PermDef,
  type PermState,
} from "@/lib/permissions";

export const Route = createFileRoute("/permissions")({
  head: () => ({
    meta: [
      { title: "Permission Centre — Butler AI NEXUS" },
      {
        name: "description",
        content:
          "Every permission Butler AI can ask for, why it exists, what happens if you refuse, and the full list of permissions blocked at build time.",
      },
      { property: "og:title", content: "Permission Centre — Butler AI" },
      {
        property: "og:description",
        content: "Minimum permissions, plain-language reasons, graceful fallbacks for every refusal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PermissionsPage,
});

const STATE_STYLE: Record<PermState, string> = {
  granted: "text-ok border-ok/30 bg-ok/10",
  denied: "text-danger border-danger/30 bg-danger/10",
  prompt: "text-cyan border-cyan/30 bg-cyan/10",
  unsupported: "text-muted-foreground border-dim/60 bg-surface-3/60",
  checking: "text-muted-foreground border-dim/60 bg-surface-3/60",
};

function StateIcon({ state }: { state: PermState }) {
  if (state === "granted") return <Check size={12} />;
  if (state === "denied") return <X size={12} />;
  if (state === "prompt") return <HelpCircle size={12} />;
  return <Minus size={12} />;
}

function PermissionRow({
  def,
  state,
  onRequest,
}: {
  def: PermDef;
  state: PermState;
  onRequest: (def: PermDef) => void;
}) {
  const actionable = def.runtime && state !== "granted" && state !== "unsupported";
  return (
    <Row
      left={<IconBadge accent={def.accent} icon={<ShieldCheck size={14} />} />}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {def.label}
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATE_STYLE[state]}`}
          >
            <StateIcon state={state} />
            {STATE_LABEL[state]}
          </span>
        </span>
      }
      sub={
        <>
          <span className="block">{def.why}</span>
          <span className="mt-1 block text-[11px] text-muted-foreground/80">
            If refused — {def.fallback}
          </span>
          {def.native ? (
            <span className="mt-1 block font-mono text-[10px] text-muted-foreground/60">
              {def.native}
            </span>
          ) : null}
        </>
      }
      right={
        actionable ? (
          <button
            type="button"
            onClick={() => {
              fx.tap();
              onRequest(def);
            }}
            className="press rounded-lg border border-cyan/40 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan"
          >
            allow
          </button>
        ) : null
      }
    />
  );
}

function PermissionsPage() {
  const [states, setStates] = useState<Record<string, PermState>>(() =>
    Object.fromEntries(PERMISSIONS.map((p) => [p.key, "checking" as PermState])),
  );

  const refresh = useCallback(async () => {
    const entries = await Promise.all(
      PERMISSIONS.map(async (p) => [p.key, await queryPermission(p)] as const),
    );
    setStates(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRequest = useCallback(async (def: PermDef) => {
    const next = await requestPermission(def);
    setStates((s) => ({ ...s, [def.key]: next }));
    if (next === "granted") fx.success();
  }, []);

  const granted = PERMISSIONS.filter((p) => states[p.key] === "granted").length;

  return (
    <AppShell title="PERMISSIONS" subtitle="what the app may touch">
      <section>
        <SectionHeader
          title="permission centre"
          hint={`${granted}/${PERMISSIONS.length} active`}
          accent="ok"
        />
        <Card className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Butler AI asks for the smallest possible set, only at the moment it is needed, and
            every refusal has a working fallback. Nothing is requested on launch.
          </p>
          <div className="flex flex-wrap gap-2">
            <Chip accent="ok">no background access</Chip>
            <Chip accent="ok">no analytics</Chip>
            <Chip accent="net">LAN only</Chip>
          </div>
          <ActionButton
            variant="ghost"
            onClick={() => {
              fx.tap();
              void refresh();
            }}
          >
            <RefreshCw size={14} /> re-check status
          </ActionButton>
        </Card>
      </section>

      <section>
        <SectionHeader title="requested" hint="Tap allow to grant" accent="cyan" />
        <div className="space-y-2">
          {PERMISSIONS.map((p) => (
            <PermissionRow
              key={p.key}
              def={p}
              state={states[p.key] ?? "checking"}
              onRequest={onRequest}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title="blocked at build time"
          hint="Cannot be enabled by any library"
          accent="danger"
        />
        <Card className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            These are stripped from the native manifest during the build, so no dependency can
            widen the app's footprint later. Mirrored in{" "}
            <span className="font-mono text-xs">app.permissions.json</span>.
          </p>
          <div className="flex flex-wrap gap-2">
            {DENIED_NATIVE.map((d) => (
              <span
                key={d.native}
                className="inline-flex items-center gap-1.5 rounded-full border border-danger/25 bg-danger/10 px-2.5 py-1 text-[11px] text-danger"
              >
                <Ban size={11} />
                {d.label}
              </span>
            ))}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
