# HUDI-SOFT POS Flutter App

A professional Flutter POS application — **exact clone** of the [Hudi-soft-pos.online](https://hudi-soft-com-online-pos.onrender.com) PWA system, rebuilt natively in Flutter for Android with Bluetooth thermal printing support.

## Features

| Feature | Status |
|---------|--------|
| ✅ License Activation Gate | Done |
| ✅ Staff Login (JWT auth) | Done |
| ✅ POS Screen (products + cart) | Done |
| ✅ Category filter bar | Done |
| ✅ Thumbnail / List view toggle | Done |
| ✅ Cart with qty controls | Done |
| ✅ Table selection | Done |
| ✅ Customer selection | Done |
| ✅ Payment method dropdown (Cash/Card/Mobile/Zaad/Sahal/Edahab) | Done |
| ✅ VAT toggle | Done |
| ✅ Discount dialog | Done |
| ✅ Order creation → REST API | Done |
| ✅ Orders Management screen | Done |
| ✅ Status filter chips | Done |
| ✅ Print / Pay / Cancel / Edit actions | Done |
| ✅ Bluetooth printer scan + connect | Done |
| ✅ ESC/POS thermal receipt printing | Done |
| ✅ Test print page | Done |
| ✅ Sidebar navigation (PWA colors exact) | Done |
| ✅ Header with live clock + logout | Done |
| ✅ Blue gradient sidebar #1e4c82→#163a63 | Done |

## Color System (Matches PWA Exactly)

```
Sidebar gradient: #1e4c82 → #163a63
Primary blue:     #2563eb
Background:       #f8fafc
Surface/Card:     #ffffff
Text dark:        #0f172a
Text muted:       #94a3b8
Border:           #e2e8f0
Success:          #16a34a
Error:            #dc2626
```

## Project Structure

```
lib/
├── main.dart                    # App entry, routes, providers
├── theme/
│   └── app_theme.dart           # Colors, ThemeData (matches PWA CSS vars)
├── config/
│   └── api_config.dart          # API endpoints (mirrors api.config.js)
├── models/
│   └── models.dart              # Product, Order, Customer, Table, User, Settings
├── services/
│   ├── api_service.dart         # REST API client (mirrors realApi.js)
│   └── printer_service.dart     # Bluetooth ESC/POS printer
├── providers/
│   ├── auth_provider.dart       # Login, license, session (mirrors AuthContext.jsx)
│   └── pos_provider.dart        # Cart, categories, order creation (mirrors pos.jsx state)
├── screens/
│   ├── activation_screen.dart   # License key entry
│   ├── login_screen.dart        # Email + password login
│   ├── pos_screen.dart          # Main POS split layout
│   ├── orders_screen.dart       # Order management
│   └── settings_screen.dart     # Bluetooth printer settings
└── widgets/
    ├── app_sidebar.dart          # Sidebar nav (exact clone of Sidebar.jsx)
    └── app_header.dart           # Header with hero section (exact clone of Header.jsx)
```

## Backend Connection

Connects to: `https://hudi-soft-com-online-pos.onrender.com/api/v1`

Same backend as the PWA — no changes needed to the server.

## How to Build APK

```bash
# 1. Make sure Flutter is installed and in PATH
flutter --version

# 2. Install dependencies
flutter pub get

# 3. Run on Android device or emulator
flutter run

# 4. Build release APK
flutter build apk --release

# The APK will be at:
# build/app/outputs/flutter-apk/app-release.apk
```

## Bluetooth Printer Setup

1. Turn on your thermal printer
2. Pair it via Android Bluetooth Settings
3. Open the POS app → Settings
4. Press "Scan Devices"
5. Press "Connect" next to your printer
6. Press "Test Print" to verify

Supports **58mm** and **80mm** ESC/POS printers (standard thermal receipt printers).
