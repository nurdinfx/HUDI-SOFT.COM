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
// Finance Screen — clone of finance.jsx
// Fetches merged transaction ledger (orders + purchases + manual)
// Allows Admin/Manager to record new manual transactions
// ─────────────────────────────────────────────────────────────

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _api = ApiService();

  List<FinanceTransaction> _transactions = [];
  double _totalIncome  = 0;
  double _totalExpense = 0;
  bool _loading = true;
  String _filterType = ''; // '' | 'income' | 'expense'

  @override
  void initState() {
    super.initState();
    _loadFinance();
  }

  Future<void> _loadFinance() async {
    setState(() => _loading = true);
    try {
      final res = await _api.getFinanceTransactions(
        type:  _filterType.isEmpty ? null : _filterType,
        limit: 100,
      );
      if (res['success'] == true && mounted) {
        final data = res['data'] ?? {};
        final txList = data['transactions'] as List<dynamic>? ?? [];
        setState(() {
          _transactions  = txList.map((t) => FinanceTransaction.fromJson(t)).toList();
          _totalIncome   = (data['totalIncome']  ?? 0).toDouble();
          _totalExpense  = (data['totalExpense'] ?? 0).toDouble();
          _loading = false;
        });
      } else {
        if (mounted) setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Add transaction dialog ─────────────────────────────
  Future<void> _showAddTransaction(String sym) async {
    final formKey    = GlobalKey<FormState>();
    String type      = 'income';
    final amtCtrl   = TextEditingController();
    final descCtrl  = TextEditingController();
    final refCtrl   = TextEditingController();
    String category  = 'General';
    String payment   = 'cash';

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSt) => AlertDialog(
        title: const Text('Record Transaction', style: TextStyle(fontWeight: FontWeight.w700)),
        content: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Type toggle
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setSt(() => type = 'income'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: type == 'income' ? AppColors.success : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.success),
                          ),
                          child: Text('Income',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13,
                                  color: type == 'income' ? Colors.white : AppColors.success)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setSt(() => type = 'expense'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: type == 'expense' ? AppColors.error : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.error),
                          ),
                          child: Text('Expense',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13,
                                  color: type == 'expense' ? Colors.white : AppColors.error)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: amtCtrl,
                  decoration: InputDecoration(labelText: 'Amount ($sym) *', prefixIcon: const Icon(Icons.attach_money, size: 18)),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Required';
                    if (double.tryParse(v) == null) return 'Invalid amount';
                    return null;
                  },
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: descCtrl,
                  decoration: const InputDecoration(labelText: 'Description *'),
                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: payment,
                  decoration: const InputDecoration(labelText: 'Payment Method'),
                  items: ['cash', 'card', 'mobile', 'zaad', 'sahal', 'edahab']
                      .map((m) => DropdownMenuItem(value: m, child: Text(m.toUpperCase())))
                      .toList(),
                  onChanged: (v) => setSt(() => payment = v ?? payment),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: refCtrl,
                  decoration: const InputDecoration(labelText: 'Reference (optional)'),
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
              final res = await _api.createFinanceTransaction({
                'type':          type,
                'amount':        double.parse(amtCtrl.text),
                'description':   descCtrl.text.trim(),
                'paymentMethod': payment,
                'reference':     refCtrl.text.trim(),
                'category':      category,
              });
              if (mounted) Navigator.pop(ctx);
              if (res['success'] == true) _loadFinance();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: type == 'income' ? AppColors.success : AppColors.error,
            ),
            child: const Text('Save'),
          ),
        ],
      )),
    );
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
    final netBalance = _totalIncome - _totalExpense;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/finance',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      floatingActionButton: isManager
          ? FloatingActionButton.extended(
              onPressed: () => _showAddTransaction(sym),
              icon: const Icon(Icons.add),
              label: const Text('Record'),
              backgroundColor: AppColors.primary,
            )
          : null,
      body: Column(
        children: [
          AppHeader(
            pageTitle: 'Financial Control',
            isPos: false,
            onMenuTap: () => _scaffoldKey.currentState?.openDrawer(),
            onLogout: () async {
              await auth.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
          ),

          // Summary bar
          Container(
            color: AppColors.sidebarTop,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _SummaryChip(label: 'Income', value: '$sym${_totalIncome.toStringAsFixed(2)}', color: AppColors.success),
                const SizedBox(width: 8),
                _SummaryChip(label: 'Expense', value: '$sym${_totalExpense.toStringAsFixed(2)}', color: AppColors.error),
                const SizedBox(width: 8),
                _SummaryChip(
                  label: 'Net',
                  value: '$sym${netBalance.abs().toStringAsFixed(2)}',
                  color: netBalance >= 0 ? AppColors.success : AppColors.error,
                ),
                const Spacer(),
                // Filter chips
                _FilterChip(label: 'All',     active: _filterType == '',        onTap: () { setState(() => _filterType = '');        _loadFinance(); }),
                const SizedBox(width: 4),
                _FilterChip(label: 'Income',  active: _filterType == 'income',  onTap: () { setState(() => _filterType = 'income');  _loadFinance(); }),
                const SizedBox(width: 4),
                _FilterChip(label: 'Expense', active: _filterType == 'expense', onTap: () { setState(() => _filterType = 'expense'); _loadFinance(); }),
                const SizedBox(width: 8),
                IconButton(icon: const Icon(Icons.refresh, color: Colors.white, size: 20), onPressed: _loadFinance),
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.border),

          // Transactions list
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _transactions.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.textMuted),
                            const SizedBox(height: 8),
                            Text('No financial records found', style: TextStyle(color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        itemCount: _transactions.length,
                        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.border),
                        itemBuilder: (_, i) {
                          final t = _transactions[i];
                          final isIncome = t.type == 'income';
                          final color = isIncome ? AppColors.success : AppColors.error;
                          return ListTile(
                            leading: Container(
                              width: 36, height: 36,
                              decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
                              child: Icon(
                                isIncome ? Icons.arrow_downward : Icons.arrow_upward,
                                color: color, size: 18,
                              ),
                            ),
                            title: Text(t.description,
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            subtitle: Text(
                              '${t.source.toUpperCase()} • ${t.paymentMethod.toUpperCase()} • ${_formatDate(t.date)}',
                              style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                            ),
                            trailing: Text(
                              '${isIncome ? "+" : "-"}$sym${t.amount.toStringAsFixed(2)}',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: color),
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

class _SummaryChip extends StatelessWidget {
  final String label, value;
  final Color color;
  const _SummaryChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 9, color: Colors.white70, fontWeight: FontWeight.w600)),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: color)),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active ? Colors.white : Colors.white24,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(label,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                color: active ? AppColors.sidebarTop : Colors.white)),
      ),
    );
  }
}
