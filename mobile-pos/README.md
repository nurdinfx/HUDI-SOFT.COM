# HUDI POS Mobile App

A cross-platform React Native (Expo) mobile POS app for Android & iOS that connects to the existing HUDI POS cloud backend.

## Features

- 🔑 **License Activation** — Enter your cloud POS license key to link the device
- 👤 **Staff Login** — Authenticate with existing POS user credentials
- 🛒 **Full POS Terminal** — Product catalog, barcode scanner, cart, checkout
- 📶 **Offline-First** — SQLite local database, works without internet
- 🔄 **Real-time Sync** — WebSocket + REST sync with cloud backend
- 🖨️ **Bluetooth Printing** — ESC/POS thermal receipt printers (58mm/80mm)
- 📊 **Dashboard & Reports** — Sales stats, revenue, top products
- 👥 **Customer Management** — Registry, search, offline creation
- 🔔 **Push Notifications** — FCM alerts for new orders, low stock

## Setup

```bash
# Install dependencies
npm install --legacy-peer-deps

# Install Expo native packages at correct SDK version
npx expo install expo-application expo-camera expo-router expo-secure-store expo-sqlite expo-notifications

# Start dev server
npx expo start

# Android
npx expo start --android

# iOS (Mac required)
npx expo start --ios
```

## Build for Production

```bash
# Android APK/AAB
eas build --platform android

# iOS IPA
eas build --platform ios
```

## Backend Connection

The app connects to: `https://hudi-soft-com-online-pos.onrender.com/api/v1`

## Project Structure

```
mobile-pos/
├── src/
│   ├── app/                  ← Expo Router screens
│   │   ├── _layout.tsx       ← Root layout (auth guard, DB init)
│   │   ├── activation.tsx    ← License activation screen
│   │   ├── login.tsx         ← Staff login screen
│   │   └── (app)/            ← Authenticated tabs
│   │       ├── index.tsx     ← Dashboard
│   │       ├── pos.tsx       ← Point of Sale
│   │       ├── products.tsx  ← Product catalog
│   │       ├── orders.tsx    ← Order history & reprint
│   │       ├── customers.tsx ← Customer registry
│   │       ├── reports.tsx   ← Sales reports
│   │       └── settings.tsx  ← Printer & account settings
│   ├── api/                  ← HTTP client + endpoints
│   ├── db/                   ← SQLite offline database
│   │   └── repositories/     ← Data access layer
│   ├── store/                ← Zustand global state
│   ├── sync/                 ← Bidirectional sync engine
│   ├── printing/             ← Bluetooth ESC/POS printing
│   ├── notifications/        ← FCM push notifications
│   └── constants/            ← Colors, API URLs, keys
└── assets/                   ← App icons & splash
```
