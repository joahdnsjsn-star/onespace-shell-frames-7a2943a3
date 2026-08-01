import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/nexus/LegalDoc";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Butler AI NEXUS" },
      {
        name: "description",
        content:
          "How Butler AI handles data: local-only processing, no analytics, no cloud relay, 18+ only, one-tap deletion of everything stored.",
      },
      { property: "og:title", content: "Privacy Policy — Butler AI" },
      { property: "og:description", content: "Local-only processing, no cloud relay, no analytics, no accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalDoc
      title="PRIVACY POLICY"
      updated="2026-08-01"
      sections={[
        {
          heading: "1. Overview",
          body: "This policy covers the Butler AI Android client (com.butlerai.pc.automation) and the butler_server.py companion you install on your own PC. Butler AI is designed exclusively for users 18 years of age and older. There are no accounts, no sign-up and no developer-operated servers.",
        },
        {
          heading: "2. What we do not collect",
          body: "No name, email, phone number, address, photos, videos, audio recordings, contacts, calendar, location, health, financial or messaging data. No advertising identifiers, no analytics SDK, no crash-reporting service, no tracking pixels, no third-party ad networks.",
        },
        {
          heading: "3. What is stored, and where",
          body: "A random pairing UUID created at first launch, your saved server host and port, preferences, script history and knowledge indexes. All of it lives on your handset or on your own PC. None of it is transmitted to the developer or to any third party.",
        },
        {
          heading: "4. Permissions and why",
          body: "CAMERA — used only to read the one-time pairing QR code shown on your PC screen; no photo is captured, stored or uploaded, and a plain-language disclosure appears before the system prompt. LOCAL NETWORK — used for a one-time, consent-gated scan to find your PC on your own Wi-Fi; the public internet is never scanned. VIBRATE — haptic feedback only. INTERNET — required to reach the IP address you paired with. Microphone, location, contacts, phone state, media libraries, background location, body sensors and activity recognition are explicitly blocked in the app manifest and cannot be requested.",
        },
        {
          heading: "5. Remote execution disclosure",
          body: "Butler AI sends commands and Python scripts to a server you installed on a computer you own. Every command requires a manual tap — there is no auto-execution, no background scheduler and no remote trigger. The app never downloads or installs executable code from external sources, and a built-in malicious-script blocker rejects destructive commands before they are sent.",
        },
        {
          heading: "6. Optional AI processing",
          body: "By default, AI runs through a local Ollama model on your own PC, so prompts never leave your network. If you deliberately configure an external AI endpoint, the prompts you send go to that provider under their policy — that choice is yours and is off by default.",
        },
        {
          heading: "7. Security practices",
          body: "Pairing requires physical presence at the PC. Traffic is AES-256 encrypted and HMAC-SHA256 signed. Secrets are held in the platform keystore. The app does not use Accessibility Service, SYSTEM_ALERT_WINDOW or REQUEST_INSTALL_PACKAGES.",
        },
        {
          heading: "8. Children's privacy",
          body: "The app is rated 18+ and is not directed at children. We knowingly collect nothing from anyone, including minors.",
        },
        {
          heading: "9. Retention and deletion",
          body: "Data is kept until you remove it. Settings → Personal Files & Account → Delete All My Data wipes the pairing UUID, hosts, caches, indexes and history immediately. Uninstalling removes the same data. Because nothing is held server-side by the developer, there is nothing further to request.",
        },
        {
          heading: "10. Changes",
          body: "Material changes to this policy are published in-app with a new effective date before they take effect.",
        },
        {
          heading: "11. Contact",
          body: "Privacy questions: andrejsladkovic1992@gmail.com, or the issues page of the official project repository.",
        },
      ]}
    />
  ),
});
