import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { usePrinterStore, BluetoothPrinterDevice } from '@/store/printerStore';
import { BluetoothManager } from '@/printing/BluetoothManager';
import { productRepo } from '@/db/repositories/productRepo';
import { orderRepo } from '@/db/repositories/orderRepo';
import { customerRepo } from '@/db/repositories/customerRepo';
import { COLORS } from '@/constants';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const {
    selectedPrinter,
    paperSize,
    isConnected,
    isConnecting,
    setPrinter,
    setPaperSize,
  } = usePrinterStore();

  const [devices, setDevices] = useState<{ paired: BluetoothPrinterDevice[]; found: BluetoothPrinterDevice[] }>({
    paired: [],
    found: [],
  });
  const [isScanning, setIsScanning] = useState(false);
  const [cacheInfo, setCacheInfo] = useState({ products: 0, orders: 0, customers: 0 });

  // Load stats from local SQLite
  const loadCacheInfo = () => {
    try {
      const p = productRepo.getProducts().length;
      const o = orderRepo.getOrders().length;
      const c = customerRepo.getCustomers().length;
      setCacheInfo({ products: p, orders: o, customers: c });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadCacheInfo();
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const isBtEnabled = await BluetoothManager.isEnabled();
      if (!isBtEnabled) {
        const enabled = await BluetoothManager.enable();
        if (!enabled) {
          Alert.alert('Bluetooth Required', 'Please enable Bluetooth to scan for thermal receipt printers.');
          setIsScanning(false);
          return;
        }
      }

      const results = await BluetoothManager.scan();
      setDevices(results);
    } catch (err: any) {
      Alert.alert('Scan Failed', err.message || 'Could not discover devices.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (device: BluetoothPrinterDevice) => {
    const ok = await BluetoothManager.connect(device.address);
    if (ok) {
      setPrinter(device);
      Alert.alert('Connected', `Successfully connected to ${device.name}`);
    } else {
      Alert.alert('Connection Failed', `Could not connect to ${device.name}`);
    }
  };

  const handleTestPrint = async () => {
    if (!isConnected || !selectedPrinter) {
      Alert.alert('Error', 'Please connect to a printer first.');
      return;
    }

    const testItems = [
      { name: 'Double Espresso', qty: 1, price: 3.5 },
      { name: 'Chocolate Muffin', qty: 2, price: 2.75 },
    ];
    const testDetails = {
      id: 'test_order_receipt',
      subtotal: 9.0,
      tax: 1.35,
      discount: 0,
      total: 10.35,
      payment_method: 'cash',
      created_at: new Date().toISOString(),
    };

    const printed = await BluetoothManager.printReceipt(testItems, testDetails);
    if (printed) {
      Alert.alert('Success', 'Test receipt sent successfully.');
    } else {
      Alert.alert('Error', 'Test printing failed.');
    }
  };

  const handleResetCache = () => {
    Alert.alert(
      'Confirm Reset',
      'This will delete all local SQLite cached catalog data. Orders pending cloud sync will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Cache',
          style: 'destructive',
          onPress: () => {
            productRepo.clearAll();
            orderRepo.clearAll();
            customerRepo.clearAll();
            loadCacheInfo();
            Alert.alert('Reset Complete', 'Local database has been wiped.');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from this terminal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Cashier profile summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employee Terminal Account</Text>
        <View style={styles.profileRow}>
          <View style={styles.profileIconBadge}>
            <Text style={styles.profileIcon}>👤</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.name || 'Cashier'}</Text>
            <Text style={styles.profileRole}>Role: {user?.role || 'Staff'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'staff@hudipos.com'}</Text>
            <Text style={styles.profileBranch}>Branch: {user?.branch?.name || 'Main Office'}</Text>
          </View>
        </View>
      </View>

      {/* Bluetooth Setup section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thermal Receipt Printer</Text>

        <View style={styles.printerStatusRow}>
          <View>
            <Text style={styles.printerStatusLabel}>
              {selectedPrinter ? `Selected: ${selectedPrinter.name}` : 'No printer selected'}
            </Text>
            <Text style={styles.printerSubText}>
              Status: {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>

          {isConnected && (
            <TouchableOpacity style={styles.testBtn} onPress={handleTestPrint}>
              <Text style={styles.testBtnText}>Test Receipt</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Paper widths */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Thermal Paper Width</Text>
          <View style={styles.toggleContainer}>
            {(['58mm', '80mm'] as const).map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.toggleBtn, paperSize === size && styles.activeToggleBtn]}
                onPress={() => setPaperSize(size)}
              >
                <Text style={[styles.toggleText, paperSize === size && styles.activeToggleText]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Scan buttons */}
        <TouchableOpacity style={styles.scanBtn} onPress={handleScan} disabled={isScanning}>
          {isScanning ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="bluetooth-outline" size={18} color={COLORS.white} />
              <Text style={styles.scanBtnText}>Scan for Printers</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Device list */}
        {devices.paired.length > 0 || devices.found.length > 0 ? (
          <View style={styles.deviceListContainer}>
            <Text style={styles.deviceListTitle}>Discovered Devices</Text>

            {[...devices.paired, ...devices.found].map((device, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.deviceRow}
                onPress={() => handleConnect(device)}
              >
                <Ionicons name="print-outline" size={16} color={COLORS.text} />
                <View style={styles.deviceRowMiddle}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceAddress}>{device.address}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      {/* Offline Database stats section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Offline SQL Cache Metrics</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Products Cached:</Text>
          <Text style={styles.statVal}>{cacheInfo.products}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Customers Cached:</Text>
          <Text style={styles.statVal}>{cacheInfo.customers}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Orders Saved:</Text>
          <Text style={styles.statVal}>{cacheInfo.orders}</Text>
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={handleResetCache}>
          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          <Text style={styles.resetBtnText}>Wipe Offline DB Cache</Text>
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
        <Text style={styles.logoutBtnText}>Sign Out POS Terminal</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingBottom: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginRight: 16,
  },
  profileIcon: {
    fontSize: 28,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileRole: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  profileEmail: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  profileBranch: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  printerStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  printerStatusLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  printerSubText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  testBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  testBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  settingLabel: {
    color: COLORS.text,
    fontSize: 14,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeToggleBtn: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  activeToggleText: {
    color: COLORS.white,
  },
  scanBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  scanBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  deviceListContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingTop: 16,
  },
  deviceListTitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  deviceRowMiddle: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  deviceAddress: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statLabel: {
    color: COLORS.text,
    fontSize: 14,
  },
  statVal: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 8,
  },
  resetBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  logoutBtn: {
    height: 52,
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  logoutBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
