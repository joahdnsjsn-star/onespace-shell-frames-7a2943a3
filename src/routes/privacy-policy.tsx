import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/nexus/LegalDoc";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Butler AI NEXUS" },
      { name: "description", content: "How Butler AI handles data: local-only processing, no analytics, no third-party servers." },
      { property: "og:title", content: "Privacy Policy — Butler AI" },
      { property: "og:description", content: "Local-only processing, no cloud relay, no analytics." },
    ],
  }),
  component: () => (
    <LegalDoc
      title="PRIVACY POLICY"
      updated="2026-08-01"
      sections={[
        { heading: "Scope", body: "This policy covers the Butler AI mobile client and the butler_server.py companion you run on your own PC." },
        { heading: "Data we collect", body: "None. The app has no analytics SDK, no crash-reporting service and no advertising identifiers." },
        { heading: "Local storage", body: "Pairing keys, preferences and knowledge indexes are stored encrypted on your device or PC and never transmitted off your LAN." },
        { heading: "Network", body: "The app communicates only with the IP address you pair with. There is no cloud relay and no third-party API calls." },
        { heading: "Permissions", body: "Camera is used solely to scan the pairing QR. Local network is used for host discovery. Storage is opt-in for file transfer." },
        { heading: "Your controls", body: "You can revoke any permission, unpair the device, or erase all local data from Settings at any time." },
        { heading: "Contact", body: "Questions about this policy can be raised through the project's GitHub repository issues page." },
      ]}
    />
  ),
});
