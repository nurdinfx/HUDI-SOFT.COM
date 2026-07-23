import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_sidebar.dart';
import '../widgets/app_header.dart';

// ─────────────────────────────────────────────────────────────
// License Management Screen — clone of admin-license.jsx
// Displays active licenses, keys, details
// ─────────────────────────────────────────────────────────────

class LicenseScreen extends StatefulWidget {
  const LicenseScreen({super.key});

  @override
  State<LicenseScreen> createState() => _LicenseScreenState();
}

class _LicenseScreenState extends State<LicenseScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _api = ApiService();

  List<dynamic> _licenses = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadLicenseInfo();
  }

  Future<void> _loadLicenseInfo() async {
    setState(() => _loading = true);
    try {
      final res = await _api.getMe(); // Fallback check or getLicensesInfo endpoint
      if (mounted) setState(() { _licenses = []; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/license',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      body: Column(
        children: [
          AppHeader(
            pageTitle: 'License Control',
            isPos: false,
            onMenuTap: () => _scaffoldKey.currentState?.openDrawer(),
            onLogout: () async {
              await auth.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
          ),

          // Action Toolbar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Text('Active Software Subscriptions',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.refresh, size: 20),
                  onPressed: _loadLicenseInfo,
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.border),

          // License card info
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: const [
                                    Icon(Icons.verified, color: AppColors.success, size: 20),
                                    SizedBox(width: 8),
                                    Text('License Status: ACTIVE',
                                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.success)),
                                  ],
                                ),
                                const Divider(height: 24),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.between,
                                  children: [
                                    const Text('Activated Key:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                    Text(auth.licenseKey ?? 'None', style: const TextStyle(fontSize: 12, fontFamily: 'monospace')),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                OutlinedButton(
                                  onPressed: () async {
                                    final confirm = await showDialog<bool>(
                                      context: context,
                                      builder: (_) => AlertDialog(
                                        title: const Text('Reset License?'),
                                        content: const Text('Deactivating will logout this device and require a new key.'),
                                        actions: [
                                          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
                                          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Deactivate')),
                                        ],
                                      ),
                                    );
                                    if (confirm == true) {
                                      await auth.resetLicense();
                                      if (mounted) Navigator.pushReplacementNamed(context, '/activate');
                                    }
                                  },
                                  style: OutlinedButton.styleFrom(foregroundColor: AppColors.error, side: BorderSide(color: AppColors.error)),
                                  child: const Text('Deactivate & Change License Key'),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
