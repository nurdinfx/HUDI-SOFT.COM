import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_sidebar.dart';
import '../widgets/app_header.dart';

// ─────────────────────────────────────────────────────────────
// Tables Screen — clone of tables.jsx (Table Management)
// Displays a grid of tables colored by status with CRUD + status update
// ─────────────────────────────────────────────────────────────

class TablesScreen extends StatefulWidget {
  const TablesScreen({super.key});

  @override
  State<TablesScreen> createState() => _TablesScreenState();
}

class _TablesScreenState extends State<TablesScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _api = ApiService();

  List<PosTable> _tables = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadTables();
  }

  Future<void> _loadTables() async {
    setState(() => _loading = true);
    try {
      final list = await _api.getTables();
      if (mounted) setState(() { _tables = list; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Status update dialog ───────────────────────────────
  Future<void> _showTableActions(PosTable table, AppUser? user) async {
    final isManager = user?.isManager ?? false;
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Table ${table.number}', style: const TextStyle(fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Update status:', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: ['available', 'occupied', 'reserved', 'cleaning'].map((s) {
                final active = table.status == s;
                final col = _statusColor(s);
                return GestureDetector(
                  onTap: () async {
                    Navigator.pop(ctx);
                    final res = await _api.updateTableStatus(table.id, s);
                    if (res['success'] == true) _loadTables();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: active ? col : col.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: col),
                    ),
                    child: Text(
                      s.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w700,
                        color: active ? Colors.white : col,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            if (isManager) ...[
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  TextButton.icon(
                    icon: const Icon(Icons.edit, size: 16),
                    label: const Text('Edit'),
                    onPressed: () {
                      Navigator.pop(ctx);
                      _showTableForm(table: table);
                    },
                  ),
                  TextButton.icon(
                    icon: const Icon(Icons.delete, size: 16, color: AppColors.error),
                    label: const Text('Delete', style: TextStyle(color: AppColors.error)),
                    onPressed: () async {
                      Navigator.pop(ctx);
                      final ok = await _confirmDelete(table.number);
                      if (ok == true) {
                        await _api.deleteTable(table.id);
                        _loadTables();
                      }
                    },
                  ),
                ],
              ),
            ],
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ],
      ),
    );
  }

  Future<bool?> _confirmDelete(String tableNum) => showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Delete Table?'),
      content: Text('Are you sure you want to delete Table $tableNum?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Delete', style: TextStyle(color: AppColors.error)),
        ),
      ],
    ),
  );

  // ── Add / Edit form dialog ─────────────────────────────
  Future<void> _showTableForm({PosTable? table}) async {
    final numCtrl      = TextEditingController(text: table?.number ?? '');
    final nameCtrl     = TextEditingController(text: table?.name ?? '');
    final capCtrl      = TextEditingController(text: (table?.capacity ?? 4).toString());
    String location    = 'indoor';
    final formKey      = GlobalKey<FormState>();

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) => AlertDialog(
          title: Text(table == null ? 'Add New Table' : 'Edit Table ${table.number}'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: numCtrl,
                    decoration: const InputDecoration(labelText: 'Table Number *'),
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Name (optional)'),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: capCtrl,
                    decoration: const InputDecoration(labelText: 'Capacity'),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: location,
                    decoration: const InputDecoration(labelText: 'Location'),
                    items: ['indoor', 'outdoor', 'vip', 'terrace']
                        .map((l) => DropdownMenuItem(value: l, child: Text(l)))
                        .toList(),
                    onChanged: (v) => setSt(() => location = v ?? location),
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
                final data = {
                  'tableNumber': numCtrl.text.trim(),
                  'name': nameCtrl.text.trim().isEmpty ? null : nameCtrl.text.trim(),
                  'capacity': int.tryParse(capCtrl.text) ?? 4,
                  'location': location,
                };
                final res = table == null
                    ? await _api.createTable(data)
                    : await _api.updateTable(table.id, data);
                if (mounted) Navigator.pop(ctx);
                if (res['success'] == true) _loadTables();
              },
              child: Text(table == null ? 'Create' : 'Save'),
            ),
          ],
        ),
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'occupied': return const Color(0xFFDC2626);
      case 'reserved': return const Color(0xFF2563EB);
      case 'cleaning': return const Color(0xFFD97706);
      default:         return const Color(0xFF16A34A);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final isManager = user?.isManager ?? false;

    final avail = _tables.where((t) => t.status == 'available').length;
    final occup = _tables.where((t) => t.status == 'occupied').length;
    final reser = _tables.where((t) => t.status == 'reserved').length;
    final clean = _tables.where((t) => t.status == 'cleaning').length;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/tables',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      floatingActionButton: isManager
          ? FloatingActionButton.extended(
              onPressed: () => _showTableForm(),
              icon: const Icon(Icons.add),
              label: const Text('Add Table'),
              backgroundColor: AppColors.primary,
            )
          : null,
      body: Column(
        children: [
          AppHeader(
            pageTitle: 'Table Management',
            isPos: false,
            onMenuTap: () => _scaffoldKey.currentState?.openDrawer(),
            onLogout: () async {
              await auth.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
          ),

          // Stats Bar
          Container(
            color: AppColors.sidebarTop,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _StatsBadge(label: 'Available', value: avail.toString(), color: const Color(0xFF16A34A)),
                const SizedBox(width: 8),
                _StatsBadge(label: 'Occupied', value: occup.toString(), color: const Color(0xFFDC2626)),
                const SizedBox(width: 8),
                _StatsBadge(label: 'Reserved', value: reser.toString(), color: const Color(0xFF2563EB)),
                const SizedBox(width: 8),
                _StatsBadge(label: 'Cleaning', value: clean.toString(), color: const Color(0xFFD97706)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.refresh, color: Colors.white, size: 20),
                  onPressed: _loadTables,
                ),
              ],
            ),
          ),

          // Main Grid
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _tables.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.table_bar, size: 48, color: AppColors.textMuted),
                            const SizedBox(height: 8),
                            Text('No tables found', style: TextStyle(color: AppColors.textMuted)),
                            if (isManager) ...[
                              const SizedBox(height: 16),
                              ElevatedButton.icon(
                                icon: const Icon(Icons.add, size: 16),
                                label: const Text('Add First Table'),
                                onPressed: () => _showTableForm(),
                              ),
                            ],
                          ],
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 150,
                          childAspectRatio: 1,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: _tables.length,
                        itemBuilder: (_, i) => _TableGridTile(
                          table: _tables[i],
                          onTap: () => _showTableActions(_tables[i], user),
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _StatsBadge extends StatelessWidget {
  final String label, value;
  final Color color;

  const _StatsBadge({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w500)),
          const SizedBox(width: 6),
          Text(value, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

class _TableGridTile extends StatelessWidget {
  final PosTable table;
  final VoidCallback onTap;

  const _TableGridTile({required this.table, required this.onTap});

  Color get _color {
    switch (table.status) {
      case 'occupied': return const Color(0xFFDC2626);
      case 'reserved': return const Color(0xFF2563EB);
      case 'cleaning': return const Color(0xFFD97706);
      default:         return const Color(0xFF16A34A);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: _color, width: 2),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.table_restaurant, color: _color, size: 32),
              const SizedBox(height: 6),
              Text('Table ${table.number}',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textDark)),
              const SizedBox(height: 2),
              Text(table.status.toUpperCase(),
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: _color)),
            ],
          ),
        ),
      ),
    );
  }
}
