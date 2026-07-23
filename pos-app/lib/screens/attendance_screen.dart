import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_sidebar.dart';
import '../widgets/app_header.dart';

// ─────────────────────────────────────────────────────────────
// Attendance Screen — clone of attendance.jsx
// Displays active shifts, employee check-in/out audit logs
// ─────────────────────────────────────────────────────────────

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _api = ApiService();

  List<AttendanceLog> _logs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAttendance();
  }

  Future<void> _loadAttendance() async {
    setState(() => _loading = true);
    try {
      final list = await _api.getAttendanceLogs();
      if (mounted) setState(() { _logs = list; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _formatTime(String? raw) {
    if (raw == null) return '-';
    final dt = DateTime.tryParse(raw);
    if (dt == null) return raw;
    final local = dt.toLocal();
    final h = local.hour > 12 ? local.hour - 12 : local.hour == 0 ? 12 : local.hour;
    final m = local.minute.toString().padLeft(2, '0');
    final ampm = local.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ampm';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/attendance',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      body: Column(
        children: [
          AppHeader(
            pageTitle: 'Staff Attendance',
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
                Text('Attendance Logs (${_logs.length})',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.refresh, size: 20),
                  onPressed: _loadAttendance,
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.border),

          // Table headers
          Container(
            color: AppColors.background,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(children: const [
              Expanded(flex: 3, child: Text('EMPLOYEE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              Expanded(flex: 2, child: Text('SHIFT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              Expanded(child: Text('CHECK IN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              Expanded(child: Text('CHECK OUT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              Expanded(child: Text('STATUS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted), textAlign: TextAlign.right)),
            ]),
          ),
          const Divider(height: 1, color: AppColors.border),

          // Log list
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _logs.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.calendar_month_outlined, size: 48, color: AppColors.textMuted),
                            const SizedBox(height: 8),
                            Text('No shifts recorded', style: TextStyle(color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        itemCount: _logs.length,
                        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.border),
                        itemBuilder: (_, i) {
                          final log = _logs[i];
                          final isPresent = log.checkOut == null;
                          final statusColor = isPresent ? AppColors.success : AppColors.textSecondary;
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            child: Row(
                              children: [
                                Expanded(flex: 3, child: Row(
                                  children: [
                                    const Icon(Icons.person, size: 16, color: AppColors.primary),
                                    const SizedBox(width: 6),
                                    Expanded(child: Text(log.employeeName ?? '-',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                                  ],
                                )),
                                Expanded(flex: 2, child: Text(log.shiftName ?? '-',
                                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary))),
                                Expanded(child: Text(_formatTime(log.checkIn),
                                    style: const TextStyle(fontSize: 12))),
                                Expanded(child: Text(_formatTime(log.checkOut),
                                    style: const TextStyle(fontSize: 12))),
                                Expanded(child: Align(
                                  alignment: Alignment.centerRight,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: statusColor.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      isPresent ? 'PRESENT' : 'LEFT',
                                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: statusColor),
                                    ),
                                  ),
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
