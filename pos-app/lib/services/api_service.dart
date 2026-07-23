import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../models/models.dart';

// ─────────────────────────────────────────────────────────────
// API Service — mirrors realApi.js from the PWA
// Handles auth tokens, all CRUD operations, error normalization
// ─────────────────────────────────────────────────────────────
class ApiService {
  static ApiService? _instance;
  factory ApiService() => _instance ??= ApiService._();
  ApiService._();

  String? _token;

  Future<String?> get token async {
    if (_token != null) return _token;
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    return _token;
  }

  Future<void> setToken(String? t) async {
    _token = t;
    final prefs = await SharedPreferences.getInstance();
    if (t != null) {
      await prefs.setString('auth_token', t);
    } else {
      await prefs.remove('auth_token');
    }
  }

  Future<Map<String, String>> _headers() async {
    final t = await token;
    return {
      'Content-Type': 'application/json',
      if (t != null) 'Authorization': 'Bearer $t',
    };
  }

  Future<Map<String, dynamic>> _get(String url, {Map<String, String>? query}) async {
    try {
      final uri = Uri.parse(url).replace(queryParameters: query);
      final res = await http.get(uri, headers: await _headers())
          .timeout(const Duration(seconds: 15));
      return _parse(res);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> _post(String url, Map<String, dynamic> body) async {
    try {
      final res = await http
          .post(Uri.parse(url), headers: await _headers(), body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
      return _parse(res);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> _put(String url, Map<String, dynamic> body) async {
    try {
      final res = await http
          .put(Uri.parse(url), headers: await _headers(), body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
      return _parse(res);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> _delete(String url) async {
    try {
      final res = await http
          .delete(Uri.parse(url), headers: await _headers())
          .timeout(const Duration(seconds: 15));
      return _parse(res);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Map<String, dynamic> _parse(http.Response res) {
    try {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return {'success': true, ...body};
      }
      return {'success': false, 'message': body['message'] ?? 'Error ${res.statusCode}'};
    } catch (_) {
      return {'success': false, 'message': 'Invalid server response'};
    }
  }

  // ── Public generic helpers ────────────────────────────
  /// Calls a path relative to ApiConfig.backendUrl (e.g. '/api/users')
  Future<Map<String, dynamic>> get(String path, {Map<String, String>? query}) =>
      _get('${ApiConfig.backendUrl}$path', query: query);

  // ── Auth ──────────────────────────────────────────────
  Future<Map<String, dynamic>> login(String email, String password) =>
      _post(ApiConfig.login, {'email': email, 'password': password});


  Future<Map<String, dynamic>> activateLicense(String key) =>
      _post(ApiConfig.activate, {'licenseKey': key});

  Future<Map<String, dynamic>> getMe() =>
      _get(ApiConfig.me);

  // ── Products ──────────────────────────────────────────
  Future<List<Product>> getProducts({String? category}) async {
    final query = <String, String>{};
    if (category != null && category != 'All') query['category'] = category;
    final res = await _get(ApiConfig.products, query: query);
    if (!res['success']) return [];
    final data = res['data'] ?? res['products'] ?? [];
    return (data as List).map((p) => Product.fromJson(p)).toList();
  }

  // ── Categories ────────────────────────────────────────
  Future<List<String>> getCategories() async {
    final res = await _get(ApiConfig.categories);
    if (!res['success']) return ['All'];
    final data = res['data'] ?? res['categories'] ?? [];
    final cats = (data as List).map((c) {
      if (c is String) return c;
      return c['name']?.toString() ?? '';
    }).where((s) => s.isNotEmpty).toList().cast<String>();
    return ['All', ...cats];
  }

  // ── Tables ────────────────────────────────────────────
  Future<List<PosTable>> getTables() async {
    final res = await _get(ApiConfig.tables);
    if (!res['success']) return [];
    final data = res['data'] ?? res['tables'] ?? [];
    return (data as List).map((t) => PosTable.fromJson(t)).toList();
  }

  // ── Customers ─────────────────────────────────────────
  Future<List<Customer>> getCustomers() async {
    final res = await _get(ApiConfig.customers);
    if (!res['success']) return [];
    final data = res['data'] ?? res['customers'] ?? [];
    return (data as List).map((c) => Customer.fromJson(c)).toList();
  }

  // ── Users ─────────────────────────────────────────────
  Future<List<AppUser>> getUsers() async {
    final res = await _get(ApiConfig.users);
    if (!res['success']) return [];
    final data = res['data'] ?? res['users'] ?? [];
    return (data as List).map((u) => AppUser.fromJson(u)).toList();
  }

  // ── Settings ──────────────────────────────────────────
  Future<AppSettings?> getSettings() async {
    final res = await _get(ApiConfig.settings);
    if (!res['success']) return null;
    final data = res['data'] ?? res['settings'] ?? res;
    return AppSettings.fromJson(data);
  }

  // ── Orders ────────────────────────────────────────────
  Future<Map<String, dynamic>> createOrder(Map<String, dynamic> orderData) =>
      _post(ApiConfig.orders, orderData);

  Future<List<Order>> getOrders({
    String? status,
    String? from,
    String? to,
    int limit = 100,
  }) async {
    final query = <String, String>{
      'limit': limit.toString(),
      if (status != null && status != 'all') 'status': status,
      if (from != null) 'from': from,
      if (to != null) 'to': to,
    };
    final res = await _get(ApiConfig.orders, query: query);
    if (!res['success']) return [];
    final data = res['data'] ?? res['orders'] ?? [];
    return (data as List).map((o) => Order.fromJson(o)).toList();
  }

  Future<Map<String, dynamic>> updateOrderStatus(String id, String status) =>
      _put('${ApiConfig.orders}/$id/status', {'status': status});

  Future<Map<String, dynamic>> payOrder(String id, Map<String, dynamic> data) =>
      _put('${ApiConfig.orders}/$id/pay', data);

  Future<Map<String, dynamic>> cancelOrder(String id) =>
      _put('${ApiConfig.orders}/$id/cancel', {});

  Future<Map<String, dynamic>> deleteOrder(String id) =>
      _delete('${ApiConfig.orders}/$id');

  // ── Dashboard Stats ───────────────────────────────────
  Future<Map<String, dynamic>> getOrderStats({String? timeframe}) async {
    final query = <String, String>{
      if (timeframe != null) 'timeframe': timeframe,
    };
    return _get(ApiConfig.orderStats, query: query);
  }

  // ── Tables (CRUD) ─────────────────────────────────────
  Future<Map<String, dynamic>> createTable(Map<String, dynamic> data) =>
      _post(ApiConfig.tables, data);

  Future<Map<String, dynamic>> updateTable(String id, Map<String, dynamic> data) =>
      _put('${ApiConfig.tables}/$id', data);

  Future<Map<String, dynamic>> deleteTable(String id) =>
      _delete('${ApiConfig.tables}/$id');

  Future<Map<String, dynamic>> updateTableStatus(String id, String status) =>
      _put('${ApiConfig.tables}/$id/status', {'status': status});

  // ── Waiter Requests ───────────────────────────────────
  Future<List<WaiterRequest>> getWaiterRequests({String? status}) async {
    final query = <String, String>{
      if (status != null) 'status': status,
    };
    final res = await _get('${ApiConfig.qr}/waiter-requests', query: query);
    if (!res['success']) return [];
    final data = res['data'] ?? res['waiterRequests'] ?? [];
    return (data as List).map((w) => WaiterRequest.fromJson(w)).toList();
  }

  Future<Map<String, dynamic>> resolveWaiterRequest(String id) =>
      _put('${ApiConfig.qr}/waiter-requests/$id', {'status': 'resolved'});

  // ── Attendance ────────────────────────────────────────
  Future<List<AttendanceLog>> getAttendanceLogs({Map<String, String>? query}) async {
    final res = await _get('${ApiConfig.attendance}/logs', query: query);
    if (!res['success']) return [];
    final data = res['data'] ?? res['logs'] ?? [];
    return (data as List).map((l) => AttendanceLog.fromJson(l)).toList();
  }

  // ── Finance Transactions ──────────────────────────────
  Future<Map<String, dynamic>> getFinanceTransactions({
    String? type,
    String? startDate,
    String? endDate,
    int page = 1,
    int limit = 50,
  }) async {
    final query = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
      if (type != null && type.isNotEmpty) 'type': type,
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
    };
    return _get('${ApiConfig.finance}/transactions', query: query);
  }

  Future<Map<String, dynamic>> createFinanceTransaction(Map<String, dynamic> data) =>
      _post('${ApiConfig.finance}/transactions', data);

  // ── Employees ─────────────────────────────────────────
  Future<List<Employee>> getEmployees() async {
    final res = await _get(ApiConfig.employees);
    if (!res['success']) return [];
    final data = res['data'] ?? res['employees'] ?? [];
    return (data as List).map((e) => Employee.fromJson(e)).toList();
  }

  Future<Map<String, dynamic>> createEmployee(Map<String, dynamic> data) =>
      _post(ApiConfig.employees, data);

  Future<Map<String, dynamic>> updateEmployee(String id, Map<String, dynamic> data) =>
      _put('${ApiConfig.employees}/$id', data);

  Future<Map<String, dynamic>> deleteEmployee(String id) =>
      _delete('${ApiConfig.employees}/$id');

  // ── Purchases ─────────────────────────────────────────
  Future<List<PurchaseInvoice>> getPurchases() async {
    final res = await _get(ApiConfig.purchases);
    if (!res['success']) return [];
    final data = res['data'] ?? res['purchases'] ?? [];
    return (data as List).map((p) => PurchaseInvoice.fromJson(p)).toList();
  }

  Future<Map<String, dynamic>> createPurchase(Map<String, dynamic> data) =>
      _post(ApiConfig.purchases, data);

  // ── Suppliers ─────────────────────────────────────────
  Future<List<Supplier>> getSuppliers() async {
    final res = await _get(ApiConfig.suppliers);
    if (!res['success']) return [];
    final data = res['data'] ?? res['suppliers'] ?? [];
    return (data as List).map((s) => Supplier.fromJson(s)).toList();
  }

  Future<Map<String, dynamic>> createSupplier(Map<String, dynamic> data) =>
      _post(ApiConfig.suppliers, data);

  // ── QR Management ─────────────────────────────────────
  Future<Map<String, dynamic>> getTablesWithQR() =>
      _get('${ApiConfig.qr}/tables');

  Future<Map<String, dynamic>> generateQR(String tableId) =>
      _post('${ApiConfig.qr}/tables/$tableId/generate', {});

  Future<Map<String, dynamic>> toggleQR(String tableId) =>
      _put('${ApiConfig.qr}/tables/$tableId/toggle', {});

  // ── Users (CRUD) ──────────────────────────────────────
  Future<Map<String, dynamic>> createUser(Map<String, dynamic> data) =>
      _post(ApiConfig.users, data);

  Future<Map<String, dynamic>> deleteUser(String id) =>
      _delete('${ApiConfig.users}/$id');
}
