# Butler AI — Working Checklist (web shell)

Derived from the uploaded native plans (`BUTLER_AI_LAYOUT_UPGRADE_PLAN_*`,
`TOOLBAR_HUB_UPGRADE_2026-08-01.md`, `PORTING_GUIDE_RN_TO_WEB_SHELL*`) and
re-verified against this repo. Kept current — this is the single source of
truth for "what's left".

## Done (verified in this repo)

- [x] 5-slot dock + searchable HUB drawer (`TabBar` + `PageLauncher.tsx`),
      state-aware slot, live search, adaptive recent chips
- [x] No stale layout math — fluid `clamp()` sizing, no frozen width constants
- [x] `OfflineBanner.tsx` + skeleton loading states across heavy routes
- [x] Real-data-only guard: no mock/fake values rendered anywhere
- [x] Interval/poll cleanup + exponential backoff reconnect (`autoconnect.ts`)
- [x] Live link-quality readout, LAN radar sweep, command palette
- [x] Encrypted local vault (`vault.ts`), no third-party network calls
- [x] Flight-recorder logger + `/logs` telemetry dashboard
- [x] Adaptive performance governor with one-shot (non-spammy) alerts
- [x] QR pairing with `BarcodeDetector` + frame-capture fallback
- [x] Knowledge/crawler graph, growth ledger, source health
- [x] Permissions hub, Play Store compliance docs, native parity checker
- [x] Butler voice muted by default until a better voice is chosen

## Gap-report reconciliation (2026-08-01)

The uploaded `shell-gap-analysis.md` was written against
`butler-nexus-shell-v11-complete` and is stale. Mapping of its 23 "missing"
services to this repo:

| Native service | Web shell |
|---|---|
| connectionHub / serverConnection / connectionPersistence | `lib/butler-bridge.ts` |
| serverFeatures | `lib/server-features.ts` |
| autoConnectEngine / heartbeatEngine | `lib/autoconnect.ts` |
| lanScanner / qrParser | `lib/discovery.ts` + `components/nexus/QrScanner.tsx` |
| networkMonitor | `lib/netmon.ts` |
| neuralTripwire | `lib/tripwire.ts` |
| encryptedStorage | `lib/vault.ts` (AES-GCM) |
| knowledgeAccumulator | `lib/knowledge.ts` |
| kbGrowthTracker | `lib/kb-growth.ts` |
| executionHistory | `lib/history.ts` |
| runtimeErrorMonitor / autoErrorLogger / bootErrorLog | `lib/logger.ts` + `lib/error-capture.ts` |
| deviceIdentifier | device id inside `butler-bridge.ts` |
| onboardingState | `lib/useSetting.ts` persistence |
| bootGuard | root error boundary in `__root.tsx` |
| haptics | `lib/haptics.ts` + `lib/fx.ts` |
| safeClipboard / pcClipboard | `lib/pc-remote.ts` (added this pass) |
| remoteAccessTiers | intentionally omitted — LAN-only, no tiers |

`butler_server.py` ships inside the app as a downloadable asset on the Link
page, so there is no separate repo to fetch.

## Open — needs a decision from the user

- [ ] **i18n** — native `LanguageContext.tsx` (629 lines) has no web
      equivalent. Shell is English-only. Big job; only worth it if the store
      listing targets non-English locales.
- [ ] **Purchases / paywall** — native `PurchaseContext.tsx` has no web
      equivalent. Deliberately skipped: the app is self-hosted and privacy-
      first, so a billing tier adds Play Store data-safety surface for no
      user benefit. Re-open only if monetization is wanted.

## Open — cheap, queued

- [ ] Port remaining native art (2nd mascot pose, shield logos, metal bg) if
      the user supplies the originals; generated stand-ins used meanwhile.
- [ ] Store screenshot set (5 frames) for the Play Console listing.
- [ ] Version stamp constant bumped per audit pass, so "which build is truth"
      stops recurring.

## Standing guardrails

- Real data or an explicit loading/empty/error state — never a placeholder
  number that looks real.
- Every poll has a cleanup; every automatic retry has a visible state change.
- Nothing leaves the device except LAN traffic to the paired `butler_server`.
