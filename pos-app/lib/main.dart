import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/pos_provider.dart';
import 'screens/activation_screen.dart';
import 'screens/login_screen.dart';
import 'screens/pos_screen.dart';
import 'screens/orders_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/kitchen_screen.dart';
import 'screens/tables_screen.dart';
import 'screens/waiter_screen.dart';
import 'screens/qr_screen.dart';
import 'screens/inventory_screen.dart';
import 'screens/customer_ledger_screen.dart';
import 'screens/finance_screen.dart';
import 'screens/purchase_screen.dart';
import 'screens/users_screen.dart';
import 'screens/employees_screen.dart';
import 'screens/attendance_screen.dart';
import 'screens/reports_screen.dart';
import 'screens/sales_screen.dart';
import 'screens/license_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Force portrait + landscape (POS needs landscape)
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
    DeviceOrientation.portraitUp,
  ]);

  // Hide status bar for immersive POS experience
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  runApp(const HudiPosApp());
}

class HudiPosApp extends StatelessWidget {
  const HudiPosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..initialize()),
        ChangeNotifierProvider(create: (_) => PosProvider()),
      ],
      child: MaterialApp(
        title: 'HUDI-SOFT POS',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.theme,
        initialRoute: '/splash',
        routes: {
          '/splash':   (_) => const _SplashRouter(),
          '/activate': (_) => const ActivationScreen(),
          '/login':    (_) => const LoginScreen(),
          '/pos':      (_) => const PosScreen(),
          '/orders':   (_) => const OrdersScreen(),
          '/settings': (_) => const SettingsScreen(),
          '/dashboard': (_) => const DashboardScreen(),
          '/kitchen':   (_) => const KitchenScreen(),
          '/tables':    (_) => const TablesScreen(),
          '/waiter':    (_) => const WaiterScreen(),
          '/qr-management': (_) => const QrScreen(),
          '/inventory': (_) => const InventoryScreen(),
          '/customers': (_) => const CustomerLedgerScreen(),
          '/finance':   (_) => const FinanceScreen(),
          '/purchase':  (_) => const PurchaseScreen(),
          '/users':     (_) => const UsersScreen(),
          '/employees': (_) => const EmployeesScreen(),
          '/attendance':(_) => const AttendanceScreen(),
          '/reports':   (_) => const ReportsScreen(),
          '/sales':     (_) => const SalesScreen(),
          '/license':   (_) => const LicenseScreen(),
        },
      ),
    );
  }
}

class _SplashRouter extends StatefulWidget {
  const _SplashRouter();

  @override
  State<_SplashRouter> createState() => _SplashRouterState();
}

class _SplashRouterState extends State<_SplashRouter> {
  @override
  void initState() {
    super.initState();
    _navigate();
  }

  Future<void> _navigate() async {
    final auth = context.read<AuthProvider>();
    while (!auth.initialized) {
      await Future.delayed(const Duration(milliseconds: 50));
    }
    if (!mounted) return;

    if (auth.licenseKey == null) {
      Navigator.pushReplacementNamed(context, '/activate');
    } else if (!auth.isLoggedIn) {
      Navigator.pushReplacementNamed(context, '/login');
    } else {
      Navigator.pushReplacementNamed(context, '/pos');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.sidebarTop,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: Colors.black38, blurRadius: 24)],
              ),
              padding: const EdgeInsets.all(12),
              child: Icon(Icons.point_of_sale, color: AppColors.primary, size: 48),
            ),
            const SizedBox(height: 20),
            const Text('HUDI-SOFT POS',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900,
                    color: Colors.white, letterSpacing: -0.5)),
            const SizedBox(height: 4),
            Text('Loading...', style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.6))),
            const SizedBox(height: 24),
            const CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
          ],
        ),
      ),
    );
  }
}
