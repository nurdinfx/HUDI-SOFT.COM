import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/pos_provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_sidebar.dart';
import '../widgets/app_header.dart';

// ─────────────────────────────────────────────────────────────
// Sales History Screen — clone of sales.jsx
// Displays a log of completed order transactions, bills
// ─────────────────────────────────────────────────────────────

class SalesScreen extends StatefulWidget {
  const SalesScreen({super.key});

  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _api = ApiService();

  List<Order> _sales = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSales();
  }

  Future<void> _loadSales() async {
    setState(() => _loading = true);
    try {
      final list = await _api.getOrders(status: 'completed');
      if (mounted) setState(() { _sales = list; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final pos = context.watch<PosProvider>();
    final sym = pos.settings?.currencySymbol ?? '\$';

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/sales',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      body: Column(
        children: [
          AppHeader(
            pageTitle: 'Sales History',
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
                Text('Completed Invoice Sales (${_sales.length})',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.refresh, size: 20),
                  onPressed: _loadSales,
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.border),

          // Main Sales List Table
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _sales.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.history_outlined, size: 48, color: AppColors.textMuted),
                            const SizedBox(height: 8),
                            Text('No completed transactions recorded', style: TextStyle(color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: _sales.length,
                        itemBuilder: (_, i) {
                          final sale = _sales[i];
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            child: ListTile(
                              leading: const Icon(Icons.receipt_outlined, color: AppColors.success),
                              title: Text(sale.orderNumber,
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.primary)),
                              subtitle: Text('Payment: ${sale.paymentMethod.toUpperCase()} • ${sale.createdAt.toLocal().toString().split(".")[0]}',
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                              trailing: Text(
                                '$sym${sale.finalTotal.toStringAsFixed(2)}',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textDark),
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
