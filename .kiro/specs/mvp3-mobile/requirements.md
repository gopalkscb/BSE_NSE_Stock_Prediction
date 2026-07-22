# MVP3 Requirements Document — Native Mobile Application (Android & iOS)

## Introduction

MVP3 ports the Bullish Stock Predictor to native Android and iOS using React Native + Expo. It inherits the full 11-indicator Enhanced Score from MVP2, adds offline-first architecture, native push notifications, biometric security, and device-native charts.

**Deployment target:** Public (Play Store + App Store).
**Architecture:** Monorepo with shared logic package.

---

## Requirements

### Requirement 1 — App Shell & Navigation

**User Story:** As a mobile trader, I want a native app with intuitive tab navigation.

#### Acceptance Criteria

1. THE app SHALL use Expo SDK 51 managed workflow with React Navigation 6.
2. THE app SHALL provide a Bottom Tab navigator with 4 tabs: Screener, Watchlist, Portfolio, Settings.
3. Each tab SHALL use a Stack navigator for drill-down screens.
4. THE app SHALL target Android 10+ (API 29+) and iOS 15+.
5. TypeScript SHALL be used with `strict: true` in `tsconfig.json`.

---

### Requirement 2 — Indicator Set on Mobile

**User Story:** As a mobile trader, I want the same scoring engine as the web app.

#### Acceptance Criteria

1. THE full 11-indicator Enhanced Score SHALL be computed identically via the shared package.
2. THE Screener results list SHALL show per stock: ticker, Enhanced Score, Confidence badge, top-3 signal labels.
3. Tapping a stock SHALL navigate to a Ticker Detail screen showing all 11 indicator rows + candlestick chart.
4. THE Settings screen SHALL allow the user to select 5 indicators to show in the summary card.

---

### Requirement 3 — Native Push Notifications

**User Story:** As a mobile trader, I want push alerts when a watched stock crosses my threshold.

#### Acceptance Criteria

1. THE app SHALL request notification permissions via `expo-notifications` on first launch.
2. THE backend SHALL expose `POST /api/v2/alerts/register` accepting `{device_token, platform, ticker, threshold_score}`.
3. A Celery worker (Redis broker) SHALL re-scan watchlist tickers every 15 minutes and fire FCM/APNs push on threshold crossing.
4. THE notification payload SHALL include: ticker, score, confidence, deep-link to Ticker Detail screen.
5. Tapping the notification SHALL deep-link to the relevant Ticker Detail screen.

---

### Requirement 4 — Offline-First Architecture

**User Story:** As a mobile trader, I want to view previous results even without connectivity.

#### Acceptance Criteria

1. TanStack Query v5 SHALL manage all data fetching with stale-while-revalidate.
2. Last successful analysis results SHALL be persisted to MMKV under key `cache:{ticker}`.
3. When offline, the app SHALL show an amber banner: "Offline — showing results from {last_synced_at}".
4. Charts SHALL render with a gray overlay and "Stale data" label when offline.
5. On reconnection, TanStack Query SHALL auto-trigger background refetch.

---

### Requirement 5 — Native Charts

**User Story:** As a mobile trader, I want smooth interactive charts on my phone.

#### Acceptance Criteria

1. `react-native-gifted-charts` SHALL render candlestick charts.
2. Chart animations SHALL maintain 60fps on a Snapdragon 665-class device.
3. Pinch-to-zoom and swipe-to-pan SHALL be supported via `react-native-gesture-handler`.
4. Overlay toggles: SMA-50, SMA-200, Bollinger Bands, Supertrend, Volume.

---

### Requirement 6 — Biometric-Gated Watchlist

**User Story:** As a mobile trader, I want my watchlist protected by biometrics.

#### Acceptance Criteria

1. Watchlist edits SHALL require biometric auth via `expo-local-authentication`.
2. Fallback SHALL be device PIN/passcode if biometrics unavailable.
3. If user cancels biometric, the action is silently aborted.
4. Biometric auth is local-device only — no data sent to backend.

---

### Requirement 7 — Mobile Security Layer

**User Story:** As a security engineer, I want the mobile app hardened against common mobile threats.

#### Acceptance Criteria

1. Certificate pinning: SHA-256 pin for backend API domain. MITM certificates SHALL fail.
2. API key stored in `expo-secure-store` (iOS Keychain / Android Keystore) only.
3. Jailbreak/root detection on launch via `expo-device`; warning modal if detected.
4. Hermes bytecode compilation for JS bundle obfuscation.
5. `npm audit --audit-level=high` exits 0 in mobile CI before release.

---

### Requirement 8 — Mobile Observability

**User Story:** As an operator, I want crash reporting and status visibility in the mobile app.

#### Acceptance Criteria

1. Sentry React Native SDK SHALL report crashes + source maps uploaded at build time.
2. Settings → System Status screen SHALL show: API health, last sync, cache staleness, app version.
3. Settings → Developer Options (hidden, 5 taps on version) SHALL show admin dashboard, gated by API key + biometric.

---

### Requirement 9 — Performance Benchmarks

**User Story:** As a mobile trader, I want the app to be fast and lightweight.

#### Acceptance Criteria

1. Cold-start to interactive < 3 seconds on Snapdragon 665.
2. Analysis results rendered < 2 seconds after API response.
3. Chart animation >= 55fps.
4. Production APK size < 25MB.

---

### Requirement 10 — App Store & Play Store Release

**User Story:** As a product owner, I want the app published on both stores.

#### Acceptance Criteria

1. Expo EAS Build SHALL produce .apk/.aab (Android) and .ipa (iOS).
2. Fastlane SHALL automate screenshots, metadata, and release tagging.
3. A privacy policy screen SHALL be included (static React Native screen).
4. `npm audit --audit-level=high` exits 0 as pre-build gate in eas.json.

---

### Requirement 11 — Home Screen Widget (Stretch Goal)

**User Story:** As a mobile trader, I want at-a-glance stock info on my home screen.

#### Acceptance Criteria

1. Android: Glance API widget showing top-3 tickers + scores, refreshed every 15min.
2. iOS: WidgetKit extension showing the same.
3. Widget data read from MMKV cache (no additional API call).
