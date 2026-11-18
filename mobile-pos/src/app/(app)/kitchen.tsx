import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '@/api';
import { COLORS } from '@/constants';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type KitchenOrder = {
  _id: string;
  orderNumber?: string;
  orderType?: string;
  kitchenStatus?: string;
  status?: string;
  items?: { name: string; quantity?: number; qty?: number; notes?: string; modifiers?: string[] }[];
  table?: { name: string };
  tableNumber?: string;
  orderSource?: string;
  station?: string;
  createdAt?: string;
  created_at?: string;
};

const STATIONS = ['All Stations', 'Grill', 'Fry', 'Salad', 'Pizza', 'Dessert'];

function getTimeElapsed(createdAt?: string): string {
  if (!createdAt) return '0m';
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function isUrgent(createdAt?: string): boolean {
  if (!createdAt) return false;
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff > 15 * 60000; // 15+ minutes
}

function isDelayed(createdAt?: string): boolean {
  if (!createdAt) return false;
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff > 30 * 60000; // 30+ minutes
}

function formatTime(dt?: string): string {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onStatusUpdate,
  nextStatus,
  buttonText,
  buttonColor,
  showReady = false,
}: {
  order: KitchenOrder;
  onStatusUpdate: (id: string, status: string) => void;
  nextStatus?: string;
  buttonText?: string;
  buttonColor?: string;
  showReady?: boolean;
}) {
  const status = order.kitchenStatus || order.status || 'pending';
  const timeStr = order.createdAt || order.created_at;
  const delayed = isDelayed(timeStr);
  const urgent = isUrgent(timeStr);
  const prepTimeMin = 5 + (order.items?.length || 0) * 2;
  const prepTimeMax = prepTimeMin + 5;
  const orderNum = (order.orderNumber || '').split('-').pop() || order._id?.slice(-6).toUpperCase() || '----';

  const cardBorderColor = delayed ? '#f59e0b' : urgent ? '#f97316' : '#e2e8f0';

  return (
    <View style={[styles.orderCard, { borderColor: cardBorderColor, borderWidth: delayed ? 2 : 1 }]}>
      {/* Header */}
      <View style={styles.cardHead}>
        <View>
          <View style={styles.cardNumRow}>
            <Text style={styles.cardNum}>#{orderNum}</Text>
            {order.tableNumber ? (
              <View style={styles.tblBadge}>
                <Text style={styles.tblBadgeText}>TBL {order.tableNumber}</Text>
              </View>
            ) : order.table?.name ? (
              <View style={styles.tblBadge}>
                <Text style={styles.tblBadgeText}>{order.table.name}</Text>
              </View>
            ) : (
              <View style={[styles.tblBadge, { backgroundColor: '#e2e8f0' }]}>
                <Text style={[styles.tblBadgeText, { color: '#64748b' }]}>WALK-IN</Text>
              </View>
            )}
            {order.orderSource === 'qr' && (
              <View style={[styles.tblBadge, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.tblBadgeText}>📱 QR</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTime}>
            {formatTime(timeStr)} ({getTimeElapsed(timeStr)})
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.prepTime}>⏱ {prepTimeMin}-{prepTimeMax}m</Text>
          {delayed && (
            <View style={styles.delayedBadge}>
              <Text style={styles.delayedBadgeText}>DELAYED</Text>
            </View>
          )}
        </View>
      </View>

      {/* Items */}
      <View style={styles.itemsList}>
        {(order.items || []).map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemQty}>{item.quantity ?? item.qty ?? 1}x</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              {(item.modifiers || []).length > 0 && (
                <View style={styles.modsRow}>
                  {(item.modifiers || []).map((mod, mi) => (
                    <View key={mi} style={styles.modChip}>
                      <Text style={styles.modChipText}>{mod}</Text>
                    </View>
                  ))}
                </View>
              )}
              {item.notes ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>"{item.notes}"</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        {!showReady && (
          <>
            {delayed ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.primary, flex: 1 }]}
                onPress={() => onStatusUpdate(order._id, 'preparing')}
              >
                <Text style={styles.actionBtnText}>RESUME</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.delayBtn]}
                  onPress={() => onStatusUpdate(order._id, 'delayed')}
                >
                  <Text style={[styles.actionBtnText, { color: '#92400e' }]}>DELAY</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: buttonColor || COLORS.primary, flex: 1 }]}
                  onPress={() => nextStatus && onStatusUpdate(order._id, nextStatus)}
                >
                  <Text style={styles.actionBtnText}>{buttonText || 'START'}</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
        {showReady && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#e2e8f0', flex: 1 }]}
            onPress={() => onStatusUpdate(order._id, 'served')}
          >
            <Text style={[styles.actionBtnText, { color: '#334155' }]}>MARK SERVED</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Column ────────────────────────────────────────────────────────────────────
function KitchenColumn({
  title,
  orders,
  accentColor,
  bgColor,
  onStatusUpdate,
  nextStatus,
  buttonText,
  buttonColor,
  showReady = false,
  emptyMsg,
}: {
  title: string;
  orders: KitchenOrder[];
  accentColor: string;
  bgColor: string;
  onStatusUpdate: (id: string, status: string) => void;
  nextStatus?: string;
  buttonText?: string;
  buttonColor?: string;
  showReady?: boolean;
  emptyMsg: string;
}) {
  return (
    <View style={[styles.column, { borderTopColor: accentColor }]}>
      {/* Column Header */}
      <View style={[styles.columnHeader, { backgroundColor: bgColor }]}>
        <Text style={[styles.columnTitle, { color: accentColor }]}>{title}</Text>
        <View style={[styles.columnCountBadge, { backgroundColor: accentColor + '33' }]}>
          <Text style={[styles.columnCountText, { color: accentColor }]}>{orders.length}</Text>
        </View>
      </View>
      {/* Column Content */}
      <ScrollView style={styles.columnScroll} contentContainerStyle={styles.columnContent}>
        {orders.length === 0 ? (
          <View style={styles.emptyCol}>
            <Text style={styles.emptyColText}>{emptyMsg}</Text>
          </View>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onStatusUpdate={onStatusUpdate}
              nextStatus={nextStatus}
              buttonText={buttonText}
              buttonColor={buttonColor}
              showReady={showReady}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Main Kitchen Screen ────────────────────────────────────────────────────────
export default function KitchenScreen() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [selectedStation, setSelectedStation] = useState('All Stations');
  const [activeColumn, setActiveColumn] = useState<'new' | 'cooking' | 'ready'>('new');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await ordersApi.getKitchen();
      setOrders((res.orders || []) as KitchenOrder[]);
    } catch (err) {
      console.error('Kitchen load error:', err);
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

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await ordersApi.updateStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, kitchenStatus: newStatus } : o))
      );
    } catch {
      Alert.alert('Error', 'Failed to update order status.');
    }
  };

  // Group by status
  const stationFilter = (o: KitchenOrder) =>
    selectedStation === 'All Stations' || !o.station || o.station.toLowerCase() === selectedStation.toLowerCase();

  const pendingOrders = orders.filter((o) =>
    ['pending', 'accepted', 'confirmed', 'delayed'].includes(o.kitchenStatus || o.status || '') && stationFilter(o)
  );
  const preparingOrders = orders.filter((o) =>
    (o.kitchenStatus || o.status) === 'preparing' && stationFilter(o)
  );
  const readyOrders = orders.filter((o) =>
    (o.kitchenStatus || o.status) === 'ready' && stationFilter(o)
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="restaurant-outline" size={48} color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading kitchen orders…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stationRow}>
          {STATIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.stationChip, selectedStation === s && styles.stationChipActive]}
              onPress={() => setSelectedStation(s)}
            >
              <Text style={[styles.stationChipText, selectedStation === s && styles.stationChipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={[styles.statItem, { borderLeftColor: COLORS.primary }]}>
          <Text style={[styles.statNum, { color: COLORS.primary }]}>{pendingOrders.length}</Text>
          <Text style={styles.statLabel}>PENDING</Text>
        </View>
        <View style={[styles.statItem, { borderLeftColor: '#f97316' }]}>
          <Text style={[styles.statNum, { color: '#f97316' }]}>{preparingOrders.length}</Text>
          <Text style={styles.statLabel}>COOKING</Text>
        </View>
        <View style={[styles.statItem, { borderLeftColor: COLORS.success }]}>
          <Text style={[styles.statNum, { color: COLORS.success }]}>{readyOrders.length}</Text>
          <Text style={styles.statLabel}>READY</Text>
        </View>
        <View style={[styles.statItem, { borderLeftColor: '#94a3b8' }]}>
          <Text style={[styles.statNum, { color: '#94a3b8' }]}>{orders.length}</Text>
          <Text style={styles.statLabel}>TOTAL</Text>
        </View>
      </View>

      {/* Column Tabs */}
      <View style={styles.columnTabs}>
        {([
          { key: 'new', label: `NEW ORDERS (${pendingOrders.length})`, color: COLORS.primary },
          { key: 'cooking', label: `COOKING (${preparingOrders.length})`, color: '#f97316' },
          { key: 'ready', label: `READY (${readyOrders.length})`, color: COLORS.success },
        ] as const).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.columnTab, activeColumn === tab.key && { borderBottomColor: tab.color, borderBottomWidth: 3 }]}
            onPress={() => setActiveColumn(tab.key)}
          >
            <Text style={[styles.columnTabText, activeColumn === tab.key && { color: tab.color, fontWeight: '700' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Column Content */}
      <ScrollView
        contentContainerStyle={styles.mainContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />
        }
      >
        {activeColumn === 'new' && (
          pendingOrders.length === 0 ? (
            <EmptyState icon="restaurant-outline" title="No new orders" message="Kitchen is clear right now." />
          ) : (
            pendingOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onStatusUpdate={updateStatus}
                nextStatus="preparing"
                buttonText="START"
                buttonColor={COLORS.primary}
              />
            ))
          )
        )}
        {activeColumn === 'cooking' && (
          preparingOrders.length === 0 ? (
            <EmptyState icon="flame-outline" title="Nothing cooking" message="No orders currently being prepared." />
          ) : (
            preparingOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onStatusUpdate={updateStatus}
                nextStatus="ready"
                buttonText="READY"
                buttonColor={COLORS.success}
              />
            ))
          )
        )}
        {activeColumn === 'ready' && (
          readyOrders.length === 0 ? (
            <EmptyState icon="checkmark-circle-outline" title="No orders ready" message="Mark cooking orders as ready." />
          ) : (
            readyOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onStatusUpdate={updateStatus}
                showReady
              />
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: COLORS.textMuted, marginTop: 8 },

  toolbar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  stationRow: { gap: 8, paddingRight: 12 },
  stationChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.surface,
  },
  stationChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stationChipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  stationChipTextActive: { color: '#fff', fontWeight: '700' },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingVertical: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    borderLeftWidth: 4,
    paddingVertical: 4,
  },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.8, marginTop: 2 },

  columnTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  columnTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  columnTabText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.5 },

  mainContent: { padding: 12, gap: 10 },

  // Multi-column layout (used internally by KitchenColumn, kept for potential reuse)
  column: {
    flex: 1,
    borderTopWidth: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  columnTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  columnCountBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  columnCountText: { fontSize: 12, fontWeight: '700' },
  columnScroll: { flex: 1 },
  columnContent: { padding: 8, gap: 8 },
  emptyCol: { padding: 20, alignItems: 'center' },
  emptyColText: { color: COLORS.textMuted, fontSize: 13 },

  // Order Card
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  cardNumRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardNum: { fontSize: 12, fontWeight: '800', color: '#475569' },
  tblBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tblBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardTime: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  prepTime: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  delayedBadge: { backgroundColor: '#f59e0b', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  delayedBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  itemsList: { padding: 10, gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemQty: { fontSize: 14, fontWeight: '800', color: '#334155', width: 28, textAlign: 'right' },
  itemName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  modsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  modChip: { backgroundColor: '#fee2e2', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 1 },
  modChipText: { color: '#991b1b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  noteBox: {
    marginTop: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 4,
    padding: 6,
  },
  noteText: { color: '#c2410c', fontSize: 12, fontStyle: 'italic' },

  cardActions: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delayBtn: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
});
