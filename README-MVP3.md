# MVP3 — Native Mobile Application (Android & iOS)

## Status: 🟡 Built (awaiting Firebase setup)

React Native mobile app for BSE/NSE stock analysis with Google Sign-In authentication.

---

## Features

| Screen | Description |
|---|---|
| **Login** | Google Sign-In (Gmail federation) — only authorized users can access |
| **Screener** | Top 15 NIFTY stocks ranked by bullish score with pull-to-refresh |
| **Live Data** | Single ticker lookup with full indicator breakdown (RSI, MACD, BB, MA, Vol) |
| **Watchlist** | Add/remove tickers, persisted locally via MMKV |
| **Settings** | User profile, API health check, sign out |

### Security
- **Google OAuth 2.0** — only Gmail-federated users can sign in
- **Expo SecureStore** — auth tokens stored in device keychain
- **Auth guard** — all screens require valid session
- **Offline cache** — MMKV with TTL, stale data shown with warning banner

---

## Quick Start

### Prerequisites
1. **Node.js** 18+ installed
2. **Expo CLI**: `npm install -g expo-cli`
3. **Expo Go** app on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) | [iOS](https://apps.apple.com/app/expo-go/id982107779))
4. **Backend running**: `uvicorn src.api.main:app --reload` on your machine

### Setup

```bash
cd packages/mobile
npm install
```

### Configure Google Sign-In

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Create **two** client IDs:
   - **Web application** (for Expo Auth Session proxy)
   - **Android** (package: `com.bsense.stockpredictor`)
   - **iOS** (bundle ID: `com.bsense.stockpredictor`)
5. Copy the **Web client ID** and paste it in `src/context/AuthContext.js`:
   ```javascript
   const GOOGLE_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
   ```

### Configure API Endpoint

In `src/api/stockApi.js`, set the backend URL:
```javascript
// For Android emulator → localhost
const API_BASE_URL = 'http://10.0.2.2:8000';

// For iOS simulator
// const API_BASE_URL = 'http://localhost:8000';

// For physical device (use your machine's local IP)
// const API_BASE_URL = 'http://192.168.1.XXX:8000';
```

### Run

```bash
# Start Expo dev server
npx expo start

# Or target specific platform
npx expo start --android
npx expo start --ios
```

Scan the QR code with Expo Go on your phone, or press `a` for Android emulator / `i` for iOS simulator.

---

## Accessing on Android

### Method 1: Expo Go (Development)
1. Install [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) from Play Store
2. Run `npx expo start` on your machine
3. Scan QR code with Expo Go app
4. Ensure phone and computer are on same WiFi network

### Method 2: Development Build
```bash
npx expo run:android
```
Requires Android Studio with SDK installed.

### Method 3: Production APK (EAS Build)
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```
Downloads an APK you can install directly.

---

## Accessing on iOS

### Method 1: Expo Go (Development)
1. Install [Expo Go](https://apps.apple.com/app/expo-go/id982107779) from App Store
2. Run `npx expo start` on your machine
3. Scan QR code with iPhone camera
4. Ensure phone and computer are on same WiFi network

### Method 2: iOS Simulator (macOS only)
```bash
npx expo start --ios
```
Press `i` to open in iOS Simulator (requires Xcode installed).

### Method 3: Production Build (EAS)
```bash
eas build --platform ios --profile preview
```
Requires Apple Developer account ($99/year).

---

## Authentication Flow

```
User opens app
    → Not authenticated? → Show Login Screen
        → User taps "Sign in with Google"
        → Google OAuth consent screen
        → User grants access
        → App receives access token
        → Token stored in SecureStore
        → User info fetched from Google APIs
        → App redirects to Main (Screener tab)
    → Authenticated? → Show Main tabs directly
    → Sign Out → Clear SecureStore → Back to Login
```

**Unauthorized Access Prevention:**
- No screens are accessible without Google Sign-In
- Auth token is verified on each app launch
- Token stored in hardware-backed SecureStore (not AsyncStorage)
- Expired sessions automatically redirect to login

---

## Project Structure

```
packages/mobile/
├── App.js                          # Root: AuthProvider + NavigationContainer
├── app.json                        # Expo config (splash, icons, scheme)
├── package.json                    # Dependencies
├── babel.config.js
├── tsconfig.json
└── src/
    ├── api/
    │   └── stockApi.js             # Axios client with auth headers
    ├── context/
    │   └── AuthContext.js          # Google OAuth + SecureStore session
    ├── screens/
    │   ├── LoginScreen.js          # Google Sign-In UI
    │   ├── ScreenerScreen.js       # Bulk analysis with ranked results
    │   ├── LiveDataScreen.js       # Single ticker lookup + indicators
    │   ├── WatchlistScreen.js      # Local ticker watchlist (MMKV)
    │   └── SettingsScreen.js       # Profile, API status, sign out
    └── utils/
        └── storage.js              # MMKV caching + watchlist persistence
```

---

## Offline Support

| Network State | Behavior |
|---|---|
| Online | Fresh data fetched from API, cached in MMKV (30min TTL) |
| Offline | Last cached data shown with amber "offline" banner |
| Reconnected | Auto-refresh on pull-to-refresh |

---

## Environment Variables

The mobile app reads config from source code constants (no `.env` file needed):

| Constant | File | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `src/context/AuthContext.js` | Google OAuth Web client ID |
| `API_BASE_URL` | `src/api/stockApi.js` | Backend API URL |

---

## Dependencies

| Package | Purpose |
|---|---|
| `expo` ~51.0.0 | Framework |
| `@react-navigation/native` | Navigation |
| `@react-navigation/bottom-tabs` | Tab navigator |
| `expo-auth-session` | Google OAuth |
| `expo-secure-store` | Secure token storage |
| `expo-web-browser` | OAuth browser redirect |
| `react-native-mmkv` | Fast offline cache |
| `@react-native-community/netinfo` | Network status |
| `axios` | HTTP client |
