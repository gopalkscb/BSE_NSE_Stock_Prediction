# Implementation Plan: MVP3 Native Mobile Application

## Overview

Tasks 36–55 implement the MVP3 mobile layer. All MVP1 + MVP2 tests must remain GREEN. The backend additions (Celery, alerts endpoint) are implemented first, then the mobile app.

> **Prerequisite**: All MVP1 (Tasks 1–15) and MVP2 (Tasks 16–35) must be complete and all test suites GREEN.

---

## Tasks

- [ ] 36. Monorepo setup + shared package extraction
  - Create `packages/shared/`, `packages/web/`, `packages/mobile/` structure
  - Extract `stockApi.js` and TypeScript types into `packages/shared/`
  - Configure workspace (npm workspaces or yarn workspaces)
  - Verify `packages/web/` (MVP2 app) still builds and all tests pass
  - 🔴 **Gate**: `npm run build` in `packages/web/` + `npx vitest run` — all GREEN

- [ ] 37. React Native app shell + navigation
  - Initialize Expo app in `packages/mobile/` with SDK 51
  - Install React Navigation 6 (bottom tabs + stack)
  - Create 4 bottom tabs: Screener, Watchlist, Portfolio, Settings
  - Create empty placeholder screens
  - 🔴 **Gate**: App builds and launches on Android emulator + iOS simulator

- [ ] 38. Screener screen + stock card component
  - Implement `ScreenerScreen.tsx` with TanStack Query fetching from API
  - Implement `StockCard.tsx` (ticker, score, confidence badge, top-3 signals)
  - Implement MMKV caching layer
  - Write Jest unit tests
  - 🔴 **Gate**: Jest tests GREEN + manual test on emulator

- [ ] 39. Ticker Detail screen + native charts
  - Implement `TickerDetailScreen.tsx` with all 11 indicator rows
  - Implement candlestick chart via `react-native-gifted-charts`
  - Add overlay toggle chips (SMA-50, SMA-200, BB, Supertrend, Volume)
  - Implement pinch-to-zoom + swipe-to-pan
  - Write Jest unit tests
  - 🔴 **Gate**: Jest tests GREEN + chart renders at 60fps on emulator

- [ ] 40. Offline-first architecture
  - Integrate TanStack Query with MMKV persistence
  - Implement network status detection via @react-native-community/netinfo
  - Implement amber offline banner + stale data overlay on charts
  - Implement auto-refresh on reconnection
  - Write Jest unit tests
  - 🔴 **Gate**: Jest tests GREEN + offline mode works on emulator

- [ ] 41. Backend: alerts register endpoint + Celery worker
  - Add `celery==5.3.6`, `redis==5.0.4`, `firebase-admin==6.5.0` to requirements.txt
  - Implement `POST /api/v2/alerts/register` (stores device token + ticker + threshold)
  - Implement Celery beat task: scan every 15min, fire FCM push on threshold crossing
  - Write `tests/test_alerts.py`
  - 🔴 **Gate**: `pytest tests/test_alerts.py` — all GREEN

- [ ] 42. Mobile: push notification integration
  - Integrate `expo-notifications` for permission request + token retrieval
  - Register device token with backend on app launch
  - Implement notification handler with React Navigation deep-linking
  - Write Jest unit tests
  - 🔴 **Gate**: Jest tests GREEN + push received on emulator

- [ ] 43. Watchlist screen + biometric auth
  - Implement `WatchlistScreen.tsx` (add/remove tickers, set alert thresholds)
  - Implement biometric gate via `expo-local-authentication`
  - Device PIN fallback if biometrics unavailable
  - Write Jest unit tests
  - 🔴 **Gate**: Jest tests GREEN + biometric prompt works on device

- [ ] 44. Portfolio screen
  - Implement `PortfolioScreen.tsx` with simulation results from API
  - Render cumulative P&L chart + Sharpe + max drawdown stats
  - Write Jest unit tests
  - 🔴 **Gate**: Jest tests GREEN

- [ ] 45. Settings + System Status + Developer Options
  - Implement `SettingsScreen.tsx` (indicator selection, polling interval)
  - Implement `SystemStatusScreen.tsx` (API health, last sync, cache stats)
  - Implement hidden `DeveloperOptionsScreen.tsx` (5 taps, API key + biometric gate)
  - Write Jest unit tests
  - 🔴 **Gate**: Jest tests GREEN

- [ ] 46. Mobile security: certificate pinning + Secure Store
  - Configure certificate pinning for backend API domain
  - Store API key in `expo-secure-store`
  - Implement jailbreak/root detection with warning modal
  - Enable Hermes bytecode compilation
  - Write Jest unit tests
  - 🔴 **Gate**: Jest tests GREEN + cert pinning verified (MITM test fails correctly)

