# MVP3 — Native Mobile Application (Android & iOS)

> React Native + Expo, offline-first, push notifications, biometric security

## Status: 📋 Planned

## Spec Files
- [Requirements](.kiro/specs/mvp3-mobile/requirements.md)
- [Design](.kiro/specs/mvp3-mobile/design.md)
- [Tasks](.kiro/specs/mvp3-mobile/tasks.md)
- [Security Baseline](.kiro/steering/security.md)

---

## What's New Over MVP2

- **Native Android + iOS app** via React Native 0.74 + Expo SDK 51
- **Monorepo architecture**: shared logic extracted, web unchanged
- **Push notifications** (FCM for Android, APNs for iOS) + Celery/Redis scheduler
- **Offline-first** (TanStack Query + MMKV, stale-while-revalidate)
- **Native candlestick charts** (60fps, pinch-to-zoom, swipe-to-pan)
- **Biometric-gated watchlist** (Face ID / Touch ID / fingerprint)
- **Certificate pinning** (SHA-256 public key hash)
- **Secure Store** for API key (iOS Keychain / Android Keystore)
- **Jailbreak/root detection** with user warning
- **Sentry crash reporting** with source map upload
- **Home screen widget** (stretch: Android Glance + iOS WidgetKit)
- **EAS Build + Fastlane** for automated store release

---

## Architecture

```
packages/
├── shared/    ← API client + TypeScript types (framework-agnostic)
├── web/       ← MVP2 React app (unchanged, imports from shared/)
└── mobile/    ← React Native + Expo app (imports from shared/)
    ├── src/screens/       ← Screener, Watchlist, Portfolio, Settings
    ├── src/components/    ← StockCard, CandlestickChart, StatusBanner
    ├── src/navigation/    ← Bottom Tabs + Stack navigators
    ├── src/hooks/         ← useAnalysis, useWatchlist, useBiometric
    └── src/storage/       ← MMKV + SecureStore wrappers
```

---

## Key Commands

```bash
# Development
cd packages/mobile
npx expo start

# E2E Tests
npx detox test

# Production Build
eas build --platform all

# Security Gate
npm audit --audit-level=high
```

---

## Performance Targets

| Metric | Target | Device Class |
|---|---|---|
| Cold start to interactive | < 3 seconds | Snapdragon 665 |
| Results render after API response | < 2 seconds | Snapdragon 665 |
| Chart animation | ≥ 55fps (target 60) | Snapdragon 665 |
| Production APK size | < 25MB | — |

---

## Backend Additions (MVP3)

| Package | Purpose |
|---|---|
| `celery==5.3.6` | Background task scheduler |
| `redis==5.0.4` | Celery broker |
| `firebase-admin==6.5.0` | FCM push notification sending |

New endpoint: `POST /api/v2/alerts/register` (stores device token + ticker + threshold).

---

## Deployment

**Public — Google Play Store + Apple App Store.**

Production builds via Expo EAS Build. Fastlane for screenshot generation, metadata upload, and release tagging.

---

[← Back to Journey README](README.md)
