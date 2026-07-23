import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { orderRepo, Order } from '@/db/repositories/orderRepo';
import { ordersApi } from '@/api';
import { usePrinterStore } from '@/store/printerStore';
import { BluetoothManager } from '@/printing/BluetoothManager';
import { COLORS } from '@/constants';

// ── Status helpers (match web POS) ────────────────────────────────────────────
function statusColor(status?: string): { bg: string; text: string; border: string } {
  switch (status?.toLowerCase()) {
    case 'pending':    return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    case 'confirmed':  return { bg: '#eff6ff', text: '#2563eb', border: '#93c5fd' };
    case 'preparing':  return { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' };
    case 'ready':      return { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' };
    case 'served':     return { bg: '#f5f3ff', text: '#7c3aed', border: '#c4b5fd' };
    case 'completed':  return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    case 'cancelled':  return { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' };
    default:           return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };
  }
}

function orderTypeIcon(type?: string): string {
  switch (type?.toLowerCase()) {
    case 'dine-in':  return 'restaurant-outline';
    case 'takeaway': return 'bag-handle-outline';
    case 'delivery': return 'bicycle-outline';
    default:         return 'cart-outline';
  }
}

function formatDate(dt: string): string {
  if (!dt) return 'N/A';
  const d = new Date(dt);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

const STATUS_FILTERS = ['All', 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const [orders, setOrders]               = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [statusFilter, setStatusFilter]   = useState('All');
  const [search, setSearch]               = useState('');
  const [refreshing, setRefreshing]       = useState(false);
  const [loading, setLoading]             = useState(true);
  const { isConnected }                   = usePrinterStore();

  const loadData = useCallback(async () => {
    try {
      // Try API first, fallback to local DB
      const res = await ordersApi.getAll?.({ limit: 200 });
      if (res?.orders?.length) {
        setOrders(res.orders);
      } else {
        throw new Error('API empty');
      }
    } catch {
      try {
        const local = orderRepo.getOrders(200);
        setOrders(local as any[]);
      } catch (err) {
        console.error('Orders load error:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleReprint = async (order: any) => {
    if (!isConnected) {
      Alert.alert('Printer Offline', 'Please connect a Bluetooth printer in Settings first.');
      return;
    }
    const printed = await BluetoothManager.printReceipt(order.items, order);
    if (printed) {
      Alert.alert('Success', 'Reprinted receipt successfully.');
    } else {
      Alert.alert('Error', 'Reprinting receipt failed.');
    }
  };

  // Filter & search
  const filtered = orders.filter((o) => {
    const matchStatus =
      statusFilter === 'All' ||
      (o.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchSearch =
      !search ||
      (o.orderNumber || o.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Summary counts (match web orders summary)
  const summary = {
    total: orders.length,
    pending:   orders.filter((o) => o.status === 'pending').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready:     orders.filter((o) => o.status === 'ready').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  };

  return (
    <View style={styles.container}>
      {/* ── Search Bar ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search order # or customer..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Summary Stats (matches web orders page) ── */}
      <View style={styles.statsBar}>
        {[
          { label: 'Total',    value: summary.total,     color: COLORS.primary },
          { label: 'Pending',  value: summary.pending,   color: '#f59e0b' },
          { label: 'Cooking',  value: summary.preparing, color: '#f97316' },
          { label: 'Ready',    value: summary.ready,     color: COLORS.success },
          { label: 'Done',     value: summary.completed, color: '#94a3b8' },
        ].map((s) => (
          <View key={s.label} style={styles.statItem}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Status Filter Chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Orders List ── */}
      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            {search || statusFilter !== 'All' ? 'No orders match your filter.' : 'No orders recorded yet.'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item) => item._id || item.id}
          estimatedItemSize={120}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />
          }
          renderItem={({ item }) => {
            const sc = statusColor(item.status);
            const ordNum = item.orderNumber || `#${(item._id || item.id || '').slice(-8).toUpperCase()}`;
            const total = item.finalTotal ?? item.total ?? 0;

            return (
              <TouchableOpacity
                style={styles.orderCard}
                onPress={() => setSelectedOrder(item)}
                activeOpacity={0.8}
              >
                {/* Header row */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.orderTypeIcon, { backgroundColor: `${COLORS.primary}18` }]}>
                      <Ionicons name={orderTypeIcon(item.orderType ?? item.type) as any} size={16} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text style={styles.orderId}>{ordNum}</Text>
                      <Text style={styles.orderMeta}>
                        {item.orderType ?? item.type ?? 'Order'}{item.tableNumber ? ` • Table ${item.tableNumber}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {(item.status || 'unknown').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Body */}
                <View style={styles.cardBody}>
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.metaText}>{formatDate(item.createdAt || item.created_at)}</Text>
                  </View>
                  {(item.customerName || item.customer?.name) && (
                    <View style={styles.metaRow}>
                      <Ionicons name="person-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>{item.customerName || item.customer?.name}</Text>
                    </View>
                  )}
                  <View style={styles.metaRow}>
                    <Ionicons name="card-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.metaText}>
                      {(item.paymentMethod || item.payment_method || 'N/A').toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <Text style={styles.itemsCount}>{item.items?.length ?? 0} items</Text>
                  <Text style={styles.totalValue}>${typeof total === 'number' ? total.toFixed(2) : '0.00'}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Order Detail Modal ── */}
      <Modal visible={selectedOrder !== null} animationType="slide" transparent onRequestClose={() => setSelectedOrder(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={26} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (() => {
              const sc = statusColor(selectedOrder.status);
              const total = selectedOrder.finalTotal ?? selectedOrder.total ?? 0;
              const subtotal = selectedOrder.subtotal ?? total;
              const tax = selectedOrder.taxAmount ?? selectedOrder.tax ?? 0;
              const disc = selectedOrder.discount ?? 0;
              const ordNum = selectedOrder.orderNumber || `#${(selectedOrder._id || selectedOrder.id || '').slice(-8).toUpperCase()}`;

              return (
                <ScrollView contentContainerStyle={styles.detailContent}>
                  {/* Order Info Row */}
                  <View style={styles.orderInfoRow}>
                    <View>
                      <Text style={styles.detailOrderNum}>{ordNum}</Text>
                      <Text style={styles.detailMeta}>{formatDate(selectedOrder.createdAt || selectedOrder.created_at)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                      <Text style={[styles.statusText, { color: sc.text }]}>
                        {(selectedOrder.status || '').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Meta info */}
                  {(selectedOrder.orderType || selectedOrder.type) && (
                    <View style={styles.detailMetaRow}>
                      <Text style={styles.detailMetaLabel}>Order Type</Text>
                      <Text style={styles.detailMetaValue}>{selectedOrder.orderType || selectedOrder.type}</Text>
                    </View>
                  )}
                  {selectedOrder.tableNumber && (
                    <View style={styles.detailMetaRow}>
                      <Text style={styles.detailMetaLabel}>Table</Text>
                      <Text style={styles.detailMetaValue}>{selectedOrder.tableNumber}</Text>
                    </View>
                  )}
                  {(selectedOrder.customerName || selectedOrder.customer?.name) && (
                    <View style={styles.detailMetaRow}>
                      <Text style={styles.detailMetaLabel}>Customer</Text>
                      <Text style={styles.detailMetaValue}>{selectedOrder.customerName || selectedOrder.customer?.name}</Text>
                    </View>
                  )}
                  <View style={styles.detailMetaRow}>
                    <Text style={styles.detailMetaLabel}>Payment</Text>
                    <Text style={styles.detailMetaValue}>
                      {(selectedOrder.paymentMethod || selectedOrder.payment_method || 'N/A').toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>

                  {/* Receipt Preview */}
                  <View style={styles.receiptPreview}>
                    <Text style={styles.receiptHeader}>HUDI POS</Text>
                    <Text style={styles.receiptSub}>{ordNum}</Text>
                    <Text style={styles.receiptDate}>{formatDate(selectedOrder.createdAt || selectedOrder.created_at)}</Text>
                    <View style={styles.receiptDivider} />

                    {(selectedOrder.items || []).map((i: any, index: number) => (
                      <View key={index} style={styles.receiptItemRow}>
                        <Text style={styles.receiptItemName}>{i.name ?? i.product_name ?? '?'} x{i.qty ?? i.quantity ?? 1}</Text>
                        <Text style={styles.receiptItemPrice}>
                          ${((i.qty ?? i.quantity ?? 1) * (i.price ?? 0)).toFixed(2)}
                        </Text>
                      </View>
                    ))}

                    <View style={styles.receiptDivider} />
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptSummaryLabel}>Subtotal</Text>
                      <Text style={styles.receiptSummaryVal}>${subtotal.toFixed(2)}</Text>
                    </View>
                    {tax > 0 && (
                      <View style={styles.receiptSummaryRow}>
                        <Text style={styles.receiptSummaryLabel}>VAT/Tax</Text>
                        <Text style={styles.receiptSummaryVal}>${tax.toFixed(2)}</Text>
                      </View>
                    )}
                    {disc > 0 && (
                      <View style={styles.receiptSummaryRow}>
                        <Text style={styles.receiptSummaryLabel}>Discount</Text>
                        <Text style={[styles.receiptSummaryVal, { color: COLORS.danger }]}>-${disc.toFixed(2)}</Text>
                      </View>
                    )}
                    <View style={[styles.receiptSummaryRow, styles.receiptTotalRow]}>
                      <Text style={styles.receiptTotalLabel}>TOTAL</Text>
                      <Text style={styles.receiptTotalVal}>${typeof total === 'number' ? total.toFixed(2) : '0.00'}</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.reprintButton} onPress={() => handleReprint(selectedOrder)}>
                    <Ionicons name="print-outline" size={20} color="#fff" />
                    <Text style={styles.reprintText}>Reprint Receipt</Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  searchRow: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 8,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statNum:  { fontSize: 18, fontWeight: '800' },
  statLabel:{ fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 2 },

  filterBar:     { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  filterContent: { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
  },
  filterChipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText:       { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText:      { color: COLORS.textMuted, fontSize: 15, marginTop: 12, textAlign: 'center' },

  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  orderTypeIcon: {
    width: 34, height: 34,
    borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  orderId: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  orderMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  cardBody: { borderTopWidth: 1, borderTopColor: COLORS.cardBorder, paddingTop: 8, gap: 4 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: COLORS.textMuted, fontSize: 12 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    marginTop: 8,
    paddingTop: 8,
  },
  itemsCount: { fontSize: 12, color: COLORS.textMuted },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.success },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  detailCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  detailContent: { padding: 18, paddingBottom: 40 },

  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailOrderNum: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  detailMeta:     { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  detailMetaRow:  {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  detailMetaLabel: { fontSize: 13, color: COLORS.textMuted },
  detailMetaValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  receiptPreview: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  receiptHeader:  { color: '#000', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  receiptSub:     { color: '#334155', fontSize: 12, textAlign: 'center', marginTop: 2 },
  receiptDate:    { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 2 },
  receiptDivider: { height: 1, backgroundColor: '#cbd5e1', marginVertical: 10, borderStyle: 'dashed' },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  receiptItemName:  { color: '#1e293b', fontSize: 13, flex: 1, fontWeight: '600' },
  receiptItemPrice: { color: '#1e293b', fontSize: 13, fontWeight: '500' },
  receiptSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  receiptSummaryLabel: { color: '#64748b', fontSize: 13 },
  receiptSummaryVal:   { color: '#1e293b', fontSize: 13 },
  receiptTotalRow:  { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  receiptTotalLabel:{ color: '#0f172a', fontSize: 15, fontWeight: '800' },
  receiptTotalVal:  { color: COLORS.primary, fontSize: 18, fontWeight: '800' },

  reprintButton: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  reprintText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
