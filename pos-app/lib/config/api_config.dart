// ─────────────────────────────────────────────────────────────
// API Configuration — mirrors api.config.js from the PWA
// Backend: https://hudi-pos-online-aetz.onrender.com
// ─────────────────────────────────────────────────────────────

class ApiConfig {
  static const String backendUrl = 'https://hudi-pos-online-aetz.onrender.com';
  static const String apiUrl     = '$backendUrl/api/v1';
  static const String socketUrl  = backendUrl;

  // Auth & License endpoints
  static const String login    = '$apiUrl/auth/login';
  static const String activate = '$apiUrl/license/activate';
  static const String me       = '$apiUrl/auth/me';

  // POS data
  static const String products   = '$apiUrl/products';
  static const String categories = '$apiUrl/products/categories';
  static const String tables     = '$apiUrl/tables';
  static const String customers  = '$apiUrl/customers';
  static const String users      = '$apiUrl/users';
  static const String settings   = '$apiUrl/settings';

  // Orders & Sales
  static const String orders     = '$apiUrl/orders';
  static const String orderStats = '$apiUrl/orders/stats';
  static const String sales      = '$apiUrl/sales';

  // Reports
  static const String reports    = '$apiUrl/reports';

  // Management endpoints
  static const String employees  = '$apiUrl/employees';
  static const String attendance = '$apiUrl/attendance';
  static const String finance    = '$apiUrl/finance';
  static const String qr         = '$apiUrl/qr';
  static const String purchases  = '$apiUrl/purchases';
  static const String suppliers  = '$apiUrl/suppliers';

  // Equity & Financial Management
  static const String equityDashboard = '$apiUrl/equity-finance/dashboard';
  static const String equityAccounts  = '$apiUrl/equity-finance/accounts';
  static const String equityCashFlow  = '$apiUrl/equity-finance/cash-flow';
  static const String equityPnl       = '$apiUrl/equity-finance/profit-and-loss';
  static const String equityBalanceSheet = '$apiUrl/equity-finance/balance-sheet';
  static const String equityTransfers = '$apiUrl/equity-finance/transfers';
  static const String equityReceivables = '$apiUrl/equity-finance/receivables';
  static const String equityPayables  = '$apiUrl/equity-finance/payables';

  // AI Business Assistant
  static const String aiQuery    = '$apiUrl/ai-assistant/query';
  static const String aiInsights = '$apiUrl/ai-assistant/insights';
}
