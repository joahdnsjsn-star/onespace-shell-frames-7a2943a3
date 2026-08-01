import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/nexus/LegalDoc";

export const Route = createFileRoute("/data-safety")({
  head: () => ({
    meta: [
      { title: "Data Safety — Butler AI NEXUS" },
      {
        name: "description",
        content:
          "Google Play data safety declaration for Butler AI: device ID and app activity used for pairing only, never shared, encrypted in transit, deletable in one tap.",
      },
      { property: "og:title", content: "Data Safety — Butler AI" },
      {
        property: "og:description",
        content: "Pairing ID and app activity stay on your device and your own PC. Nothing shared, nothing sold.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalDoc
      title="DATA SAFETY"
      updated="2026-08-01"
      sections={[
        {
          heading: "Summary",
          body: "This mirrors the Google Play Console Data Safety form for com.butlerai.pc.automation, word for word. Data is collected for app functionality only, is never shared with third parties, is encrypted in transit, and can be deleted by you at any time.",
        },
        {
          heading: "Device or other IDs — collected, not shared",
          body: "A random UUID generated at first launch. It is stored locally and sent only to the Butler server running on your own PC, over your own network, to lock the pairing to this handset. Required for app functionality. Not processed ephemerally, not linked to an account, never transmitted to the developer.",
        },
        {
          heading: "App activity — collected, not shared",
          body: "Connection state, the server IP and port you enter, and your script execution history. Stored locally on the handset so reconnect and undo work. Required for app functionality. Never leaves the device except to your own paired PC.",
        },
        {
          heading: "Not collected",
          body: "No name, email, phone number, address, photos, videos, audio, contacts, calendar, location, health data, financial data, messages, installed-app inventory, search history, or advertising identifiers. No analytics SDK, no crash-reporting service, no ad networks are bundled.",
        },
        {
          heading: "Encryption in transit",
          body: "All phone-to-PC traffic is AES-256 encrypted and HMAC-SHA256 signed with keys derived at QR pairing. Pairing requires physical presence at the PC to read the one-time code from its screen.",
        },
        {
          heading: "Deletion",
          body: "Settings → Personal Files & Account → Delete All My Data erases the pairing UUID, saved hosts, caches, knowledge indexes and history permanently. Uninstalling the app removes the same data. There is no server-side copy for the developer to delete.",
        },
        {
          heading: "Age rating",
          body: "Target audience is 18 and over. Butler AI is a remote administration tool for adults administering their own machines; it is not directed at children and carries no child-directed content or ads.",
        },
        {
          heading: "Independent security review",
          body: "No formal MASA / OWASP MASVS assessment has been submitted. The listing therefore does not claim the independent security review badge.",
        },
      ]}
    />
  ),
});
