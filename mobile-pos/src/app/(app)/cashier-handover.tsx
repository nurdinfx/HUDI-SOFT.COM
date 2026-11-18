import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi, reportsApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants';
import StatCard from '@/components/StatCard';
import { BluetoothManager } from '@/printing/BluetoothManager';
import { usePrinterStore } from '@/store/printerStore';

export default function CashierHandoverScreen() {
  const { user } = useAuthStore();
  const { isConnected } = usePrinterStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [shiftStats, setShiftStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cashTotal: 0,
    cardTotal: 0,
    mobileTotal: 0,
  });

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [orderStats, dashStats, ordersList] = await Promise.all([
        ordersApi.getStats('today').catch(() => ({ data: {} })),
        reportsApi.getDashboardStats('today').catch(() => ({ data: {} })),
        ordersApi.getAll({ limit: 100 }).catch(() => ({ success: false, orders: [] })),
      ]);

      const o = (orderStats.data || {}) as Record<string, any>;
      const d = (dashStats.data || {}) as Record<string, any>;
      
      let cashTotal = 0;
      let cardTotal = 0;
      let mobileTotal = 0;

      if (ordersList.success) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayOrders = (ordersList.orders || []) as any[];
        todayOrders.forEach(order => {
          const dateStr = order.createdAt || order.orderDate || '';
          if (dateStr.startsWith(todayStr)) {
            const total = order.finalTotal || order.total || order.totalAmount || 0;
            const method = (order.paymentMethod || order.payment_method || 'cash').toLowerCase();
            if (method === 'cash') cashTotal += total;
            else if (method === 'card') cardTotal += total;
            else if (method === 'mobile_money') mobileTotal += total;
          }
        });
      }

      setShiftStats({
        totalOrders: Number(o.totalOrders || d.totalOrders || 0),
        totalRevenue: Number(o.totalRevenue || d.totalRevenue || 0),
        avgOrderValue: Number(o.avgOrderValue || d.avgOrderValue || 0),
        completedOrders: Number(o.completedOrders || d.completedOrders || 0),
        pendingOrders: Number(o.pendingOrders || d.pendingOrders || 0),
        cashTotal,
        cardTotal,
        mobileTotal,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePrintHandover = async () => {
    if (!isConnected) {
      Alert.alert('Printer Offline', 'Connect a Bluetooth printer in Settings first.');
      return;
    }

    const items = [
      { name: 'Completed Orders', qty: shiftStats.completedOrders, price: 0 },
      { name: 'Pending Orders', qty: shiftStats.pendingOrders, price: 0 },
      { name: 'Cash Collections', qty: 1, price: shiftStats.cashTotal },
      { name: 'Card Collections', qty: 1, price: shiftStats.cardTotal },
      { name: 'Mobile Collections', qty: 1, price: shiftStats.mobileTotal },
    ];

    const receiptDetails = {
      id: `SHIFT-${Date.now()}`,
      subtotal: shiftStats.totalRevenue,
      tax: 0,
      discount: 0,
      total: shiftStats.totalRevenue,
      payment_method: 'summary',
      created_at: new Date().toISOString(),
    };

    const printed = await BluetoothManager.printReceipt(items, receiptDetails);
    if (printed) {
      Alert.alert('Success', 'Shift handover report printed successfully.');
    } else {
      Alert.alert('Error', 'Handover printing failed.');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
    >
      <View style={styles.handoverCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="swap-horizontal-outline" size={24} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.title}>Cashier Handover</Text>
            <Text style={styles.sub}>Active Shift: {user?.name || 'Cashier'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.val}>{new Date().toLocaleDateString()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Shift Status</Text>
          <Text style={[styles.val, { color: COLORS.success, fontWeight: '700' }]}>Active / Open</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <StatCard icon="cart-outline" iconColor={COLORS.primary} label="Total Orders" value={shiftStats.totalOrders} />
        <View style={{ width: 12 }} />
        <StatCard icon="cash-outline" iconColor={COLORS.success} label="Total Revenue" value={`$${shiftStats.totalRevenue.toFixed(2)}`} />
      </View>

      {/* Payment Summary */}
      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Shift Collections Breakdown</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Cash Payments</Text>
          <Text style={styles.val}>${shiftStats.cashTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Card Payments</Text>
          <Text style={styles.val}>${shiftStats.cardTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Mobile Money</Text>
          <Text style={styles.val}>${shiftStats.mobileTotal.toFixed(2)}</Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Gross Shift Collections</Text>
          <Text style={styles.totalVal}>${shiftStats.totalRevenue.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.printBtn} onPress={handlePrintHandover}>
        <Ionicons name="print-outline" size={18} color={COLORS.white} />
        <Text style={styles.printBtnText}>Print Handover Summary</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  handoverCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  sub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.cardBorder, marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 13, color: COLORS.secondary },
  val: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  statsRow: { flexDirection: 'row' },
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  totalRow: { borderTopWidth: 1, borderColor: COLORS.cardBorder, marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  totalVal: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    height: 46,
    borderRadius: 8,
    marginTop: 12,
  },
  printBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});
