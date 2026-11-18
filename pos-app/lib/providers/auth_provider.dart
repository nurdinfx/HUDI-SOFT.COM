import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../services/api_service.dart';

// ─────────────────────────────────────────────────────────────
// Auth Provider — mirrors AuthContext.jsx from the PWA
// Manages: license key, login state, user session, logout
// ─────────────────────────────────────────────────────────────
class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  AppUser? _user;
  String?  _licenseKey;
  bool     _isLoading  = false;
  String?  _error;
  bool     _initialized = false;

  AppUser? get user       => _user;
  String?  get licenseKey => _licenseKey;
  bool     get isLoading  => _isLoading;
  String?  get error      => _error;
  bool     get isLoggedIn => _user != null;
  bool     get initialized => _initialized;

  // ── Boot: Restore session from SharedPreferences ──────
  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    _licenseKey  = prefs.getString('license_key');
    final token  = prefs.getString('auth_token');

    if (token != null) {
      await _api.setToken(token);
      try {
        final res = await _api.getMe();
        if (res['success'] == true) {
          final data = res['data'] ?? res['user'] ?? res;
          _user = AppUser.fromJson(data);
        }
      } catch (_) {
        await _api.setToken(null);
      }
    }
    _initialized = true;
    notifyListeners();
  }

  // ── License Activation ────────────────────────────────
  Future<String?> activateLicense(String key) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _api.activateLicense(key);
      if (res['success'] == true) {
        _licenseKey = key;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('license_key', key);
        _isLoading = false;
        notifyListeners();
        return null; // success
      }
      _error = res['message'] ?? 'Activation failed';
      _isLoading = false;
      notifyListeners();
      return _error;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return _error;
    }
  }

  // ── Login ─────────────────────────────────────────────
  Future<String?> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _api.login(email, password);
      if (res['success'] == true) {
        final data   = res['data'] ?? res;
        final token  = data['token'] ?? res['token'];
        final userData = data['user'] ?? data;

        if (token != null) {
          await _api.setToken(token as String);
        }
        _user = AppUser.fromJson(userData);
        _isLoading = false;
        notifyListeners();
        return null; // success
      }
      _error = res['message'] ?? 'Login failed. Check credentials.';
      _isLoading = false;
      notifyListeners();
      return _error;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return _error;
    }
  }

  // ── Logout ────────────────────────────────────────────
  Future<void> logout() async {
    _user = null;
    await _api.setToken(null);
    notifyListeners();
  }

  // ── Reset License ─────────────────────────────────────
  Future<void> resetLicense() async {
    _licenseKey = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('license_key');
    await _api.setToken(null);
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
