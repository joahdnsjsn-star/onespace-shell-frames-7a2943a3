import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/nexus/LegalDoc";
import { Card, Chip } from "@/components/nexus/ui";

export const Route = createFileRoute("/security-trust")({
  head: () => ({
    meta: [
      { title: "Security & Trust — Butler AI NEXUS" },
      {
        name: "description",
        content:
          "Threat model, hardening measures and verification steps for the Butler AI bridge.",
      },
      { property: "og:title", content: "Security & Trust — Butler AI" },
      {
        property: "og:description",
        content: "Threat model and hardening measures for the local bridge.",
      },
    ],
  }),
  component: () => (
    <LegalDoc
      title="SECURITY & TRUST"
      updated="2026-08-01"
      sections={[
        {
          heading: "Threat model",
          body: "We assume a hostile LAN. Pairing requires physical access to the QR shown in your own terminal.",
        },
        {
          heading: "Key handling",
          body: "Keys are generated on pairing, stored in encrypted device storage and never leave the two paired machines.",
        },
        {
          heading: "Command surface",
          body: "The server only exposes the endpoints it declares. Unknown commands are rejected before parsing.",
        },
        {
          heading: "Neural tripwire",
          body: "Unexpected command patterns raise an alert and suspend the session until you confirm on the PC.",
        },
        {
          heading: "Verification",
          body: "The server source is open — read it before you run it. Nothing is obfuscated or minified.",
        },
      ]}
      footer={
        <Card accent="ok">
          <div className="label-mono text-ok">hardening status</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip accent="ok" dot>
              no telemetry
            </Chip>
            <Chip accent="ok">no cloud relay</Chip>
            <Chip accent="ok">open source server</Chip>
            <Chip accent="net">lan scoped</Chip>
          </div>
        </Card>
      }
    />
  ),
});
