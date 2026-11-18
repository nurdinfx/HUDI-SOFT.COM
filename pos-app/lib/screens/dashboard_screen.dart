import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/pos_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_sidebar.dart';
import '../widgets/app_header.dart';

// ─────────────────────────────────────────────────────────────
// Dashboard Screen — exact clone of dashboard.jsx
// Displays 8 stats cards, timeframe selection, recent activity
// ─────────────────────────────────────────────────────────────

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _api = ApiService();

  String _timeframe = 'today';
  bool _loading = false;
  Map<String, dynamic> _stats = {};
  List<dynamic> _recentActivity = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final res = await _api.getOrderStats(timeframe: _timeframe);
      if (res['success'] == true && mounted) {
        setState(() {
          _stats = res['stats'] ?? {};
          _recentActivity = res['recentActivity'] ?? [];
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final pos = context.watch<PosProvider>();
    final sym = pos.settings?.currencySymbol ?? '\$';

    final double todayRev = (_stats['todayRevenue'] ?? 0).toDouble();
    final double monthlyRev = (_stats['monthlyRevenue'] ?? 0).toDouble();
    final double avgValue = (_stats['averageOrderValue'] ?? 0).toDouble();

    final statCards = [
      _StatCardData(title: "Today's Revenue", value: '$sym${todayRev.toStringAsFixed(2)}', icon: Icons.attach_money, color: const Color(0xFF10B981)),
      _StatCardData(title: "Today's Orders", value: (_stats['todayOrders'] ?? 0).toString(), icon: Icons.shopping_cart, color: const Color(0xFF3B82F6)),
      _StatCardData(title: "Completed Orders", value: (_stats['completedOrders'] ?? 0).toString(), icon: Icons.check_circle, color: const Color(0xFF16A34A)),
      _StatCardData(title: "Monthly Revenue", value: '$sym${monthlyRev.toStringAsFixed(2)}', icon: Icons.trending_up, color: const Color(0xFF8B5CF6)),
      _StatCardData(title: "Total Customers", value: (_stats['totalCustomers'] ?? 0).toString(), icon: Icons.people, color: const Color(0xFFF59E0B)),
      _StatCardData(title: "Low Stock Items", value: (_stats['lowStockProducts'] ?? 0).toString(), icon: Icons.warning_amber, color: const Color(0xFFEF4444)),
      _StatCardData(title: "Available Tables", value: '${_stats['availableTables'] ?? 0}/25', icon: Icons.table_restaurant, color: const Color(0xFF6366F1)),
      _StatCardData(title: "Avg. Order Value", value: '$sym${avgValue.toStringAsFixed(2)}', icon: Icons.bar_chart, color: const Color(0xFF06B6D4)),
    ];

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/dashboard',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      body: Column(
        children: [
          // Header
          AppHeader(
            pageTitle: 'Dashboard Overview',
            isPos: false,
            onMenuTap: () => _scaffoldKey.currentState?.openDrawer(),
            onLogout: () async {
              await auth.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
          ),

          // Control Bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Text('Timeframe:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                const SizedBox(width: 8),
                _TimeframeBtn(label: 'Today', active: _timeframe == 'today', onTap: () => _changeTimeframe('today')),
                const SizedBox(width: 4),
                _TimeframeBtn(label: 'Week', active: _timeframe == 'week', onTap: () => _changeTimeframe('week')),
                const SizedBox(width: 4),
                _TimeframeBtn(label: 'Month', active: _timeframe == 'month', onTap: () => _changeTimeframe('month')),
                const Spacer(),
                ElevatedButton.icon(
                  icon: _loading
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.refresh, size: 14, color: Colors.white),
                  label: const Text('Refresh', style: TextStyle(fontSize: 12)),
                  onPressed: _loading ? null : _loadData,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    minimumSize: Size.zero,
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.border),

          // Stats & Activity
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 8-Stats Grid
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 220,
                      childAspectRatio: 1.8,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: statCards.length,
                    itemBuilder: (_, i) => _StatCardWidget(card: statCards[i]),
                  ),

                  const SizedBox(height: 20),

                  // Recent Activity
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.history_outlined, color: AppColors.primary, size: 18),
                              SizedBox(width: 8),
                              Text('Recent Operational Activity',
                                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                            ],
                          ),
                          const Divider(height: 20),
                          if (_loading && _recentActivity.isEmpty)
                            const Center(child: CircularProgressIndicator())
                          else if (_recentActivity.isEmpty)
                            const Center(
                              child: Padding(
                                padding: EdgeInsets.symmetric(vertical: 20),
                                child: Text('No recent activity recorded', style: TextStyle(color: AppColors.textMuted)),
                              ),
                            )
                          else
                            ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: _recentActivity.length,
                              itemBuilder: (_, i) {
                                final act = _recentActivity[i];
                                return ListTile(
                                  dense: true,
                                  leading: const Icon(Icons.circle, size: 8, color: AppColors.primary),
                                  title: Text(act['description'] ?? 'System Event',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                                  subtitle: Text(act['time'] ?? '',
                                      style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                );
                              },
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

  void _changeTimeframe(String t) {
    setState(() => _timeframe = t);
    _loadData();
  }
}

class _TimeframeBtn extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _TimeframeBtn({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: active ? AppColors.primary : AppColors.border),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 11, fontWeight: FontWeight.w600,
                color: active ? Colors.white : AppColors.textSecondary)),
      ),
    );
  }
}

class _StatCardData {
  final String title, value;
  final IconData icon;
  final Color color;

  _StatCardData({required this.title, required this.value, required this.icon, required this.color});
}

class _StatCardWidget extends StatelessWidget {
  final _StatCardData card;
  const _StatCardWidget({required this.card});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: card.color.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(card.icon, color: card.color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(card.title,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(card.value,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppColors.textDark)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