- [ ] 47. Mobile observability: Sentry integration
  - Install `@sentry/react-native`
  - Configure source map upload in EAS Build hooks
  - Add React Navigation breadcrumbs
  - Verify crash reporting in Sentry dashboard
  - 🔴 **Gate**: Test crash appears in Sentry

- [ ] 48. Performance optimization + benchmarks
  - Measure cold-start time (target <3s)
  - Measure results render time (target <2s)
  - Measure chart fps (target >=55fps)
  - Optimize bundle size (target APK <25MB)
  - 🔴 **Gate**: All 4 benchmarks met on Snapdragon 665-class device

- [ ] 49. Home screen widget (stretch)
  - Android: Glance API widget (top-3 tickers + scores)
  - iOS: WidgetKit extension (same data)
  - Background refresh every 15min via expo-background-fetch
  - 🔴 **Gate**: Widget renders on both platforms

- [ ] 50. Detox E2E test suite
  - Install and configure Detox for Android + iOS
  - Write E2E tests: screener flow, watchlist add/remove, detail drawer, offline mode
  - 🔴 **Gate**: `detox test` — all GREEN on both platforms

- [ ] 51. EAS Build + Fastlane release prep
  - Configure `eas.json` for production builds
  - Configure Fastlane for screenshot generation + metadata
  - Create privacy policy screen
  - Add `npm audit --audit-level=high` as pre-build gate
  - 🔴 **Gate**: EAS produces valid .aab + .ipa

- [ ] 52. 🔴 Full MVP3 backend integration gate
  - `pytest tests/ -v` — ALL tests (MVP1 + MVP2 + MVP3 backend) GREEN
  - Celery worker starts and connects to Redis
  - FCM test push delivered successfully

- [ ] 53. 🔴 Full MVP3 mobile integration gate
  - Jest unit tests: all GREEN
  - Detox E2E: all GREEN
  - npm audit: exits 0
  - App launches without crash on Android 10 + iOS 15

- [ ] 54. 🔴 Full MVP3 release gate
  - All backend tests GREEN
  - All mobile tests GREEN
  - All web tests GREEN (no regressions)
  - EAS build succeeds
  - Performance benchmarks met
  - Security controls verified (cert pin, secure store, biometric)
  - **MVP3 is complete only when ALL gates pass**

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["36"] },
    { "id": 1, "tasks": ["37", "41"] },
    { "id": 2, "tasks": ["38", "42"] },
    { "id": 3, "tasks": ["39", "40", "43"] },
    { "id": 4, "tasks": ["44", "45", "46"] },
    { "id": 5, "tasks": ["47", "48"] },
    { "id": 6, "tasks": ["49", "50"] },
    { "id": 7, "tasks": ["51", "52", "53"] },
    { "id": 8, "tasks": ["54"] }
  ]
}
```


---

## MVP1b — Test Hardening (deferred from MVP1)

> This section tracks the heavy test infrastructure that was removed from MVP1 to maintain a 2-hour build scope.
> These tasks should be completed before MVP3 mobile development begins.

### Deferred Test Tasks

- [ ] T1. Property-based tests (hypothesis)
  - 9 tests covering indicator mathematical invariants and scorer boundary conditions
  - RSI always in [0,100], Bollinger upper > middle > lower, MACD = fast_ema - slow_ema
  - bullish_score always in [0,100], confidence mapping is total, projected_range ordered
  - ranked result length ≤ 10, non-increasing order

- [ ] T2. Full Python unit test suite expansion
  - Expand from ~10 smoke tests to ~80 comprehensive unit tests
  - Cover all edge cases, boundary values, error paths
  - Every public function has at least 2 tests

- [ ] T3. Backend integration tests
  - `tests/test_integration_backend.py` using httpx.AsyncClient with ASGITransport
  - Full pipeline test (analyze → score → cache → detail lookup)
  - Partial failure handling, CORS headers, Swagger validation

- [ ] T4. Frontend unit tests (Vitest + React Testing Library)
  - Co-located *.test.jsx for every component
  - API client mock tests
  - State management and error handling tests

- [ ] T5. Playwright E2E tests
  - `frontend/e2e/ticker-input.spec.js` — form validation
  - `frontend/e2e/analysis-page.spec.js` — table rendering, spinner, error states
  - `frontend/e2e/stock-detail-drawer.spec.js` — drawer open/close, chart, indicators
  - `frontend/e2e/full-stack.spec.js` — live backend + frontend integration
  - `frontend/e2e/observability.spec.js` — observability tab navigation + panels
  - `frontend/e2e/observability-full-stack.spec.js` — live observability data

- [ ] T6. ThreadPoolExecutor for batch fetching
  - Upgrade fetch_batch() from sequential to concurrent (max_workers=10)
  - Add timeout handling (60s budget)

- [ ] T7. Full Swagger annotations
  - Add response examples, error response schemas, detailed descriptions to all endpoints
  - Verify OpenAPI schema completeness

### Gate Rule
All T1–T7 tasks must be GREEN before starting MVP3 mobile development.
