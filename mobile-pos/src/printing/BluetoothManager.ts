import { Platform } from 'react-native';
import { usePrinterStore, BluetoothPrinterDevice } from '@/store/printerStore';

// Dynamic import of native modules with safe fallbacks
let NativeBluetoothManager: any = null;
let NativeEscposPrinter: any = null;

if (Platform.OS === 'android') {
  try {
    const printerModule = require('react-native-bluetooth-escpos-printer');
    NativeBluetoothManager = printerModule.BluetoothManager;
    NativeEscposPrinter = printerModule.BluetoothEscposPrinter;
  } catch (err) {
    console.warn('Native printer module not loaded:', err);
  }
}

export const BluetoothManager = {
  // Is Bluetooth supported and enabled?
  async isEnabled(): Promise<boolean> {
    if (!NativeBluetoothManager) {
      console.log('Bluetooth mock: enabled status check');
      return true;
    }
    try {
      const enabled = await NativeBluetoothManager.isBluetoothEnabled();
      return !!enabled;
    } catch {
      return false;
    }
  },

  // Request user to turn on Bluetooth (Android-only)
  async enable(): Promise<boolean> {
    if (!NativeBluetoothManager) return true;
    try {
      await NativeBluetoothManager.enableBluetooth();
      return true;
    } catch {
      return false;
    }
  },

  // Scan for nearby printers (returns paired + available list)
  async scan(): Promise<{ paired: BluetoothPrinterDevice[]; found: BluetoothPrinterDevice[] }> {
    if (!NativeBluetoothManager) {
      // Mock devices for simulator testing
      return {
        paired: [
          { name: 'XPrinter 58mm (Mock)', address: '00:11:22:33:44:55' },
          { name: 'Star TSP100 (Mock)', address: '88:77:66:55:44:33' }
        ],
        found: [
          { name: 'POS-80-Printer (Mock)', address: 'AA:BB:CC:DD:EE:FF' }
        ]
      };
    }

    try {
      const resultStr = await NativeBluetoothManager.scanDevices();
      const results = JSON.parse(resultStr);

      const mapDevice = (d: any) => ({
        name: d.name || 'Unknown Printer',
        address: d.address,
      });

      return {
        paired: (results.paired || []).map(mapDevice),
        found: (results.found || []).map(mapDevice),
      };
    } catch (err) {
      console.error('Scan failed:', err);
      return { paired: [], found: [] };
    }
  },

  // Connect to a specific printer address
  async connect(address: string): Promise<boolean> {
    const store = usePrinterStore.getState();
    store.setConnecting(true);

    if (!NativeBluetoothManager) {
      // Simulate connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      store.setConnected(true);
      return true;
    }

    try {
      await NativeBluetoothManager.connect(address);
      store.setConnected(true);
      return true;
    } catch (err) {
      console.error('Connection failed:', err);
      store.setConnected(false);
      return false;
    }
  },

  // Disconnect from printer
  async disconnect(): Promise<void> {
    const store = usePrinterStore.getState();
    if (!NativeBluetoothManager) {
      store.setConnected(false);
      return;
    }
    try {
      // Library doesn't always expose disconnect, but connecting to null or empty can act as reset
      // or we just track connection state in store.
      store.setConnected(false);
    } catch (err) {
      console.error('Disconnect failed:', err);
    }
  },

  // Print raw bytes command array or lines
  async printReceipt(items: any[], details: any): Promise<boolean> {
    const store = usePrinterStore.getState();
    if (!store.isConnected) {
      console.log('Printer not connected. Cannot print receipt.');
      return false;
    }

    if (!NativeEscposPrinter) {
      console.log('=== MOCK PRINT RECEIPT ===');
      console.log('Items:', items);
      console.log('Details:', details);
      console.log('==========================');
      return true;
    }

    try {
      // Basic formatting commands
      await NativeEscposPrinter.printerInit();
      await NativeEscposPrinter.printerAlign(NativeEscposPrinter.ALIGN.CENTER);
      
      // Header
      await NativeEscposPrinter.printText('HUDI POS RECEIPT\n', {
        fonttype: 0,
        heigth: 1,
        width: 1,
      });
      await NativeEscposPrinter.printText(`${details.created_at}\n`, {});
      await NativeEscposPrinter.printText('--------------------------------\n', {});

      // Print columns for items
      const is58mm = store.paperSize === '58mm';
      const colWidths = is58mm ? [16, 4, 12] : [24, 6, 18];
      
      await NativeEscposPrinter.printColumn(
        colWidths,
        [NativeEscposPrinter.ALIGN.LEFT, NativeEscposPrinter.ALIGN.CENTER, NativeEscposPrinter.ALIGN.RIGHT],
        ['Item', 'Qty', 'Amount'],
        {}
      );
      await NativeEscposPrinter.printText('--------------------------------\n', {});

      for (const item of items) {
        await NativeEscposPrinter.printColumn(
          colWidths,
          [NativeEscposPrinter.ALIGN.LEFT, NativeEscposPrinter.ALIGN.CENTER, NativeEscposPrinter.ALIGN.RIGHT],
          [item.name, String(item.qty), `$${(item.price * item.qty).toFixed(2)}`],
          {}
        );
      }

      await NativeEscposPrinter.printText('--------------------------------\n', {});
      
      // Totals
      await NativeEscposPrinter.printerAlign(NativeEscposPrinter.ALIGN.RIGHT);
      await NativeEscposPrinter.printText(`Subtotal: $${details.subtotal.toFixed(2)}\n`, {});
      await NativeEscposPrinter.printText(`Tax: $${details.tax.toFixed(2)}\n`, {});
      if (details.discount > 0) {
        await NativeEscposPrinter.printText(`Discount: -$${details.discount.toFixed(2)}\n`, {});
      }
      await NativeEscposPrinter.printText(`Total: $${details.total.toFixed(2)}\n`, {
        bold: 1,
      });
      
      await NativeEscposPrinter.printText('\nThank you for your business!\n\n\n', {});
      await NativeEscposPrinter.cutPaper();
      return true;
    } catch (err) {
      console.error('Printing failed:', err);
      return false;
    }
  }
};
