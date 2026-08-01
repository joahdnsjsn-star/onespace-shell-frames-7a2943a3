import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/nexus/LegalDoc";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Butler AI NEXUS" },
      {
        name: "description",
        content: "Licence terms, acceptable use and liability rules for the Butler AI client.",
      },
      { property: "og:title", content: "Terms of Service — Butler AI" },
      { property: "og:description", content: "Licence, acceptable use and liability terms." },
    ],
  }),
  component: () => (
    <LegalDoc
      title="TERMS OF SERVICE"
      updated="2026-08-01"
      sections={[
        {
          heading: "Licence",
          body: "You receive a personal, non-transferable licence to use Butler AI on devices you own or are authorised to administer.",
        },
        {
          heading: "Acceptable use",
          body: "Pair only with machines you personally own. Using the app to access someone else's computer without consent voids the licence immediately.",
        },
        {
          heading: "Execution risk",
          body: "Butler AI executes real commands on a real machine. You are responsible for the scripts you run and their consequences.",
        },
        {
          heading: "No warranty",
          body: "The software is provided as-is, without warranty of any kind, express or implied.",
        },
        {
          heading: "Liability",
          body: "The author is not liable for data loss, downtime or damage resulting from commands you choose to execute.",
        },
        {
          heading: "Termination",
          body: "The licence terminates automatically on breach of any binding rule listed during onboarding.",
        },
      ]}
    />
  ),
});
