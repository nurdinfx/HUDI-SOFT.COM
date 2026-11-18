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
// Inventory Screen — clone of inventory.jsx
// Displays a list of catalog products, stock metrics, min stocks
// ─────────────────────────────────────────────────────────────

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _api = ApiService();

  List<Product> _products = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadInventory();
  }

  Future<void> _loadInventory() async {
    setState(() => _loading = true);
    try {
      final list = await _api.getProducts();
      if (mounted) setState(() { _products = list; _loading = false; });
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
          currentRoute: '/inventory',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      body: Column(
        children: [
          AppHeader(
            pageTitle: 'Inventory Control',
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
                Text('Products in Stock (${_products.length})',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.refresh, size: 20),
                  onPressed: _loadInventory,
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.border),

          // Table Headers
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(children: const [
              Expanded(flex: 3, child: Text('NAME / SKU', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              Expanded(flex: 2, child: Text('CATEGORY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              Expanded(flex: 1, child: Text('COST', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted), textAlign: TextAlign.right)),
              Expanded(flex: 1, child: Text('PRICE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted), textAlign: TextAlign.right)),
              Expanded(flex: 1, child: Text('STOCK', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted), textAlign: TextAlign.right)),
            ]),
          ),

          const Divider(height: 1, color: AppColors.border),

          // Main Inventory List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _products.isEmpty
                    ? Center(
                        child: Text('No stock data available', style: TextStyle(color: AppColors.textMuted)),
                      )
                    : ListView.builder(
                        itemCount: _products.length,
                        itemBuilder: (_, i) {
                          final p = _products[i];
                          final isLow = p.stock <= p.minStock;
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              border: Border(bottom: BorderSide(color: AppColors.border, width: 0.5)),
                            ),
                            child: Row(
                              children: [
                                Expanded(flex: 3,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(p.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                                      Text(p.sku ?? 'NO SKU', style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                    ],
                                  )),
                                Expanded(flex: 2, child: Text(p.category, style: const TextStyle(fontSize: 12))),
                                Expanded(flex: 1, child: Text('$sym${p.cost.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12), textAlign: TextAlign.right)),
                                Expanded(flex: 1, child: Text('$sym${p.price.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12), textAlign: TextAlign.right)),
                                Expanded(flex: 1,
                                  child: Text(
                                    '${p.stock}',
                                    style: TextStyle(
                                      fontSize: 12, fontWeight: FontWeight.w700,
                                      color: isLow ? AppColors.error : AppColors.success,
                                    ),
                                    textAlign: TextAlign.right,
                                  )),
                              ],
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
