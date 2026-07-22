# Design Document — MVP3 Native Mobile Application

## Overview

MVP3 ports the Bullish Stock Predictor to Android and iOS using React Native + Expo. A monorepo structure separates shared logic from platform-specific rendering.

---

## Monorepo Architecture

```
packages/
├── shared/              ← Framework-agnostic: API calls, scoring logic, data transforms
│   ├── src/api/         ← stockApi.ts (same logic as frontend/src/api/)
│   ├── src/scoring/     ← Scoring functions extracted from Python (for validation)
│   └── src/types/       ← TypeScript interfaces matching backend Pydantic models
├── web/                 ← MVP2 React app (imports from shared/)
└── mobile/              ← React Native + Expo app (imports from shared/)
    ├── src/
    │   ├── screens/     ← ScreenerScreen, WatchlistScreen, PortfolioScreen, SettingsScreen
    │   ├── components/  ← StockCard, CandlestickChart, OverlayToggles, StatusBanner
    │   ├── navigation/  ← BottomTabs + StackNavigators
    │   ├── hooks/       ← useAnalysis, useWatchlist, useBiometric, useNetworkStatus
    │   └── storage/     ← MMKV wrapper, SecureStore wrapper
    ├── app.json
    ├── eas.json
    └── metro.config.js
```

---

## Navigation Structure

```
BottomTabNavigator
├── ScreenerStack
│   ├── ScreenerScreen (results list)
│   └── TickerDetailScreen (indicators + chart)
├── WatchlistStack
│   ├── WatchlistScreen (saved tickers)
│   └── AlertConfigScreen (threshold setup)
├── PortfolioStack
│   └── PortfolioScreen (simulation results)
└── SettingsStack
    ├── SettingsScreen (preferences + indicator selection)
    ├── SystemStatusScreen (API health)
    └── DeveloperOptionsScreen (hidden admin panel)
```

---

## Data Flow (Mobile)

```
1. User opens Screener tab
2. TanStack Query checks MMKV cache
   └─ cache hit + fresh  →  render immediately
   └─ cache hit + stale  →  render stale + background refetch
   └─ cache miss          →  show loading + fetch from API
3. API response stored in MMKV + TanStack Query cache
4. User taps stock card → navigate to TickerDetailScreen
5. Detail screen calls GET /api/v1/ticker/{ticker} (or uses cached data offline)
```

---

## Push Notification Flow

```
1. App registers device token via POST /api/v2/alerts/register
2. Celery beat task (every 15min):
   a. Fetch all registered {device_token, ticker, threshold} from SQLite
   b. For each ticker: run scoring pipeline
   c. If score crosses threshold: send FCM/APNs push
3. User taps notification → React Navigation deep-link to TickerDetailScreen
```

---

## Backend Additions (MVP3)

```python
# New endpoint
@router.post("/api/v2/alerts/register")
async def register_alert(request: AlertRegisterRequest):
    """Store device token + ticker + threshold in SQLite alerts table."""
    ...

# New Celery task
@celery_app.task
def scan_watchlist_alerts():
    """Every 15min: re-score all watched tickers, fire push if threshold crossed."""
    ...
```

New dependencies: `celery==5.3.6`, `redis==5.0.4`, `firebase-admin==6.5.0`

---

## Mobile Security Architecture

| Layer | Control |
|---|---|
| Network | Certificate pinning (SHA-256 public key hash) |
| Storage | API key in expo-secure-store (Keychain/Keystore) |
| Auth | Biometric gate for watchlist edits |
| Runtime | Jailbreak/root detection + warning |
| Bundle | Hermes bytecode (obfuscation) |
| CI | npm audit --audit-level=high pre-build gate |

---

## Testing Strategy (MVP3)

| Layer | Tool | Scope |
|---|---|---|
| Unit | Jest + React Native Testing Library | Components, hooks, API client |
| Integration | Jest | Navigation flows, storage |
| E2E | Detox | Full app flows on Android + iOS |
| Performance | Detox + Flashlight | Cold start, chart fps, render time |

---

## MVP3 Dependencies (mobile/package.json)

```json
{
  "react-native": "0.74.x",
  "expo": "~51.0.0",
  "@react-navigation/native": "^6.0.0",
  "@react-navigation/bottom-tabs": "^6.0.0",
  "@react-navigation/stack": "^6.0.0",
  "@tanstack/react-query": "^5.0.0",
  "react-native-mmkv": "^2.12.0",
  "expo-secure-store": "~12.0.0",
  "expo-local-authentication": "~13.0.0",
  "expo-notifications": "~0.27.0",
  "expo-device": "~5.0.0",
  "react-native-gifted-charts": "^1.4.0",
  "react-native-gesture-handler": "~2.16.0",
  "@sentry/react-native": "^5.0.0",
  "@react-native-community/netinfo": "^11.0.0"
}
```
