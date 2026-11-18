import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_header.dart';
import '../widgets/app_sidebar.dart';

class EquityFinanceScreen extends StatefulWidget {
  const EquityFinanceScreen({super.key});

  @override
  State<EquityFinanceScreen> createState() => _EquityFinanceScreenState();
}

class _EquityFinanceScreenState extends State<EquityFinanceScreen> {
  final ApiService _api = ApiService();
  bool _isLoading = true;
  String _selectedPreset = 'month'; // 'today', 'month', 'all'
  Map<String, dynamic>? _dashboardData;
  List<dynamic> _accounts = [];
  String? _error;

  final NumberFormat _currencyFmt = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final now = DateTime.now();
      String? startDate;
      String? endDate;

      if (_selectedPreset == 'today') {
        final start = DateTime(now.year, now.month, now.day);
        startDate = start.toIso8601String().split('T')[0];
        endDate = now.toIso8601String().split('T')[0];
      } else if (_selectedPreset == 'month') {
        final start = DateTime(now.year, now.month, 1);
        startDate = start.toIso8601String().split('T')[0];
        endDate = now.toIso8601String().split('T')[0];
      }

      final results = await Future.wait([
        _api.getEquityDashboard(startDate: startDate, endDate: endDate),
        _api.getEquityAccounts(),
      ]);

      final dashRes = results[0];
      final accRes = results[1];

      if (mounted) {
        setState(() {
          if (dashRes['success'] == true) {
            _dashboardData = dashRes['data'] ?? dashRes;
          }
          if (accRes['success'] == true) {
            _accounts = accRes['data'] ?? [];
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  String _fmt(dynamic val) {
    if (val == null) return '\$0.00';
    final num? n = num.tryParse(val.toString());
    return n != null ? _currencyFmt.format(n) : '\$0.00';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: Row(
        children: [
          AppSidebar(currentRoute: '/equity-finance', onClose: () {}),
          Expanded(
            child: Column(
              children: [
                AppHeader(pageTitle: 'Equity & Financial Management', onMenuTap: () {}),
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : RefreshIndicator(
                          onRefresh: _loadData,
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildTopControls(),
                                const SizedBox(height: 20),
                                if (_error != null) _buildErrorBanner(),
                                _buildMetricCards(),
                                const SizedBox(height: 24),
                                _buildAccountsSection(),
                              ],
                            ),
                          ),
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopControls() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('QuickBooks-Grade Financial Ledger',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
            SizedBox(height: 4),
            Text('Real-time double-entry sync across POS, Debts & Inventory',
                style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
          ],
        ),
        Row(
          children: [
            _buildPresetButton('Today', 'today'),
            const SizedBox(width: 8),
            _buildPresetButton('This Month', 'month'),
            const SizedBox(width: 8),
            _buildPresetButton('All Time', 'all'),
            const SizedBox(width: 12),
            IconButton(
              icon: const Icon(Icons.refresh, color: AppColors.primary),
              onPressed: _loadData,
              tooltip: 'Refresh',
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPresetButton(String label, String preset) {
    final active = _selectedPreset == preset;
    return InkWell(
      onTap: () {
        setState(() => _selectedPreset = preset);
        _loadData();
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: active ? AppColors.primary : const Color(0xFFCBD5E1)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: active ? Colors.white : const Color(0xFF334155),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorBanner() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(_error ?? 'Failed to load financial records',
                style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCards() {
    final s = _dashboardData?['summary'] ?? {};
    return LayoutBuilder(
      builder: (context, constraints) {
        final cardWidth = (constraints.maxWidth - 48) / 4;
        return Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            _buildStatCard('Sales Revenue', _fmt(s['periodSales'] ?? s['sales']), Icons.trending_up, const Color(0xFF10B981), cardWidth),
            _buildStatCard('Cost of Goods (COGS)', _fmt(s['periodCogs'] ?? s['cogs']), Icons.shopping_basket_outlined, const Color(0xFFF59E0B), cardWidth),
            _buildStatCard('Gross Profit', _fmt(s['grossProfit']), Icons.monetization_on_outlined, const Color(0xFF3B82F6), cardWidth),
            _buildStatCard('Operating Expenses', _fmt(s['periodExpenses'] ?? s['expenses']), Icons.receipt_long_outlined, const Color(0xFFEF4444), cardWidth),
            _buildStatCard('Net Profit', _fmt(s['netProfit']), Icons.stars, const Color(0xFF8B5CF6), cardWidth),
            _buildStatCard('Customer Receivables', _fmt(s['accountsReceivable'] ?? s['debts']), Icons.people_outline, const Color(0xFF06B6D4), cardWidth),
            _buildStatCard('Inventory Asset', _fmt(s['inventoryValuation']), Icons.inventory_2_outlined, const Color(0xFF6366F1), cardWidth),
            _buildStatCard('Total Assets', _fmt(s['totalAssets']), Icons.account_balance, const Color(0xFF0F766E), cardWidth),
          ],
        );
      },
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color, double width) {
    return Container(
      width: width.clamp(200, 320),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 18, color: color),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
        ],
      ),
    );
  }

  Widget _buildAccountsSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Chart of Accounts & Liquid Balances',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              Text('${_accounts.length} Accounts Registered',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            ],
          ),
          const SizedBox(height: 16),
          if (_accounts.isEmpty)
            const Padding(
              padding: EdgeInsets.all(20),
              child: Center(child: Text('No accounts found. Default chart will seed on first activity.')),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _accounts.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, idx) {
                final acc = _accounts[idx];
                final name = acc['name'] ?? 'Account';
                final number = acc['accountNumber'] ?? '0000';
                final type = (acc['accountType'] ?? 'asset').toString().toUpperCase();
                final balance = acc['balance'] ?? 0;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(
                    backgroundColor: AppColors.primary.withOpacity(0.1),
                    child: Text(number.toString().substring(0, 1),
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                  ),
                  title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  subtitle: Text('Code: $number · $type', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  trailing: Text(_fmt(balance),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
                );
              },
            ),
        ],
      ),
    );
  }
}
