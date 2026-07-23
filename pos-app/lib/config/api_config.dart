// ─────────────────────────────────────────────────────────────
// API Configuration — mirrors api.config.js from the PWA
// Backend: https://hudi-soft-com-online-pos.onrender.com
// ─────────────────────────────────────────────────────────────

class ApiConfig {
  static const String backendUrl = 'https://hudi-soft-com-online-pos.onrender.com';
  static const String apiUrl     = '$backendUrl/api/v1';
  static const String socketUrl  = backendUrl;

  // Auth endpoints
  static const String login    = '$apiUrl/auth/login';
  static const String activate = '$apiUrl/license/activate';
  static const String me       = '$apiUrl/auth/me';

  // POS data
  static const String products   = '$apiUrl/products';
  static const String categories = '$apiUrl/categories';
  static const String tables     = '$apiUrl/tables';
  static const String customers  = '$apiUrl/customers';
  static const String users      = '$apiUrl/users';
  static const String settings   = '$apiUrl/settings';

  // Orders
  static const String orders    = '$apiUrl/orders';
  static const String orderStats= '$apiUrl/orders/stats';

  // Reports
  static const String reports   = '$apiUrl/reports';

  // Sales
  static const String sales     = '$apiUrl/sales';

  // Additional clone endpoints
  static const String employees  = '$apiUrl/employees';
  static const String attendance = '$apiUrl/attendance';
  static const String finance    = '$apiUrl/finance';
  static const String qr         = '$apiUrl/qr';
  static const String purchases  = '$apiUrl/purchases';
  static const String suppliers  = '$apiUrl/suppliers';
}
