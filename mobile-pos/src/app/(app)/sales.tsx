import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi, usersApi } from '@/api';
import { COLORS } from '@/constants';
import StatCard from '@/components/StatCard';
import FilterBar from '@/components/FilterBar';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import { BluetoothManager } from '@/printing/BluetoothManager';
import { usePrinterStore } from '@/store/printerStore';

type SaleOrder = {
  _id: string;
  orderNumber?: string;
  createdAt?: string;
  orderDate?: string;
  customer?: { name: string };
  customerName?: string;
  user?: { name: string; _id: string };
  cashier?: { name: string; _id: string };
  servedBy?: any;
  status?: string;
  total?: number;
  finalTotal?: number;
  totalAmount?: number;
  paymentMethod?: string;
  payment_method?: string;
  items?: { name: string; qty: number; price: number; quantity?: number }[];
};

type UserOption = {
  _id: string;
  name: string;
};

const STATUS_FILTERS = ['All', 'completed', 'pending', 'cancelled'];

export default function SalesScreen() {
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedUser, setSelectedUser] = useState('');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleOrder | null>(null);

  const { isConnected } = usePrinterStore();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ordersRes, usersRes] = await Promise.all([
        ordersApi.getAll({ limit: 500 }),
        usersApi.getAll().catch(() => ({ success: false, users: [] })),
      ]);

      if (ordersRes.success) {
        const allOrders = (ordersRes.orders || ordersRes.data || []) as SaleOrder[];
        // Sort by date descending
        allOrders.sort((a, b) => new Date(b.createdAt || b.orderDate || 0).getTime() - new Date(a.createdAt || a.orderDate || 0).getTime());
        setSales(allOrders);
      }

      if (usersRes.success) {
        setUsers(usersRes.users as UserOption[]);
      }
    } catch (err) {
      console.error('Sales load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getUserName = (sale: SaleOrder) => {
    const serverId = sale.servedBy?._id || sale.servedBy || sale.user?._id || sale.user || sale.cashier?._id || sale.cashier;
    if (serverId) {
      const servedByUser = users.find(u => String(u._id) === String(serverId));
      if (servedByUser) return servedByUser.name;
    }
    return sale.cashier?.name || sale.user?.name || 'System';
  };

  const filtered = sales.filter((sale) => {
    const orderNum = sale.orderNumber || '';
    const customer = sale.customer?.name || sale.customerName || '';
    const matchesSearch = orderNum.toLowerCase().includes(search.toLowerCase()) ||
      customer.toLowerCase().includes(search.toLowerCase());

    const status = sale.status || 'completed';
    const matchesStatus = selectedStatus === 'All' || status.toLowerCase() === selectedStatus.toLowerCase();

    const serverId = sale.servedBy?._id || sale.servedBy || sale.user?._id || sale.user || sale.cashier?._id || sale.cashier;
    const matchesUser = !selectedUser || String(serverId) === String(selectedUser);

    return matchesSearch && matchesStatus && matchesUser;
  });

  const totalSalesAmount = filtered.reduce((sum, sale) => {
    return sum + (sale.finalTotal || sale.total || sale.totalAmount || 0);
  }, 0);

  const handlePrint = async (sale: SaleOrder) => {
    if (!isConnected) {
      Alert.alert('Printer Offline', 'Check your printer connection in Settings.');
      return;
    }
    
    // Map items to Bluetooth print format
    const printItems = (sale.items || []).map(i => ({
      name: i.name,
      qty: i.qty || i.quantity || 1,
      price: i.price || 0
    }));

    const orderData = {
      id: sale.orderNumber || sale._id,
      items: printItems,
      subtotal: sale.total || sale.totalAmount || 0,
      tax: 0,
      discount: 0,
      total: sale.finalTotal || sale.total || 0,
      payment_method: sale.paymentMethod || sale.payment_method || 'cash',
      created_at: sale.createdAt || sale.orderDate || new Date().toISOString()
    };

    const printed = await BluetoothManager.printReceipt(printItems, orderData);
    if (printed) {
      Alert.alert('Success', 'Receipt printed.');
    } else {
      Alert.alert('Error', 'Failed to print receipt.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading sales history…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search receipt # or customer…"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        
        {/* User filter selector trigger */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setUserModalVisible(true)}
        >
          <Ionicons name="person-outline" size={18} color={selectedUser ? COLORS.primary : COLORS.secondary} />
          <Text style={[styles.filterButtonText, selectedUser && { color: COLORS.primary }]}>
            {selectedUser ? users.find(u => u._id === selectedUser)?.name : 'All Staff'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Status filter bar */}
      <FilterBar filters={STATUS_FILTERS} selected={selectedStatus} onSelect={setSelectedStatus} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={COLORS.primary} />}
      >
        {/* Sales metric */}
        <StatCard
          icon="cash-outline"
          iconColor={COLORS.success}
          label="Total Aggregated Sales"
          value={`$${totalSalesAmount.toFixed(2)}`}
          sub={`Computed over ${filtered.length} sales`}
        />

        {/* Sales List */}
        {filtered.length === 0 ? (
          <EmptyState icon="cash-outline" title="No Sales Recorded" message="No sales transactions found." />
        ) : (
          filtered.map((sale) => {
            const ref = (sale.orderNumber || sale._id).split('-').pop() || '';
            const custName = sale.customer?.name || sale.customerName || 'Walking Customer';
            const total = sale.finalTotal || sale.total || sale.totalAmount || 0;
            const method = (sale.paymentMethod || sale.payment_method || 'cash').toUpperCase();
            const dateStr = sale.createdAt || sale.orderDate || '';
            const date = dateStr ? new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

            return (
              <TouchableOpacity
                key={sale._id}
                style={styles.saleCard}
                onPress={() => setSelectedSale(sale)}
                activeOpacity={0.8}
              >
                <View style={styles.cardMain}>
                  <View style={styles.leftCol}>
                    <Text style={styles.receiptNum}>Receipt #{ref}</Text>
                    <Text style={styles.custText}>{custName}</Text>
                    <Text style={styles.dateText}>{date}</Text>
                  </View>
                  <View style={styles.rightCol}>
                    <Text style={styles.amountText}>${total.toFixed(2)}</Text>
                    <View style={styles.badgeRow}>
                      <Text style={styles.methodText}>{method}</Text>
                      <StatusBadge status={sale.status || 'completed'} />
                    </View>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <Text style={styles.staffText}>Staff: {getUserName(sale)}</Text>
                  <TouchableOpacity
                    style={styles.printBtn}
                    onPress={() => handlePrint(sale)}
                  >
                    <Ionicons name="print-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.printBtnText}>Print</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Staff Filter Selector Modal */}
      <Modal visible={userModalVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setUserModalVisible(false)}
        >
          <View style={styles.userPickerContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Staff Member</Text>
              <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity
                style={styles.userItem}
                onPress={() => {
                  setSelectedUser('');
                  setUserModalVisible(false);
                }}
              >
                <Text style={[styles.userItemText, !selectedUser && styles.userItemTextActive]}>
                  All Staff / Cashiers
                </Text>
                {!selectedUser && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
              </TouchableOpacity>
              {users.map((u) => (
                <TouchableOpacity
                  key={u._id}
                  style={styles.userItem}
                  onPress={() => {
                    setSelectedUser(u._id);
                    setUserModalVisible(false);
                  }}
                >
                  <Text style={[styles.userItemText, selectedUser === u._id && styles.userItemTextActive]}>
                    {u.name}
                  </Text>
                  {selectedUser === u._id && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sale Detail Modal */}
      <Modal visible={!!selectedSale} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                Receipt #{selectedSale?.orderNumber?.split('-').pop() || 'Detail'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedSale(null)}>
                <Ionicons name="close" size={26} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedSale && (
              <ScrollView contentContainerStyle={styles.sheetBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>
                    {selectedSale.customer?.name || selectedSale.customerName || 'Walking Customer'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Served By</Text>
                  <Text style={styles.detailValue}>{getUserName(selectedSale)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date/Time</Text>
                  <Text style={styles.detailValue}>
                    {selectedSale.createdAt || selectedSale.orderDate ? new Date(selectedSale.createdAt || selectedSale.orderDate || '').toLocaleString() : '—'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Method</Text>
                  <Text style={styles.detailValue}>
                    {(selectedSale.paymentMethod || selectedSale.payment_method || 'cash').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <StatusBadge status={selectedSale.status || 'completed'} size="md" />
                </View>

                {/* Items */}
                {selectedSale.items && selectedSale.items.length > 0 && (
                  <View style={styles.itemsSection}>
                    <Text style={styles.itemsTitle}>Items</Text>
                    {selectedSale.items.map((item, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                        </View>
                        <Text style={styles.itemQty}>×{item.qty || item.quantity || 1}</Text>
                        <Text style={styles.itemTotal}>
                          ${((item.price || 0) * (item.qty || item.quantity || 1)).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.receiptTotalRow}>
                  <Text style={styles.totalLabel}>Grand Total</Text>
                  <Text style={styles.totalValue}>
                    ${(selectedSale.finalTotal || selectedSale.total || 0).toFixed(2)}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.actionBtn, styles.btnPrimary]}
                  onPress={() => handlePrint(selectedSale)}
                >
                  <Ionicons name="print-outline" size={18} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Print Duplicate Receipt</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 15 },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  filterButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },
  scrollContent: { padding: 16, gap: 12 },
  saleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  leftCol: { flex: 1, marginRight: 8 },
  receiptNum: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  custText: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  dateText: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  rightCol: { alignItems: 'flex-end' },
  amountText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  methodText: { fontSize: 10, fontWeight: '700', color: COLORS.secondary },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingTop: 8,
    marginTop: 4,
  },
  staffText: { fontSize: 11, color: COLORS.textMuted },
  printBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  printBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userPickerContainer: {
    width: '80%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  userItemText: { fontSize: 13, color: COLORS.text },
  userItemTextActive: { fontWeight: '700', color: COLORS.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  sheetBody: { padding: 20 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  detailLabel: { fontSize: 14, color: COLORS.secondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemsSection: { marginTop: 20 },
  itemsTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  itemName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  itemPrice: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  itemQty: { fontSize: 13, color: COLORS.secondary, marginHorizontal: 12 },
  itemTotal: { fontSize: 13, fontWeight: '700', color: COLORS.text, minWidth: 60, textAlign: 'right' },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
  },
  totalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  totalValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 8,
  },
  btnPrimary: { backgroundColor: COLORS.primary },
  actionBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});
