// ─────────────────────────────────────────────────────────────
// HUDI-SOFT POS App — Color System (exact match to PWA)
// Primary: #1e4c82 → #163a63 (sidebar gradient)
// Accent:  #2563eb (blue-600)
// ─────────────────────────────────────────────────────────────

import 'package:flutter/material.dart';

class AppColors {
  // Sidebar gradient colors (from Sidebar.jsx bg-gradient-to-b from-[#1e4c82] to-[#163a63])
  static const Color sidebarTop    = Color(0xFF1e4c82);
  static const Color sidebarBottom = Color(0xFF163a63);

  // Primary / Accent (--color-primary: #2563eb)
  static const Color primary       = Color(0xFF2563eb);
  static const Color primary600    = Color(0xFF1d4ed8);

  // Background (--color-bg: #f8fafc)
  static const Color background    = Color(0xFFF8FAFC);

  // Surface / Card (--color-surface: #ffffff)
  static const Color surface       = Color(0xFFFFFFFF);

  // Text (body: #0f172a)
  static const Color textDark      = Color(0xFF0F172A);
  static const Color textMuted     = Color(0xFF94A3B8);
  static const Color textSecondary = Color(0xFF64748B);

  // Border (--color-border: #e2e8f0)
  static const Color border        = Color(0xFFE2E8F0);

  // Status colors
  static const Color success       = Color(0xFF16A34A);
  static const Color error         = Color(0xFFDC2626);
  static const Color warning       = Color(0xFFD97706);
  static const Color info          = Color(0xFF0EA5E9);

  // Header (same as sidebar top)
  static const Color header        = Color(0xFF1e4c82);

  // Cart panel background
  static const Color cartBg        = Color(0xFFF8FAFC);

  // Order status chip colors
  static const Color statusPending    = Color(0xFFD97706);
  static const Color statusPreparing  = Color(0xFF2563EB);
  static const Color statusReady      = Color(0xFF16A34A);
  static const Color statusServed     = Color(0xFF7C3AED);
  static const Color statusCompleted  = Color(0xFF16A34A);
  static const Color statusCancelled  = Color(0xFFDC2626);

  // Payment badge colors
  static const Color paymentCash      = Color(0xFF16A34A);
  static const Color paymentCard      = Color(0xFF2563EB);
  static const Color paymentMobile    = Color(0xFF7C3AED);
  static const Color paymentCredit    = Color(0xFFD97706);
}

class AppTheme {
  static ThemeData get theme => ThemeData(
    useMaterial3: true,
    fontFamily: 'Inter',
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
      primary: AppColors.primary,
      surface: AppColors.surface,
    ),
    scaffoldBackgroundColor: AppColors.background,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.header,
      foregroundColor: Colors.white,
      elevation: 0,
    ),
    cardTheme: CardThemeData(
      color: AppColors.surface,
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border, width: 1),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: AppColors.primary, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    ),
    textTheme: const TextTheme(
      headlineLarge: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.textDark),
      headlineMedium: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.textDark),
      headlineSmall: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textDark),
      bodyLarge: TextStyle(fontSize: 14, color: AppColors.textDark),
      bodySmall: TextStyle(fontSize: 13, color: AppColors.textSecondary),
    ),
  );
}
