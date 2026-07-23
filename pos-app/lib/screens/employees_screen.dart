import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_sidebar.dart';
import '../widgets/app_header.dart';

// ─────────────────────────────────────────────────────────────
// Employees Screen — clone of employees.jsx
// Manage staff: view, add, edit, delete employees
// ─────────────────────────────────────────────────────────────

class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});

  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _api = ApiService();

  List<Employee> _employees = [];
  List<Employee> _filtered  = [];
  bool _loading = true;
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadEmployees();
    _searchCtrl.addListener(_runFilter);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadEmployees() async {
    setState(() => _loading = true);
    try {
      final list = await _api.getEmployees();
      if (mounted) {
        setState(() {
          _employees = list;
          _filtered  = list;
          _loading   = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _runFilter() {
    final q = _searchCtrl.text.trim().toLowerCase();
    setState(() {
      _filtered = q.isEmpty
          ? _employees
          : _employees.where((e) =>
              e.name.toLowerCase().contains(q) ||
              (e.role.toLowerCase().contains(q)) ||
              (e.email?.toLowerCase().contains(q) ?? false)).toList();
    });
  }

  // ── Add / Edit dialog ─────────────────────────────────
  Future<void> _showEmployeeForm({Employee? emp}) async {
    final formKey  = GlobalKey<FormState>();
    final nameCtrl = TextEditingController(text: emp?.name ?? '');
    final emlCtrl  = TextEditingController(text: emp?.email ?? '');
    final phCtrl   = TextEditingController(text: emp?.phone ?? '');
    final salCtrl  = TextEditingController(text: (emp?.salary ?? 0).toString());
    String role    = emp?.role ?? 'cashier';

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSt) => AlertDialog(
        title: Text(emp == null ? 'Add Employee' : 'Edit Employee',
            style: const TextStyle(fontWeight: FontWeight.w700)),
        content: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Full Name *'),
                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: role,
                  decoration: const InputDecoration(labelText: 'Role'),
                  items: ['admin', 'manager', 'cashier', 'waiter', 'chef']
                      .map((r) => DropdownMenuItem(value: r, child: Text(r.toUpperCase())))
                      .toList(),
                  onChanged: (v) => setSt(() => role = v ?? role),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: emlCtrl,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: phCtrl,
                  decoration: const InputDecoration(labelText: 'Phone'),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: salCtrl,
                  decoration: const InputDecoration(labelText: 'Salary'),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
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
                'name':   nameCtrl.text.trim(),
                'role':   role,
                'email':  emlCtrl.text.trim().isEmpty ? null : emlCtrl.text.trim(),
                'phone':  phCtrl.text.trim().isEmpty ? null : phCtrl.text.trim(),
                'salary': double.tryParse(salCtrl.text) ?? 0,
              };
              final res = emp == null
                  ? await _api.createEmployee(data)
                  : await _api.updateEmployee(emp.id, data);
              if (mounted) Navigator.pop(ctx);
              if (res['success'] == true) _loadEmployees();
            },
            child: Text(emp == null ? 'Create' : 'Save'),
          ),
        ],
      )),
    );
  }

  Future<void> _deleteEmployee(Employee emp) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Employee?'),
        content: Text('Remove ${emp.name} from the system?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (ok == true) {
      await _api.deleteEmployee(emp.id);
      _loadEmployees();
    }
  }

  Color _roleColor(String role) {
    switch (role) {
      case 'admin':   return const Color(0xFF7C3AED);
      case 'manager': return const Color(0xFF2563EB);
      case 'cashier': return const Color(0xFF0891B2);
      case 'waiter':  return const Color(0xFF059669);
      default:        return const Color(0xFFD97706);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isManager = auth.user?.isManager ?? false;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/employees',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      floatingActionButton: isManager
          ? FloatingActionButton.extended(
              onPressed: () => _showEmployeeForm(),
              icon: const Icon(Icons.person_add),
              label: const Text('Add Employee'),
              backgroundColor: AppColors.primary,
            )
          : null,
      body: Column(
        children: [
          AppHeader(
            pageTitle: 'Employees',
            isPos: false,
            onMenuTap: () => _scaffoldKey.currentState?.openDrawer(),
            onLogout: () async {
              await auth.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
          ),

          // Search bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: 'Search employees…',
                      prefixIcon: const Icon(Icons.search, size: 18),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.border)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(icon: const Icon(Icons.refresh, size: 20), onPressed: _loadEmployees),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),

          // Total badge
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                Text('${_filtered.length} employee${_filtered.length != 1 ? 's' : ''}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
              ],
            ),
          ),

          // List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.group_off, size: 48, color: AppColors.textMuted),
                            const SizedBox(height: 8),
                            Text('No employees found', style: TextStyle(color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        itemCount: _filtered.length,
                        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.border),
                        itemBuilder: (_, i) {
                          final e = _filtered[i];
                          final rc = _roleColor(e.role);
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: rc.withOpacity(0.15),
                              child: Text(e.name.isNotEmpty ? e.name[0].toUpperCase() : '?',
                                  style: TextStyle(color: rc, fontWeight: FontWeight.w800, fontSize: 14)),
                            ),
                            title: Text(e.name,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (e.email != null) Text(e.email!, style: const TextStyle(fontSize: 11)),
                                if (e.phone != null) Text(e.phone!, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                              ],
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: rc.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  child: Text(e.role.toUpperCase(),
                                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: rc)),
                                ),
                                if (isManager) ...[
                                  IconButton(
                                    icon: const Icon(Icons.edit_outlined, size: 18),
                                    onPressed: () => _showEmployeeForm(emp: e),
                                    tooltip: 'Edit',
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                                    onPressed: () => _deleteEmployee(e),
                                    tooltip: 'Delete',
                                  ),
                                ],
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
