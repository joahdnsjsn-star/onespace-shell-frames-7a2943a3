import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/nexus/LegalDoc";

export const Route = createFileRoute("/data-safety")({
  head: () => ({
    meta: [
      { title: "Data Safety — Butler AI NEXUS" },
      { name: "description", content: "Google Play data safety declaration for Butler AI: no collection, no sharing, encrypted in transit." },
      { property: "og:title", content: "Data Safety — Butler AI" },
      { property: "og:description", content: "No data collected, no data shared, encrypted on your LAN." },
    ],
  }),
  component: () => (
    <LegalDoc
      title="DATA SAFETY"
      updated="2026-08-01"
      sections={[
        { heading: "Data collected", body: "No data is collected by the developer. The app has no backend." },
        { heading: "Data shared", body: "No data is shared with third parties. There are no SDKs bundled that phone home." },
        { heading: "Encryption in transit", body: "All traffic between phone and PC runs over an encrypted channel established during QR pairing." },
        { heading: "Deletion", body: "Erasing local data from Settings removes pairing keys, caches and indexes permanently." },
        { heading: "Children", body: "The app is not directed at children and collects nothing that could identify any user." },
      ]}
    />
  ),
});
