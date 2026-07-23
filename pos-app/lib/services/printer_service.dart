import 'dart:typed_data';
import 'package:blue_thermal_printer/blue_thermal_printer.dart';
import '../models/models.dart';
import '../config/api_config.dart';

// ─────────────────────────────────────────────────────────────
// Bluetooth Printer Service — ESC/POS receipt printing
// Mirrors bluetoothPrint.js from PWA utils
// ─────────────────────────────────────────────────────────────

class PrinterService {
  static PrinterService? _instance;
  factory PrinterService() => _instance ??= PrinterService._();
  PrinterService._();

  final BlueThermalPrinter _printer = BlueThermalPrinter.instance;
  BluetoothDevice? _connectedDevice;

  bool get isConnected => _connectedDevice != null;
  BluetoothDevice? get connectedDevice => _connectedDevice;

  // ── Scan for available Bluetooth devices ─────────────
  Future<List<BluetoothDevice>> scanDevices() async {
    try {
      return await _printer.getBondedDevices();
    } catch (e) {
      return [];
    }
  }

  // ── Connect to a device ───────────────────────────────
  Future<bool> connect(BluetoothDevice device) async {
    try {
      await _printer.connect(device);
      _connectedDevice = device;
      return true;
    } catch (e) {
      _connectedDevice = null;
      return false;
    }
  }

  // ── Disconnect ────────────────────────────────────────
  Future<void> disconnect() async {
    try {
      await _printer.disconnect();
    } catch (_) {}
    _connectedDevice = null;
  }

  // ── Print Receipt for an Order ────────────────────────
  Future<bool> printReceipt({
    required Order order,
    required AppSettings settings,
    bool is80mm = false,
  }) async {
    if (!isConnected) return false;
    try {
      // Init printer
      _printer.printNewLine();

      // ── Header ────────────────────────────────────────
      _printer.printCustom(settings.restaurantName.toUpperCase(), 3, 1); // Bold, Center
      if (settings.tagline != null) {
        _printer.printCustom(settings.tagline!, 1, 1);
      }
      if (settings.address != null) {
        _printer.printCustom(settings.address!, 1, 1);
      }
      if (settings.phone != null) {
        _printer.printCustom('Tel: ${settings.phone}', 1, 1);
      }
      _printer.printNewLine();
      _printer.printCustom('================================', 1, 1);

      // ── Order Info ────────────────────────────────────
      _printer.printLeftRight('Order #:', order.orderNumber, 1);
      _printer.printLeftRight(
          'Date:', _formatDate(order.createdAt), 1);
      _printer.printLeftRight(
          'Time:', _formatTime(order.createdAt), 1);
      if (order.cashierName != null) {
        _printer.printLeftRight('Served by:', order.cashierName!, 1);
      }
      if (order.tableNumber != null) {
        _printer.printLeftRight('Table:', 'Table ${order.tableNumber}', 1);
      }
      if (order.customerName != null) {
        _printer.printLeftRight('Customer:', order.customerName!, 1);
      }
      _printer.printLeftRight(
          'Payment:', order.paymentMethod.toUpperCase(), 1);
      _printer.printCustom('================================', 1, 1);

      // ── Items ─────────────────────────────────────────
      _printer.printCustom('ITEMS', 2, 1);
      _printer.printCustom('--------------------------------', 1, 1);
      for (final item in order.items) {
        _printer.printCustom('${item.name}', 1, 0); // Left align
        _printer.printLeftRight(
            '  ${item.quantity} x ${settings.currencySymbol}${item.price.toStringAsFixed(2)}',
            '${settings.currencySymbol}${item.total.toStringAsFixed(2)}',
            1);
      }
      _printer.printCustom('================================', 1, 1);

      // ── Totals ────────────────────────────────────────
      _printer.printLeftRight(
          'Subtotal:', '${settings.currencySymbol}${order.subtotal.toStringAsFixed(2)}', 1);
      if (order.discount > 0) {
        _printer.printLeftRight(
            'Discount:', '-${settings.currencySymbol}${order.discount.toStringAsFixed(2)}', 1);
      }
      if (order.tax > 0) {
        _printer.printLeftRight(
            'VAT (${settings.vatRate.toInt()}%):',
            '${settings.currencySymbol}${order.tax.toStringAsFixed(2)}',
            1);
      }
      _printer.printCustom('================================', 1, 1);
      _printer.printLeftRight(
          'TOTAL:', '${settings.currencySymbol}${order.finalTotal.toStringAsFixed(2)}', 3);
      _printer.printCustom('================================', 1, 1);

      // ── Footer ────────────────────────────────────────
      _printer.printNewLine();
      if (settings.footer != null) {
        _printer.printCustom(settings.footer!, 1, 1);
      } else {
        _printer.printCustom('Thank you for your visit!', 1, 1);
        _printer.printCustom('Powered by HUDI-SOFT POS', 1, 1);
      }
      _printer.printNewLine();
      _printer.printNewLine();
      _printer.printNewLine();

      // Cut paper
      _printer.paperCut();
      return true;
    } catch (e) {
      return false;
    }
  }

  // ── Print Test Page ───────────────────────────────────
  Future<bool> printTest() async {
    if (!isConnected) return false;
    try {
      _printer.printNewLine();
      _printer.printCustom('HUDI-SOFT POS', 3, 1);
      _printer.printCustom('Printer Test Page', 1, 1);
      _printer.printCustom('================================', 1, 1);
      _printer.printCustom('If you see this, your printer', 1, 1);
      _printer.printCustom('is connected and working!', 1, 1);
      _printer.printCustom('================================', 1, 1);
      _printer.printNewLine();
      _printer.printNewLine();
      _printer.paperCut();
      return true;
    } catch (e) {
      return false;
    }
  }

  String _formatDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';

  String _formatTime(DateTime dt) {
    final h = dt.hour > 12 ? dt.hour - 12 : dt.hour == 0 ? 12 : dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ampm';
  }
}
