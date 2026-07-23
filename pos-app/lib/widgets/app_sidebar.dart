import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

// ─────────────────────────────────────────────────────────────
// AppSidebar — exact clone of Sidebar.jsx
// bg-gradient-to-b from-[#1e4c82] to-[#163a63]
// Active item: white background, blue-700 text
// Inactive item: blue-100 text, hover blue-600 bg
// ─────────────────────────────────────────────────────────────

class SidebarItem {
  final String name;
  final IconData icon;
  final String route;
  final List<String> roles;

  const SidebarItem({
    required this.name,
    required this.icon,
    required this.route,
    required this.roles,
  });
}

const _navItems = [
  SidebarItem(name: 'Dashboard',       icon: Icons.dashboard_outlined,        route: '/dashboard',      roles: ['admin', 'manager']),
  SidebarItem(name: 'POS',             icon: Icons.point_of_sale_outlined,    route: '/pos',            roles: ['admin', 'manager', 'cashier', 'waiter']),
  SidebarItem(name: 'Kitchen',         icon: Icons.restaurant_outlined,       route: '/kitchen',        roles: ['admin', 'chef']),
  SidebarItem(name: 'Orders',          icon: Icons.receipt_long_outlined,     route: '/orders',         roles: ['admin', 'manager', 'cashier', 'waiter']),
  SidebarItem(name: 'Sales History',   icon: Icons.history_outlined,          route: '/sales',          roles: ['admin', 'manager']),
  SidebarItem(name: 'Tables',          icon: Icons.table_restaurant_outlined, route: '/tables',         roles: ['admin', 'manager', 'waiter']),
  SidebarItem(name: 'QR Management',   icon: Icons.qr_code_outlined,          route: '/qr-management',  roles: ['admin', 'manager']),
  SidebarItem(name: 'Waiter Board',    icon: Icons.notifications_outlined,    route: '/waiter',         roles: ['admin', 'manager', 'waiter']),
  SidebarItem(name: 'Inventory',       icon: Icons.inventory_2_outlined,      route: '/inventory',      roles: ['admin', 'manager']),
  SidebarItem(name: 'Customer Ledger', icon: Icons.menu_book_outlined,        route: '/customers',      roles: ['admin', 'manager', 'cashier']),
  SidebarItem(name: 'Finance',         icon: Icons.account_balance_outlined,  route: '/finance',        roles: ['admin', 'manager']),
  SidebarItem(name: 'Purchase',        icon: Icons.shopping_cart_outlined,    route: '/purchase',       roles: ['admin', 'manager']),
  SidebarItem(name: 'Users',           icon: Icons.people_outline,            route: '/users',          roles: ['admin', 'manager']),
  SidebarItem(name: 'Employees',       icon: Icons.badge_outlined,            route: '/employees',      roles: ['admin', 'manager']),
  SidebarItem(name: 'Attendance',      icon: Icons.calendar_month_outlined,   route: '/attendance',     roles: ['admin', 'manager']),
  SidebarItem(name: 'Reports',         icon: Icons.trending_up_outlined,      route: '/reports',        roles: ['admin', 'manager']),
  SidebarItem(name: 'Settings',        icon: Icons.settings_outlined,         route: '/settings',       roles: ['admin', 'manager']),
  SidebarItem(name: 'License Mgmt',    icon: Icons.verified_outlined,         route: '/license',        roles: ['admin']),
];

class AppSidebar extends StatelessWidget {
  final String currentRoute;
  final VoidCallback onClose;

  const AppSidebar({
    super.key,
    required this.currentRoute,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final auth    = context.watch<AuthProvider>();
    final role    = auth.user?.role ?? 'cashier';
    final filtered = _navItems.where((i) => i.roles.contains(role)).toList();
    final settings = null; // Will be injected from PosProvider in real flow

    return Container(
      width: 256,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end:   Alignment.bottomCenter,
          colors: [AppColors.sidebarTop, AppColors.sidebarBottom],
        ),
        boxShadow: [
          BoxShadow(
            color: Color(0x4D000000),
            blurRadius: 25,
            offset: Offset(5, 0),
          ),
        ],
      ),
      child: Column(
        children: [
          // ── Logo / Header ───────────────────────────────
          _SidebarHeader(onClose: onClose, role: role),

          // ── Navigation ─────────────────────────────────
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(12, 24, 12, 0),
              children: filtered.map((item) {
                final active = currentRoute == item.route ||
                    currentRoute.startsWith(item.route + '/');
                return _NavItem(item: item, active: active, onTap: () {
                  Navigator.of(context).pushReplacementNamed(item.route);
                  onClose();
                });
              }).toList(),
            ),
          ),

          // ── Logout ─────────────────────────────────────
          _LogoutButton(onLogout: () async {
            await auth.logout();
            if (context.mounted) {
              Navigator.of(context).pushReplacementNamed('/login');
            }
          }),
        ],
      ),
    );
  }
}

// ── Sidebar Header ────────────────────────────────────────────
class _SidebarHeader extends StatelessWidget {
  final VoidCallback onClose;
  final String role;

  const _SidebarHeader({required this.onClose, required this.role});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.10),
        border: Border(
          bottom: BorderSide(color: Colors.white.withOpacity(0.10)),
        ),
      ),
      child: Row(
        children: [
          // Logo box
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.2)),
              boxShadow: [
                BoxShadow(color: Colors.black26, blurRadius: 8),
              ],
            ),
            padding: const EdgeInsets.all(6),
            child: Image.asset('assets/images/logo.png',
                errorBuilder: (_, __, ___) => Icon(
                    Icons.point_of_sale, color: AppColors.primary, size: 28)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('HUDI-SOFT',
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w900,
                        color: Colors.white, letterSpacing: -0.5)),
                Text('POS ONLINE',
                    style: TextStyle(
                        fontSize: 9, fontWeight: FontWeight.w900,
                        color: Color(0xFFBFDBFE), letterSpacing: 1.5)),
              ],
            ),
          ),
          GestureDetector(
            onTap: onClose,
            child: const Icon(Icons.close, color: Color(0xFFBFDBFE), size: 22),
          ),
        ],
      ),
    );
  }
}

// ── Nav Item ─────────────────────────────────────────────────
class _NavItem extends StatelessWidget {
  final SidebarItem item;
  final bool active;
  final VoidCallback onTap;

  const _NavItem({required this.item, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: active ? Colors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              boxShadow: active
                  ? [BoxShadow(color: Colors.black26, blurRadius: 6)]
                  : null,
            ),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: active
                        ? const Color(0xFFDBEAFE)
                        : Colors.white.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    item.icon,
                    size: 17,
                    color: active
                        ? const Color(0xFF1d4ed8)
                        : const Color(0xFFBFDBFE),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(item.name,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: active
                            ? const Color(0xFF1d4ed8)
                            : const Color(0xFFDBEAFE),
                      )),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Logout Button ─────────────────────────────────────────────
class _LogoutButton extends StatelessWidget {
  final VoidCallback onLogout;
  const _LogoutButton({required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 24),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: const Color(0xFF3B82F6).withOpacity(0.4)),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onLogout,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.20),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.logout, size: 17,
                      color: Color(0xFFFCA5A5)),
                ),
                const SizedBox(width: 12),
                const Text('Logout',
                    style: TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600,
                      color: Color(0xFFFCA5A5),
                    )),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
