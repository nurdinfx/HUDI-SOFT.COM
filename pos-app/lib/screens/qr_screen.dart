import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_sidebar.dart';
import '../widgets/app_header.dart';

// ─────────────────────────────────────────────────────────────
// QR Screen — clone of qr-management.jsx
// Displays a table list; managers can generate, enable/disable QR
// ─────────────────────────────────────────────────────────────

class QrScreen extends StatefulWidget {
  const QrScreen({super.key});

  @override
  State<QrScreen> createState() => _QrScreenState();
}

class _QrScreenState extends State<QrScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _api = ApiService();

  List<Map<String, dynamic>> _tables = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadTables();
  }

  Future<void> _loadTables() async {
    setState(() => _loading = true);
    try {
      final res = await _api.getTablesWithQR();
      if (res['success'] == true && mounted) {
        final data = (res['data'] as List<dynamic>?) ?? [];
        setState(() {
          _tables  = data.map((t) => Map<String, dynamic>.from(t as Map)).toList();
          _loading = false;
        });
      } else {
        if (mounted) setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleQR(Map<String, dynamic> table) async {
    final res = await _api.toggleQR(table['_id'] ?? table['id'] ?? '');
    if (res['success'] == true) _loadTables();
  }

  Future<void> _generateQR(Map<String, dynamic> table) async {
    final res = await _api.generateQR(table['_id'] ?? table['id'] ?? '');
    if (res['success'] == true) {
      _loadTables();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('QR code generated!'), backgroundColor: AppColors.success),
        );
      }
    }
  }

  void _showQRDetail(Map<String, dynamic> table) {
    final qrUrl  = table['qrUrl']  as String? ?? '';
    final hasQR  = qrUrl.isNotEmpty;
    final isActive = table['qrEnabled'] as bool? ?? false;
    final tableNum = table['tableNumber'] ?? table['number'] ?? '?';

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Table $tableNum — QR Code', style: const TextStyle(fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (hasQR)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(qrUrl, width: 200, height: 200, fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Icon(Icons.qr_code_2, size: 80, color: AppColors.textMuted)),
              )
            else
              const Padding(
                padding: EdgeInsets.all(16),
                child: Icon(Icons.qr_code_2, size: 80, color: AppColors.textMuted),
              ),
            const SizedBox(height: 12),
            Text(
              hasQR ? (isActive ? 'QR is ACTIVE' : 'QR is DISABLED') : 'No QR generated yet',
              style: TextStyle(
                fontWeight: FontWeight.w700, fontSize: 13,
                color: hasQR ? (isActive ? AppColors.success : AppColors.error) : AppColors.textMuted,
              ),
            ),
            if (hasQR) ...[
              const SizedBox(height: 8),
              SelectableText(qrUrl, style: const TextStyle(fontSize: 9, color: AppColors.textMuted)),
            ],
          ],
        ),
        actions: [
          if (!hasQR)
            ElevatedButton.icon(
              icon: const Icon(Icons.qr_code, size: 14),
              label: const Text('Generate QR'),
              onPressed: () { Navigator.pop(context); _generateQR(table); },
            )
          else ...[
            TextButton(
              onPressed: () { Navigator.pop(context); _toggleQR(table); },
              child: Text(isActive ? 'Disable QR' : 'Enable QR'),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.refresh, size: 14),
              label: const Text('Regenerate'),
              onPressed: () { Navigator.pop(context); _generateQR(table); },
            ),
          ],
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/qr',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      body: Column(
        children: [
          AppHeader(
            pageTitle: 'QR Management',
            isPos: false,
            onMenuTap: () => _scaffoldKey.currentState?.openDrawer(),
            onLogout: () async {
              await auth.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
          ),

          // Toolbar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Text('Tables & QR Codes (${_tables.length})',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                const Spacer(),
                IconButton(icon: const Icon(Icons.refresh, size: 20), onPressed: _loadTables),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),

          // Grid
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _tables.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.qr_code_2, size: 48, color: AppColors.textMuted),
                            const SizedBox(height: 8),
                            Text('No tables found', style: TextStyle(color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(12),
                        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 180,
                          childAspectRatio: 0.85,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: _tables.length,
                        itemBuilder: (_, i) {
                          final t = _tables[i];
                          final hasQR   = (t['qrUrl'] as String? ?? '').isNotEmpty;
                          final isActive = t['qrEnabled'] as bool? ?? false;
                          final tableNum = t['tableNumber'] ?? t['number'] ?? '?';
                          return Card(
                            child: InkWell(
                              borderRadius: BorderRadius.circular(8),
                              onTap: () => _showQRDetail(t),
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      hasQR ? Icons.qr_code_2 : Icons.qr_code,
                                      size: 44,
                                      color: hasQR
                                          ? (isActive ? AppColors.success : AppColors.error)
                                          : AppColors.textMuted,
                                    ),
                                    const SizedBox(height: 6),
                                    Text('Table $tableNum',
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: (hasQR
                                                ? (isActive ? AppColors.success : AppColors.error)
                                                : AppColors.textMuted)
                                            .withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        hasQR ? (isActive ? 'ACTIVE' : 'DISABLED') : 'NO QR',
                                        style: TextStyle(
                                          fontSize: 9, fontWeight: FontWeight.w800,
                                          color: hasQR
                                              ? (isActive ? AppColors.success : AppColors.error)
                                              : AppColors.textMuted,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Tap to manage',
                                      style: const TextStyle(fontSize: 9, color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
