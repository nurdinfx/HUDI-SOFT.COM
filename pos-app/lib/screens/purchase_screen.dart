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
// Purchase Screen — clone of purchases.jsx
// Lists all purchase invoices; managers can add new purchases
// ─────────────────────────────────────────────────────────────

class PurchaseScreen extends StatefulWidget {
  const PurchaseScreen({super.key});

  @override
  State<PurchaseScreen> createState() => _PurchaseScreenState();
}

class _PurchaseScreenState extends State<PurchaseScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _api = ApiService();

  List<PurchaseInvoice> _purchases = [];
  List<Supplier>        _suppliers = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.getPurchases(),
        _api.getSuppliers(),
      ]);
      if (mounted) {
        setState(() {
          _purchases = results[0] as List<PurchaseInvoice>;
          _suppliers = results[1] as List<Supplier>;
          _loading   = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Add Purchase dialog ───────────────────────────────
  Future<void> _showAddPurchase(String sym) async {
    final formKey     = GlobalKey<FormState>();
    final amtCtrl     = TextEditingController();
    final invCtrl     = TextEditingController();
    final notesCtrl   = TextEditingController();
    String? suppId    = _suppliers.isNotEmpty ? _suppliers.first.id : null;
    String status     = 'pending';
    String payment    = 'cash';

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSt) => AlertDialog(
        title: const Text('New Purchase Invoice', style: TextStyle(fontWeight: FontWeight.w700)),
        content: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_suppliers.isNotEmpty)
                  DropdownButtonFormField<String>(
                    value: suppId,
                    decoration: const InputDecoration(labelText: 'Supplier *'),
                    items: _suppliers.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
                    onChanged: (v) => setSt(() => suppId = v),
                    validator: (v) => v == null ? 'Required' : null,
                  ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: invCtrl,
                  decoration: const InputDecoration(labelText: 'Invoice Number'),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: amtCtrl,
                  decoration: InputDecoration(labelText: 'Total Amount ($sym) *'),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Required';
                    if (double.tryParse(v) == null) return 'Invalid';
                    return null;
                  },
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: payment,
                  decoration: const InputDecoration(labelText: 'Payment Method'),
                  items: ['cash', 'card', 'mobile', 'credit']
                      .map((m) => DropdownMenuItem(value: m, child: Text(m.toUpperCase())))
                      .toList(),
                  onChanged: (v) => setSt(() => payment = v ?? payment),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: status,
                  decoration: const InputDecoration(labelText: 'Status'),
                  items: ['pending', 'paid', 'partial']
                      .map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase())))
                      .toList(),
                  onChanged: (v) => setSt(() => status = v ?? status),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: notesCtrl,
                  decoration: const InputDecoration(labelText: 'Notes (optional)'),
                  maxLines: 2,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              final res = await _api.createPurchase({
                'supplier':       suppId,
                'purchaseNumber': invCtrl.text.trim().isEmpty ? null : invCtrl.text.trim(),
                'grandTotal':     double.parse(amtCtrl.text),
                'paymentMethod':  payment,
                'status':         status,
                'notes':          notesCtrl.text.trim().isEmpty ? null : notesCtrl.text.trim(),
              });
              if (mounted) Navigator.pop(ctx);
              if (res['success'] == true) _loadAll();
            },
            child: const Text('Save'),
          ),
        ],
      )),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'paid':    return AppColors.success;
      case 'partial': return const Color(0xFFD97706);
      default:        return const Color(0xFF6B7280);
    }
  }

  String _formatDate(DateTime dt) {
    final d = dt.toLocal();
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final pos  = context.watch<PosProvider>();
    final sym  = pos.settings?.currencySymbol ?? '\$';
    final isManager = auth.user?.isManager ?? false;

    final totalAmt = _purchases.fold(0.0, (s, p) => s + p.totalAmount);

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/purchases',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      floatingActionButton: isManager
          ? FloatingActionButton.extended(
              onPressed: () => _showAddPurchase(sym),
              icon: const Icon(Icons.add),
              label: const Text('New Purchase'),
              backgroundColor: AppColors.primary,
            )
          : null,
      body: Column(
        children: [
          AppHeader(
            pageTitle: 'Purchases',
            isPos: false,
            onMenuTap: () => _scaffoldKey.currentState?.openDrawer(),
            onLogout: () async {
              await auth.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
          ),

          // Summary strip
          Container(
            color: AppColors.sidebarTop,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('TOTAL PURCHASES', style: TextStyle(fontSize: 9, color: Colors.white60, fontWeight: FontWeight.w600)),
                    Text('$sym${totalAmt.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)),
                  ],
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('INVOICES', style: TextStyle(fontSize: 9, color: Colors.white60, fontWeight: FontWeight.w600)),
                    Text('${_purchases.length}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)),
                  ],
                ),
                const Spacer(),
                IconButton(icon: const Icon(Icons.refresh, color: Colors.white, size: 20), onPressed: _loadAll),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),

          // List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _purchases.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.receipt_outlined, size: 48, color: AppColors.textMuted),
                            const SizedBox(height: 8),
                            Text('No purchases found', style: TextStyle(color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        itemCount: _purchases.length,
                        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.border),
                        itemBuilder: (_, i) {
                          final p = _purchases[i];
                          final sc = _statusColor(p.status);
                          return ListTile(
                            leading: Container(
                              width: 36, height: 36,
                              decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), shape: BoxShape.circle),
                              child: const Icon(Icons.shopping_bag_outlined, color: AppColors.primary, size: 18),
                            ),
                            title: Text(p.supplierName ?? 'Unknown Supplier',
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            subtitle: Text(
                              '${p.invoiceNumber ?? "No Invoice #"} • ${_formatDate(p.createdAt)}',
                              style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                            ),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text('$sym${p.totalAmount.toStringAsFixed(2)}',
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                                Container(
                                  margin: const EdgeInsets.only(top: 2),
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: sc.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(p.status.toUpperCase(),
                                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: sc)),
                                ),
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
