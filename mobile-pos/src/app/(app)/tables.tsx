import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tablesApi, ordersApi } from '@/api';
import { COLORS } from '@/constants';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

type TableRecord = {
  _id: string;
  name: string;
  capacity?: number;
  status?: string;
  currentOrder?: {
    _id: string;
    orderNumber?: string;
    items?: { name: string; qty: number; price: number }[];
    total?: number;
    status?: string;
  };
  waiter?: { name: string };
};

const TABLE_STATUS_COLOR: Record<string, string> = {
  available: COLORS.success,
  occupied:  COLORS.danger,
  reserved:  COLORS.warning,
};

export default function TablesScreen() {
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TableRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'occupied'>('all');

  const load = useCallback(async () => {
    try {
      const res = await tablesApi.getAll();
      setTables((res.tables || []) as TableRecord[]);
    } catch (err) {
      console.error('Tables load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20_000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = filterStatus === 'all'
    ? tables
    : tables.filter((t) => (t.status || 'available').toLowerCase() === filterStatus);

  const statusSummary = {
    available: tables.filter((t) => (t.status || 'available') === 'available').length,
    occupied:  tables.filter((t) => t.status === 'occupied').length,
    reserved:  tables.filter((t) => t.status === 'reserved').length,
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Ionicons name="grid-outline" size={48} color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading tables…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        {(['available', 'occupied', 'reserved'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.summaryCard, filterStatus === s && styles.summaryCardActive]}
            onPress={() => setFilterStatus(filterStatus === s ? 'all' : s as any)}
          >
            <View style={[styles.statusDot, { backgroundColor: TABLE_STATUS_COLOR[s] }]} />
            <Text style={styles.summaryCount}>{statusSummary[s]}</Text>
            <Text style={styles.summaryLabel}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        {filtered.length === 0 ? (
          <EmptyState icon="grid-outline" title="No Tables" message="No tables found. Add tables in Settings." />
        ) : (
          filtered.map((table) => {
            const status = (table.status || 'available').toLowerCase();
            const statusColor = TABLE_STATUS_COLOR[status] || COLORS.secondary;
            return (
              <TouchableOpacity
                key={table._id}
                style={[styles.tableCard, { borderTopColor: statusColor, borderTopWidth: 3 }]}
                onPress={() => setSelected(table)}
                activeOpacity={0.8}
              >
                <View style={styles.tableIconRow}>
                  <View style={[styles.tableIconWrap, { backgroundColor: `${statusColor}15` }]}>
                    <Ionicons name="grid-outline" size={20} color={statusColor} />
                  </View>
                  <StatusBadge status={status} />
                </View>
                <Text style={styles.tableName}>{table.name}</Text>
                {table.capacity ? (
                  <Text style={styles.tableCapacity}>
                    <Ionicons name="people-outline" size={11} color={COLORS.textMuted} /> {table.capacity} seats
                  </Text>
                ) : null}
                {table.currentOrder ? (
                  <Text style={styles.tableOrderText} numberOfLines={1}>
                    Order: {table.currentOrder.orderNumber || '#' + table.currentOrder._id.slice(-6).toUpperCase()}
                  </Text>
                ) : null}
                {table.waiter ? (
                  <Text style={styles.waiterText}>Waiter: {table.waiter.name}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Table Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selected?.name ?? 'Table'}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={26} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView style={styles.sheetBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <StatusBadge status={selected.status || 'available'} size="md" />
                </View>
                {selected.capacity ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Capacity</Text>
                    <Text style={styles.detailValue}>{selected.capacity} seats</Text>
                  </View>
                ) : null}
                {selected.waiter ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Waiter</Text>
                    <Text style={styles.detailValue}>{selected.waiter.name}</Text>
                  </View>
                ) : null}

                {selected.currentOrder ? (
                  <View style={styles.orderSection}>
                    <Text style={styles.orderSectionTitle}>Current Order</Text>
                    {(selected.currentOrder.items || []).map((item, i) => (
                      <View key={i} style={styles.itemRow}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemQty}>×{item.qty}</Text>
                        <Text style={styles.itemPrice}>${(item.price * item.qty).toFixed(2)}</Text>
                      </View>
                    ))}
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalValue}>${(selected.currentOrder.total || 0).toFixed(2)}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noOrderText}>No active order on this table.</Text>
                )}
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
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  summaryCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  summaryCount: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  summaryLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  tableCard: {
    width: '47%',
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
  tableIconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tableIconWrap: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tableName: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  tableCapacity: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  tableOrderText: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  waiterText: { fontSize: 11, color: COLORS.secondary, marginTop: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderColor: COLORS.cardBorder,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  sheetBody: { padding: 20 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderColor: COLORS.cardBorder,
  },
  detailLabel: { fontSize: 14, color: COLORS.secondary, fontWeight: '500' },
  detailValue: { fontSize: 14, color: COLORS.text, fontWeight: '700' },
  orderSection: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
  },
  orderSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderColor: COLORS.cardBorder },
  itemName: { flex: 1, fontSize: 13, color: COLORS.text },
  itemQty: { fontSize: 13, color: COLORS.secondary, marginRight: 8 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderColor: COLORS.cardBorder,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  noOrderText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 20 },
});
