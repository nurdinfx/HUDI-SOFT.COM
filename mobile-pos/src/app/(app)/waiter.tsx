import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { qrApi, ordersApi } from '@/api';
import { COLORS } from '@/constants';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

// ── Types ──────────────────────────────────────────────────────────────────────
type WaiterCall = {
  _id: string;
  tableId?: string;
  tableName?: string;
  type?: 'waiter' | 'bill' | 'order';
  message?: string;
  status?: string;
  createdAt?: string;
};

type TableItem = {
  _id: string;
  name?: string;
  number?: string | number;
  tableNumber?: string | number;
  status?: string;
  capacity?: number;
  location?: string;
};

type ActiveOrder = {
  _id: string;
  orderNumber?: string;
  table?: string | { _id: string; name?: string };
  tableId?: string;
  items?: { _id?: string; name: string; quantity: number; price: number; notes?: string }[];
  status?: string;
  kitchenStatus?: string;
  finalTotal?: number;
  total?: number;
  createdAt?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(dt?: string): string {
  if (!dt) return '';
  const diff = Date.now() - new Date(dt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  return `${m}m ago`;
}

function tableStatusColor(status?: string) {
  switch (status) {
    case 'available': return { bg: '#f0fdf4', border: '#86efac', text: '#15803d' };
    case 'occupied':  return { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' };
    case 'reserved':  return { bg: '#fffbeb', border: '#fcd34d', text: '#d97706' };
    case 'cleaning':  return { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb' };
    default:          return { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b' };
  }
}

function orderStatusColor(status?: string) {
  switch (status) {
    case 'pending':   return { bg: '#fffbeb', text: '#d97706' };
    case 'accepted':  return { bg: '#eff6ff', text: '#2563eb' };
    case 'preparing': return { bg: '#fff7ed', text: '#ea580c' };
    case 'ready':     return { bg: '#f0fdf4', text: '#16a34a' };
    case 'served':    return { bg: '#f5f3ff', text: '#7c3aed' };
    default:          return { bg: '#f8fafc', text: '#64748b' };
  }
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function WaiterScreen() {
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'tables' | 'calls' | 'orders'>('tables');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const [callsRes, ordersRes] = await Promise.all([
        qrApi.getWaiterRequests(),
        ordersApi.getKitchen(),
      ]);
      setCalls((callsRes.requests || []) as WaiterCall[]);
      setActiveOrders((ordersRes.orders || []) as ActiveOrder[]);

      // Load tables via ordersApi if available, otherwise skip
      try {
        const tablesRes = await (ordersApi as any).getTables?.();
        if (tablesRes?.tables) setTables(tablesRes.tables);
      } catch {}
    } catch (err) {
      console.error('Waiter load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleResolveCall = (id: string) => {
    Alert.alert('Resolve Call', 'Mark this service request as handled?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Handled',
        onPress: async () => {
          try {
            await (qrApi as any).resolveWaiterRequest?.(id, { status: 'resolved' });
          } catch {}
          setCalls((prev) => prev.filter((c) => c._id !== id));
        },
      },
    ]);
  };

  const handleMarkServed = async (orderId: string) => {
    try {
      await ordersApi.updateStatus(orderId, 'served');
      setActiveOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: 'served', kitchenStatus: 'served' } : o))
      );
      Alert.alert('Success', 'Order marked as served!');
    } catch {
      Alert.alert('Error', 'Could not update order status.');
    }
  };

  const pendingCalls = calls.filter((c) => c.status !== 'handled' && c.status !== 'resolved');
  const filteredTables = statusFilter === 'all' ? tables : tables.filter((t) => t.status === statusFilter);
  const activeTableOrders = activeOrders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');

  if (loading) {
    return (
      <View style={styles.loading}>
        <Ionicons name="walk-outline" size={48} color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading waiter board…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Alert Banner */}
      {pendingCalls.length > 0 && (
        <View style={styles.alertBanner}>
          <Ionicons name="notifications" size={16} color="#fff" />
          <Text style={styles.alertText}>
            {pendingCalls.length} service call{pendingCalls.length > 1 ? 's' : ''} waiting
          </Text>
        </View>
      )}

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.primary }]}>{tables.filter(t => t.status === 'occupied').length}</Text>
          <Text style={styles.statLabel}>OCCUPIED</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.success }]}>{tables.filter(t => t.status === 'available').length}</Text>
          <Text style={styles.statLabel}>AVAILABLE</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#f59e0b' }]}>{pendingCalls.length}</Text>
          <Text style={styles.statLabel}>CALLS</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#8b5cf6' }]}>{activeTableOrders.length}</Text>
          <Text style={styles.statLabel}>ORDERS</Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabs}>
        {([
          { key: 'tables', icon: 'grid-outline', label: 'Tables' },
          { key: 'calls', icon: 'hand-left-outline', label: `Calls (${pendingCalls.length})` },
          { key: 'orders', icon: 'receipt-outline', label: `Orders (${activeTableOrders.length})` },
        ] as const).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.activeTab]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons
              name={t.icon}
              size={16}
              color={tab === t.key ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.tabText, tab === t.key && styles.activeTabText]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── TABLES TAB ── */}
        {tab === 'tables' && (
          <>
            {/* Status Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
              {['all', 'available', 'occupied', 'reserved', 'cleaning'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                  onPress={() => setStatusFilter(s)}
                >
                  <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredTables.length === 0 ? (
              <EmptyState
                icon="grid-outline"
                title="No Tables Found"
                message="Tables will appear here once set up by the manager."
              />
            ) : (
              <View style={styles.tablesGrid}>
                {filteredTables.map((table) => {
                  const order = activeTableOrders.find(
                    (o) => o.tableId === table._id ||
                      (typeof o.table === 'string' ? o.table === table._id : o.table?._id === table._id)
                  );
                  const sc = tableStatusColor(table.status);
                  return (
                    <TouchableOpacity
                      key={table._id}
                      style={[styles.tableCard, { backgroundColor: sc.bg, borderColor: sc.border }]}
                      onPress={() => { setSelectedTable(table); setShowTableModal(true); }}
                    >
                      <Text style={[styles.tableName, { color: sc.text }]}>
                        {table.name || `Table ${table.number || table.tableNumber || '?'}`}
                      </Text>
                      <View style={[styles.tableStatusBadge, { backgroundColor: sc.border + '55' }]}>
                        <Text style={[styles.tableStatusText, { color: sc.text }]}>
                          {(table.status || 'unknown').toUpperCase()}
                        </Text>
                      </View>
                      {table.capacity ? (
                        <Text style={styles.tableCapacity}>👥 {table.capacity} seats</Text>
                      ) : null}
                      {order ? (
                        <View style={[styles.tableOrderBadge, { backgroundColor: orderStatusColor(order.status).bg }]}>
                          <Text style={[styles.tableOrderText, { color: orderStatusColor(order.status).text }]}>
                            {order.items?.length || 0} items
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ── CALLS TAB ── */}
        {tab === 'calls' && (
          pendingCalls.length === 0 ? (
            <EmptyState
              icon="hand-left-outline"
              title="All Clear"
              message="No active service calls from tables."
            />
          ) : (
            pendingCalls.map((call) => (
              <View key={call._id} style={styles.callCard}>
                <View style={styles.callHeader}>
                  <View style={[
                    styles.callIconWrap,
                    { backgroundColor: call.type === 'bill' ? '#fef3c7' : call.type === 'order' ? '#eff6ff' : '#f0fdf4' }
                  ]}>
                    <Ionicons
                      name={
                        call.type === 'bill' ? 'cash-outline' :
                        call.type === 'order' ? 'cart-outline' :
                        'hand-left-outline'
                      }
                      size={20}
                      color={call.type === 'bill' ? '#d97706' : call.type === 'order' ? COLORS.primary : COLORS.success}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.callTable}>
                      {call.tableName || `Table ${call.tableId || '?'}`}
                    </Text>
                    <Text style={styles.callType}>
                      {call.type === 'bill' ? '💰 Bill Request' :
                       call.type === 'order' ? '🛒 New Order Request' :
                       '🙋 Waiter Call'}
                    </Text>
                  </View>
                  <View>
                    <StatusBadge status={call.status || 'pending'} />
                    <Text style={styles.callTime}>{timeAgo(call.createdAt)}</Text>
                  </View>
                </View>
                {call.message ? <Text style={styles.callMessage}>"{call.message}"</Text> : null}
                <TouchableOpacity
                  style={styles.resolveBtn}
                  onPress={() => handleResolveCall(call._id)}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={styles.resolveBtnText}>Mark as Handled</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          activeTableOrders.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No Active Orders"
              message="Active dine-in orders will appear here."
            />
          ) : (
            activeTableOrders.map((order) => {
              const sc = orderStatusColor(order.status);
              return (
                <View key={order._id} style={styles.orderCard}>
                  <View style={styles.orderCardHeader}>
                    <View>
                      <Text style={styles.orderNum}>
                        #{(order.orderNumber || '').split('-').pop() || order._id?.slice(-6).toUpperCase()}
                      </Text>
                      <Text style={styles.orderTableName}>
                        {typeof order.table === 'object' ? order.table?.name : `Table`}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={[styles.orderStatusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.orderStatusText, { color: sc.text }]}>
                          {(order.status || '').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.orderTime}>{timeAgo(order.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={styles.orderItems}>
                    {(order.items || []).slice(0, 4).map((item, i) => (
                      <Text key={i} style={styles.orderItem}>• {item.quantity}x {item.name}</Text>
                    ))}
                    {(order.items || []).length > 4 && (
                      <Text style={styles.orderItemMore}>+{(order.items?.length || 0) - 4} more items</Text>
                    )}
                  </View>
                  <View style={styles.orderCardFooter}>
                    <Text style={styles.orderTotal}>
                      ${((order.finalTotal ?? order.total) || 0).toFixed(2)}
                    </Text>
                    {order.status !== 'served' && (
                      <TouchableOpacity
                        style={styles.serveBtn}
                        onPress={() => handleMarkServed(order._id)}
                      >
                        <Ionicons name="checkmark-outline" size={14} color="#fff" />
                        <Text style={styles.serveBtnText}>Mark Served</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )
        )}
      </ScrollView>

      {/* Table Detail Modal */}
      <Modal
        visible={showTableModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTableModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTable?.name || `Table ${selectedTable?.number || selectedTable?.tableNumber || '?'}`}
              </Text>
              <TouchableOpacity onPress={() => setShowTableModal(false)}>
                <Ionicons name="close-outline" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedTable && (
              <ScrollView>
                {/* Table Info */}
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Status</Text>
                  <View style={[styles.tableStatusBadge, {
                    backgroundColor: tableStatusColor(selectedTable.status).bg,
                    borderColor: tableStatusColor(selectedTable.status).border,
                    borderWidth: 1,
                  }]}>
                    <Text style={[styles.tableStatusText, { color: tableStatusColor(selectedTable.status).text }]}>
                      {(selectedTable.status || '—').toUpperCase()}
                    </Text>
                  </View>
                </View>
                {selectedTable.capacity && (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Capacity</Text>
                    <Text style={styles.modalInfoValue}>{selectedTable.capacity} seats</Text>
                  </View>
                )}
                {selectedTable.location && (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Location</Text>
                    <Text style={styles.modalInfoValue}>{selectedTable.location}</Text>
                  </View>
                )}

                {/* Active Order */}
                {(() => {
                  const order = activeTableOrders.find(
                    (o) => o.tableId === selectedTable._id ||
                      (typeof o.table === 'string' ? o.table === selectedTable._id : o.table?._id === selectedTable._id)
                  );
                  if (!order) {
                    return (
                      <View style={styles.noOrderBox}>
                        <Ionicons name="cafe-outline" size={32} color={COLORS.textMuted} />
                        <Text style={styles.noOrderText}>No active order on this table</Text>
                      </View>
                    );
                  }
                  const sc = orderStatusColor(order.status);
                  return (
                    <View style={styles.modalOrderCard}>
                      <View style={styles.modalOrderHeader}>
                        <Text style={styles.modalOrderNum}>
                          Order #{(order.orderNumber || '').split('-').pop() || order._id?.slice(-6)}
                        </Text>
                        <View style={[styles.orderStatusBadge, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.orderStatusText, { color: sc.text }]}>
                            {(order.status || '').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      {(order.items || []).map((item, i) => (
                        <View key={i} style={styles.modalItem}>
                          <Text style={styles.modalItemQty}>{item.quantity}x</Text>
                          <Text style={styles.modalItemName}>{item.name}</Text>
                          <Text style={styles.modalItemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                        </View>
                      ))}
                      <View style={styles.modalOrderFooter}>
                        <Text style={styles.modalOrderTotal}>
                          Total: ${((order.finalTotal ?? order.total) || 0).toFixed(2)}
                        </Text>
                      </View>
                      {order.status !== 'served' && (
                        <TouchableOpacity
                          style={[styles.serveBtn, { marginTop: 12 }]}
                          onPress={() => { setShowTableModal(false); handleMarkServed(order._id); }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                          <Text style={styles.serveBtnText}>Mark Order as Served</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: COLORS.textMuted, marginTop: 8 },

  alertBanner: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  alertText: { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  statItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.cardBorder,
  },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  activeTabText: { color: COLORS.primary, fontWeight: '700' },

  content: { padding: 12, paddingBottom: 32 },

  filterRow: { marginBottom: 12 },
  filterContent: { gap: 8, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tableCard: {
    width: '47%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  tableName: { fontSize: 15, fontWeight: '800' },
  tableStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tableStatusText: { fontSize: 10, fontWeight: '700' },
  tableCapacity: { fontSize: 12, color: COLORS.textMuted },
  tableOrderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tableOrderText: { fontSize: 11, fontWeight: '700' },

  callCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  callHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  callIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callTable: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  callType: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  callTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, textAlign: 'right' },
  callMessage: {
    fontSize: 13,
    fontStyle: 'italic',
    color: COLORS.text,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.success,
    borderRadius: 8,
    paddingVertical: 10,
  },
  resolveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  orderNum: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  orderTableName: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  orderStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  orderStatusText: { fontSize: 10, fontWeight: '700' },
  orderTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  orderItems: { borderTopWidth: 1, borderTopColor: COLORS.cardBorder, paddingTop: 8, marginBottom: 8 },
  orderItem: { fontSize: 13, color: COLORS.text, marginBottom: 3 },
  orderItemMore: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  orderCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { fontSize: 16, fontWeight: '800', color: COLORS.success },
  serveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  serveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalInfoLabel: { fontSize: 13, color: COLORS.textMuted },
  modalInfoValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  noOrderBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  noOrderText: { color: COLORS.textMuted, fontSize: 14 },
  modalOrderCard: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalOrderNum: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalItemQty: { fontSize: 13, fontWeight: '700', color: COLORS.primary, width: 28 },
  modalItemName: { flex: 1, fontSize: 13, color: COLORS.text },
  modalItemPrice: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  modalOrderFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    alignItems: 'flex-end',
  },
  modalOrderTotal: { fontSize: 16, fontWeight: '800', color: COLORS.success },
});
