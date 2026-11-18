# Datel Clinic System — Mobile App Setup (Capacitor)

## Overview
The frontend is built with Next.js 15 (static export) and wrapped with Capacitor
to produce native Android and iOS apps — one codebase, three targets.

## Prerequisites
- Node.js 18+
- Android Studio (for Android)
- Xcode 15+ (for iOS, macOS only)
- Java 17+ (for Android builds)

## Setup Steps

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Build Next.js static export
```bash
npm run build
# This produces /out folder (static HTML/CSS/JS)
```

### 3. Initialize Capacitor
```bash
npx cap init "Datel Clinic" "com.hudisoft.datelclinic" --web-dir out
```

### 4. Add platforms
```bash
npx cap add android
npx cap add ios          # macOS only
```

### 5. Sync web assets to native
```bash
npx cap sync
```

### 6. Open in Android Studio
```bash
npx cap open android
```
Then in Android Studio: Build → Generate Signed Bundle/APK

### 7. Open in Xcode (macOS)
```bash
npx cap open ios
```
Then in Xcode: Product → Archive

## Configuration
Edit `capacitor.config.ts` to set:
- `appId` — your bundle identifier
- `appName` — display name
- `server.url` — point to your API in dev mode

## API Connectivity
The app uses `NEXT_PUBLIC_API_URL` at build time.
For mobile production builds, this should point to your live backend:
```
NEXT_PUBLIC_API_URL=https://datel-clinic-api.onrender.com/api
```

## Plugins Included
| Plugin | Purpose |
|--------|---------|
| `@capacitor/app` | App lifecycle (background/foreground) |
| `@capacitor/network` | Offline detection |
| `@capacitor/status-bar` | Native status bar |
| `@capacitor/push-notifications` | Push alerts |
| `@capacitor/storage` | Native key-value storage |

## Offline Mode
Basic offline caching is implemented via browser cache and localStorage.
Full offline mode can be extended with Service Workers.

## Build Script
```bash
# One-command web + mobile sync
npm run cap:sync   # builds Next.js then syncs Capacitor
npm run cap:android  # opens Android Studio
```
