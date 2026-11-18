import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_sidebar.dart';
import '../widgets/app_header.dart';

// ─────────────────────────────────────────────────────────────
// Orders Screen — clone of orders.jsx (Order Management)
// Shows order list with status filters, search, totals bar,
// and actions: Print, View, Edit, Pay, Cancel
// ─────────────────────────────────────────────────────────────

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final _api         = ApiService();
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  List<Order> _orders    = [];
  bool        _loading   = true;
  String      _statusFilter = 'all';
  String      _searchQuery  = '';
  DateTime?   _fromDate;
  DateTime?   _toDate;

  final _statuses = ['all', 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() => _loading = true);
    final list = await _api.getOrders(
      status: _statusFilter == 'all' ? null : _statusFilter,
    );
    if (mounted) setState(() { _orders = list; _loading = false; });
  }

  List<Order> get _filtered {
    if (_searchQuery.isEmpty) return _orders;
    final q = _searchQuery.toLowerCase();
    return _orders.where((o) =>
      o.orderNumber.toLowerCase().contains(q) ||
      (o.customerName?.toLowerCase().contains(q) ?? false) ||
      (o.cashierName?.toLowerCase().contains(q) ?? false)
    ).toList();
  }

  // Stats
  double get _totalAmount  => _filtered.fold(0, (s, o) => s + o.finalTotal);
  double get _vatAmount    => _filtered.fold(0, (s, o) => s + o.tax);
  int    get _pendingCount => _filtered.where((o) => o.status == 'pending').length;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/orders',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      body: Column(
        children: [
          // ── Header ─────────────────────────────────────────
          AppHeader(
            pageTitle: 'Order Management',
            isPos: false,
            onMenuTap: () => _scaffoldKey.currentState?.openDrawer(),
            onLogout: () async {
              await auth.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
          ),

          // ── Stats bar: Total / VAT / Pending ───────────────
          Container(
            color: AppColors.sidebarTop,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                // Tabs: Orders | Other Printer | Pending
                _StatsChip(label: 'Orders', value: _filtered.length.toString(), color: Colors.white),
                const SizedBox(width: 8),
                _StatsChip(label: 'Pending', value: _pendingCount.toString(), color: const Color(0xFFFBBF24)),
                const Spacer(),
                _StatsChip(label: 'TOTAL', value: '\$${_totalAmount.toStringAsFixed(2)}', color: Colors.white),
                const SizedBox(width: 8),
                _StatsChip(label: 'VAT', value: '\$${_vatAmount.toStringAsFixed(2)}', color: const Color(0xFF86EFAC)),
                const SizedBox(width: 8),
                _StatsChip(label: 'PENDING', value: '\$${_filtered.where((o)=>o.status=="pending").fold(0.0,(s,o)=>s+o.finalTotal).toStringAsFixed(2)}', color: const Color(0xFFFBBF24)),
                const SizedBox(width: 12),
                // BT Pair
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('BT Pair', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),

          // ── Filters ────────────────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Column(
              children: [
                // Status filter chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _statuses.map((s) {
                      final active = _statusFilter == s;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: GestureDetector(
                          onTap: () {
                            setState(() => _statusFilter = s);
                            _loadOrders();
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              color: active ? _statusColor(s) : Colors.transparent,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: active ? _statusColor(s) : AppColors.border,
                              ),
                            ),
                            child: Text(s[0].toUpperCase() + s.substring(1),
                                style: TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.w600,
                                  color: active ? Colors.white : AppColors.textSecondary,
                                )),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 8),
                // Search
                TextField(
                  onChanged: (v) => setState(() => _searchQuery = v),
                  decoration: InputDecoration(
                    hintText: 'Order #, customer, cashier...',
                    hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 12),
                    prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.textMuted),
                    filled: true, fillColor: AppColors.background,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.border),

          // ── Table Header ────────────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(children: const [
              Expanded(flex: 3, child: Text('Order Info', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              Expanded(flex: 2, child: Text('Served by', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              Expanded(flex: 1, child: Text('Table', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              Expanded(flex: 2, child: Text('Customer', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              Expanded(flex: 2, child: Text('Payment', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              Expanded(flex: 1, child: Text('Amount', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted), textAlign: TextAlign.right)),
              Expanded(flex: 3, child: Text('Actions', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted), textAlign: TextAlign.right)),
            ]),
          ),

          const Divider(height: 1, color: AppColors.border),

          // ── Orders list ────────────────────────────────────
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.textMuted),
                            const SizedBox(height: 8),
                            Text('No orders found', style: TextStyle(color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadOrders,
                        child: ListView.builder(
                          itemCount: _filtered.length,
                          itemBuilder: (_, i) => _OrderRow(
                            order: _filtered[i],
                            onRefresh: _loadOrders,
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'pending':   return AppColors.statusPending;
      case 'preparing': return AppColors.statusPreparing;
      case 'ready':     return AppColors.statusReady;
      case 'served':    return AppColors.statusServed;
      case 'completed': return AppColors.statusCompleted;
      case 'cancelled': return AppColors.statusCancelled;
      default:          return AppColors.primary;
    }
  }
}

class _StatsChip extends StatelessWidget {
  final String label, value;
  final Color color;
  const _StatsChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 8, color: Colors.white.withOpacity(0.6), fontWeight: FontWeight.w600)),
        Text(value, style: TextStyle(fontSize: 13, color: color, fontWeight: FontWeight.w900)),
      ],
    );
  }
}

// ── Single Order Row ──────────────────────────────────────────
class _OrderRow extends StatelessWidget {
  final Order order;
  final VoidCallback onRefresh;

  const _OrderRow({required this.order, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    final api = ApiService();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppColors.border, width: 0.5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Order Info
          Expanded(flex: 3, child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(order.orderNumber,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary)),
              Text(_formatDate(order.createdAt),
                  style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
              const SizedBox(height: 2),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: _statusColor(order.status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _statusColor(order.status).withOpacity(0.3)),
                ),
                child: Text(order.status.toUpperCase(),
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700,
                        color: _statusColor(order.status))),
              ),
            ],
          )),
          // Served by
          Expanded(flex: 2, child: Text(order.cashierName ?? '-',
              style: const TextStyle(fontSize: 12))),
          // Table
          Expanded(flex: 1, child: Text(order.tableNumber ?? '-',
              style: const TextStyle(fontSize: 12))),
          // Customer
          Expanded(flex: 2, child: Text(order.customerName ?? 'Walking Customer',
              style: const TextStyle(fontSize: 12))),
          // Payment
          Expanded(flex: 2, child: _PaymentBadge(method: order.paymentMethod)),
          // Amount
          Expanded(flex: 1, child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('\$${order.finalTotal.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              Text('v:\$${order.tax.toStringAsFixed(2)}',
                  style: TextStyle(fontSize: 9, color: AppColors.textMuted)),
            ],
          )),
          // Actions
          Expanded(flex: 3, child: Wrap(
            spacing: 4, runSpacing: 4,
            alignment: WrapAlignment.end,
            children: [
              _ActionBtn(label: 'Print', color: AppColors.primary, onTap: () {}),
              _ActionBtn(label: 'View', color: AppColors.textSecondary, onTap: () {}),
              _ActionBtn(label: 'Edit', color: const Color(0xFF16A34A), onTap: () {}),
              if (order.paymentStatus == 'pending')
                _ActionBtn(label: 'Pay', color: const Color(0xFF7C3AED), onTap: () {}),
              _ActionBtn(
                label: 'X', color: AppColors.error,
                onTap: () async {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('Cancel Order?'),
                      content: Text('Cancel order ${order.orderNumber}?'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
                        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Yes, Cancel')),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    await api.cancelOrder(order.id);
                    onRefresh();
                  }
                },
              ),
            ],
          )),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final d = dt.toLocal();
    return '${d.month.toString().padLeft(2,'0')}/${d.day.toString().padLeft(2,'0')}/${d.year} '
           '${d.hour > 12 ? d.hour - 12 : d.hour}:${d.minute.toString().padLeft(2,'0')} ${d.hour >= 12 ? 'PM' : 'AM'}';
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'pending':   return AppColors.statusPending;
      case 'preparing': return AppColors.statusPreparing;
      case 'ready':     return AppColors.statusReady;
      case 'served':    return AppColors.statusServed;
      case 'completed': return AppColors.statusCompleted;
      case 'cancelled': return AppColors.statusCancelled;
      default:          return AppColors.primary;
    }
  }
}

class _PaymentBadge extends StatelessWidget {
  final String method;
  const _PaymentBadge({required this.method});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (method) {
      case 'card':   color = AppColors.paymentCard;   break;
      case 'mobile': color = AppColors.paymentMobile; break;
      case 'credit': color = AppColors.paymentCredit; break;
      default:       color = AppColors.paymentCash;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(method.toLowerCase(),
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionBtn({required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Text(label,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
      ),
    );
  }
}
