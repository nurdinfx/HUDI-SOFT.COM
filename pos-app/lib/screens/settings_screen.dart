import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:blue_thermal_printer/blue_thermal_printer.dart';
import '../providers/auth_provider.dart';
import '../services/printer_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_sidebar.dart';
import '../widgets/app_header.dart';

// ─────────────────────────────────────────────────────────────
// Settings Screen — Bluetooth Printer management
// Scan devices → Connect → Print Test → Select size
// ─────────────────────────────────────────────────────────────

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _scaffoldKey  = GlobalKey<ScaffoldState>();
  final _printerSvc   = PrinterService();

  List<BluetoothDevice> _devices = [];
  bool _scanning    = false;
  bool _connecting  = false;
  bool _printing    = false;
  bool _is80mm      = false;
  String? _statusMsg;
  bool    _statusSuccess = true;

  @override
  void initState() {
    super.initState();
    _scanDevices();
  }

  Future<void> _scanDevices() async {
    setState(() { _scanning = true; _statusMsg = null; });
    _devices = await _printerSvc.scanDevices();
    setState(() => _scanning = false);
  }

  Future<void> _connect(BluetoothDevice device) async {
    setState(() { _connecting = true; _statusMsg = null; });
    final ok = await _printerSvc.connect(device);
    setState(() {
      _connecting   = false;
      _statusMsg    = ok ? '✓ Connected to ${device.name}' : '✗ Connection failed. Try again.';
      _statusSuccess = ok;
    });
  }

  Future<void> _printTest() async {
    setState(() { _printing = true; _statusMsg = null; });
    final ok = await _printerSvc.printTest();
    setState(() {
      _printing      = false;
      _statusMsg     = ok ? '✓ Test print sent!' : '✗ Print failed. Check connection.';
      _statusSuccess  = ok;
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/settings',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      body: Column(
        children: [
          AppHeader(
            pageTitle: 'System Settings',
            isPos: false,
            onMenuTap: () => _scaffoldKey.currentState?.openDrawer(),
            onLogout: () async {
              await auth.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Bluetooth Printer Card ──────────────────
                  _SectionCard(
                    title: 'Bluetooth Printer',
                    icon: Icons.print_outlined,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Connection status badge
                        Row(children: [
                          Container(
                            width: 8, height: 8,
                            decoration: BoxDecoration(
                              color: _printerSvc.isConnected ? AppColors.success : AppColors.error,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _printerSvc.isConnected
                                ? 'Connected: ${_printerSvc.connectedDevice?.name ?? "Printer"}'
                                : 'No printer connected',
                            style: TextStyle(
                              fontSize: 13,
                              color: _printerSvc.isConnected ? AppColors.success : AppColors.error,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ]),
                        const SizedBox(height: 16),

                        // Paper size toggle
                        Row(children: [
                          const Text('Paper Size:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          const SizedBox(width: 12),
                          _SizeToggle(label: '58mm', selected: !_is80mm, onTap: () => setState(() => _is80mm = false)),
                          const SizedBox(width: 8),
                          _SizeToggle(label: '80mm', selected: _is80mm, onTap: () => setState(() => _is80mm = true)),
                        ]),
                        const SizedBox(height: 16),

                        // Status message
                        if (_statusMsg != null)
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: _statusSuccess
                                  ? const Color(0xFFDCFCE7)
                                  : const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: _statusSuccess
                                    ? const Color(0xFF86EFAC)
                                    : const Color(0xFFFCA5A5),
                              ),
                            ),
                            child: Text(_statusMsg!,
                                style: TextStyle(
                                    fontSize: 12,
                                    color: _statusSuccess ? AppColors.success : AppColors.error,
                                    fontWeight: FontWeight.w600)),
                          ),

                        if (_statusMsg != null) const SizedBox(height: 12),

                        // Scan + Test Print buttons
                        Row(children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              icon: _scanning
                                  ? const SizedBox(width: 14, height: 14,
                                      child: CircularProgressIndicator(strokeWidth: 2))
                                  : const Icon(Icons.bluetooth_searching, size: 18),
                              label: Text(_scanning ? 'Scanning...' : 'Scan Devices'),
                              onPressed: _scanning ? null : _scanDevices,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.primary,
                                side: BorderSide(color: AppColors.primary),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              icon: _printing
                                  ? const SizedBox(width: 14, height: 14,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Icon(Icons.print, size: 18),
                              label: Text(_printing ? 'Printing...' : 'Test Print'),
                              onPressed: _printerSvc.isConnected && !_printing ? _printTest : null,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.success,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                        ]),
                        const SizedBox(height: 16),

                        // Devices list
                        if (_devices.isEmpty && !_scanning)
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.background,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Center(
                              child: Text(
                                'No paired Bluetooth devices found.\nPair your printer in Android Bluetooth Settings first.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                              ),
                            ),
                          )
                        else
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Available Devices (${_devices.length})',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                                      color: AppColors.textSecondary)),
                              const SizedBox(height: 8),
                              ..._devices.map((d) => _DeviceTile(
                                device: d,
                                isConnected: _printerSvc.connectedDevice?.address == d.address,
                                connecting: _connecting,
                                onConnect: () => _connect(d),
                              )),
                            ],
                          ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // ── Printer Instructions ────────────────────
                  _SectionCard(
                    title: 'How to Connect Your Printer',
                    icon: Icons.help_outline,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        _InstructionStep(num: '1', text: 'Turn on your Bluetooth thermal printer (58mm or 80mm)'),
                        _InstructionStep(num: '2', text: 'Go to Android Settings → Bluetooth → Pair New Device'),
                        _InstructionStep(num: '3', text: 'Pair your printer from the Android Bluetooth list'),
                        _InstructionStep(num: '4', text: 'Come back here and press "Scan Devices"'),
                        _InstructionStep(num: '5', text: 'Tap "Connect" next to your printer name'),
                        _InstructionStep(num: '6', text: 'Press "Test Print" to confirm it works!'),
                      ],
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
}

class _SizeToggle extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _SizeToggle({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: selected ? AppColors.primary : AppColors.border),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.w600,
                color: selected ? Colors.white : AppColors.textSecondary)),
      ),
    );
  }
}

class _DeviceTile extends StatelessWidget {
  final BluetoothDevice device;
  final bool isConnected;
  final bool connecting;
  final VoidCallback onConnect;

  const _DeviceTile({
    required this.device,
    required this.isConnected,
    required this.connecting,
    required this.onConnect,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isConnected ? const Color(0xFFEFF6FF) : Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isConnected ? AppColors.primary : AppColors.border,
          width: isConnected ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.bluetooth,
            color: isConnected ? AppColors.primary : AppColors.textMuted,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(device.name ?? 'Unknown Device',
                    style: TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600,
                      color: isConnected ? AppColors.primary : AppColors.textDark,
                    )),
                Text(device.address ?? '',
                    style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
              ],
            ),
          ),
          if (isConnected)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.success.withOpacity(0.3)),
              ),
              child: Text('Connected',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.success)),
            )
          else
            ElevatedButton(
              onPressed: connecting ? null : onConnect,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                minimumSize: Size.zero,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
              ),
              child: connecting
                  ? const SizedBox(width: 12, height: 12,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Connect', style: TextStyle(fontSize: 11)),
            ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;

  const _SectionCard({required this.title, required this.icon, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Row(children: [
              Icon(icon, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(title,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700,
                      color: AppColors.textDark)),
            ]),
          ),
          Padding(padding: const EdgeInsets.all(16), child: child),
        ],
      ),
    );
  }
}

class _InstructionStep extends StatelessWidget {
  final String num, text;
  const _InstructionStep({required this.num, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 20, height: 20,
            decoration: BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(num,
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white)),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: AppColors.textDark))),
        ],
      ),
    );
  }
}
