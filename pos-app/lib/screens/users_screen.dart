import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_sidebar.dart';
import '../widgets/app_header.dart';

// ─────────────────────────────────────────────────────────────
// Users Screen — clone of users.jsx
// Lists all operator/user accounts; admin can add or delete
// ─────────────────────────────────────────────────────────────

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _api = ApiService();

  List<Map<String, dynamic>> _users = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() => _loading = true);
    try {
      final res = await _api.get('/api/users');
      if (res['success'] == true && mounted) {
        final data = (res['data'] ?? res['users']) as List<dynamic>? ?? [];
        setState(() {
          _users   = data.map((u) => Map<String, dynamic>.from(u as Map)).toList();
          _loading = false;
        });
      } else {
        if (mounted) setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Add user dialog ───────────────────────────────────
  Future<void> _showAddUser() async {
    final formKey   = GlobalKey<FormState>();
    final nameCtrl  = TextEditingController();
    final emlCtrl   = TextEditingController();
    final passCtrl  = TextEditingController();
    String role     = 'cashier';
    bool obscure    = true;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSt) => AlertDialog(
        title: const Text('Create User Account', style: TextStyle(fontWeight: FontWeight.w700)),
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
                TextFormField(
                  controller: emlCtrl,
                  decoration: const InputDecoration(labelText: 'Email *'),
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) => v == null || !v.contains('@') ? 'Valid email required' : null,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: passCtrl,
                  obscureText: obscure,
                  decoration: InputDecoration(
                    labelText: 'Password *',
                    suffixIcon: IconButton(
                      icon: Icon(obscure ? Icons.visibility : Icons.visibility_off, size: 18),
                      onPressed: () => setSt(() => obscure = !obscure),
                    ),
                  ),
                  validator: (v) => v == null || v.length < 6 ? 'At least 6 chars' : null,
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: role,
                  decoration: const InputDecoration(labelText: 'Role'),
                  items: ['admin', 'manager', 'cashier', 'waiter']
                      .map((r) => DropdownMenuItem(value: r, child: Text(r.toUpperCase())))
                      .toList(),
                  onChanged: (v) => setSt(() => role = v ?? role),
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
              final res = await _api.createUser({
                'name':     nameCtrl.text.trim(),
                'email':    emlCtrl.text.trim(),
                'password': passCtrl.text,
                'role':     role,
              });
              if (mounted) Navigator.pop(ctx);
              if (res['success'] == true) {
                _loadUsers();
              } else {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(res['message'] ?? 'Failed to create user'),
                      backgroundColor: AppColors.error,
                    ),
                  );
                }
              }
            },
            child: const Text('Create'),
          ),
        ],
      )),
    );
  }

  Future<void> _deleteUser(Map<String, dynamic> user) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete User?'),
        content: Text('Remove ${user['name'] ?? user['email'] ?? 'this user'} from the system?'),
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
      final id = user['_id'] ?? user['id'] ?? '';
      await _api.deleteUser(id);
      _loadUsers();
    }
  }

  Color _roleColor(String role) {
    switch (role) {
      case 'admin':   return const Color(0xFF7C3AED);
      case 'manager': return const Color(0xFF2563EB);
      case 'cashier': return const Color(0xFF0891B2);
      default:        return const Color(0xFF059669);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth       = context.watch<AuthProvider>();
    final isAdmin    = auth.user?.role == 'admin';
    final currentId  = auth.user?.id ?? '';

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/users',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      floatingActionButton: isAdmin
          ? FloatingActionButton.extended(
              onPressed: _showAddUser,
              icon: const Icon(Icons.person_add),
              label: const Text('Add User'),
              backgroundColor: AppColors.primary,
            )
          : null,
      body: Column(
        children: [
          AppHeader(
            pageTitle: 'User Accounts',
            isPos: false,
            onMenuTap: () => _scaffoldKey.currentState?.openDrawer(),
            onLogout: () async {
              await auth.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
          ),

          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Text('System Users (${_users.length})',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                const Spacer(),
                IconButton(icon: const Icon(Icons.refresh, size: 20), onPressed: _loadUsers),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _users.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.manage_accounts_outlined, size: 48, color: AppColors.textMuted),
                            const SizedBox(height: 8),
                            Text('No users found', style: TextStyle(color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        itemCount: _users.length,
                        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.border),
                        itemBuilder: (_, i) {
                          final u     = _users[i];
                          final id    = u['_id'] ?? u['id'] ?? '';
                          final name  = u['name'] ?? u['email'] ?? 'User';
                          final email = u['email'] ?? '';
                          final role  = u['role'] ?? 'cashier';
                          final rc    = _roleColor(role);
                          final isMe  = id == currentId;

                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: rc.withOpacity(0.15),
                              child: Text(
                                name.isNotEmpty ? name[0].toUpperCase() : '?',
                                style: TextStyle(color: rc, fontWeight: FontWeight.w800, fontSize: 14),
                              ),
                            ),
                            title: Row(
                              children: [
                                Text(name,
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                if (isMe) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text('YOU', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: AppColors.primary)),
                                  ),
                                ],
                              ],
                            ),
                            subtitle: Text(email, style: const TextStyle(fontSize: 11)),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: rc.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  child: Text(role.toUpperCase(),
                                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: rc)),
                                ),
                                if (isAdmin && !isMe)
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                                    onPressed: () => _deleteUser(u),
                                    tooltip: 'Delete user',
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
