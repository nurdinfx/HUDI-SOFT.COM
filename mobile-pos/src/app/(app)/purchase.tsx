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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { purchasesApi } from '@/api';
import { COLORS } from '@/constants';
import StatCard from '@/components/StatCard';
import FilterBar from '@/components/FilterBar';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';

type PurchaseItem = {
  _id: string;
  reference?: string;
  invoiceNumber?: string;
  supplierName?: string;
  supplier?: { name: string };
  date?: string;
  createdAt?: string;
  total?: number;
  finalTotal?: number;
  amount?: number;
  status?: string;
  items?: { name: string; qty: number; cost?: number; total?: number }[];
};

const FILTERS = ['All', 'completed', 'pending', 'ordered'];

export default function PurchaseScreen() {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<PurchaseItem | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await purchasesApi.getAll({ limit: 100 });
      setPurchases((res.purchases || []) as PurchaseItem[]);
    } catch (err) {
      console.error('Purchase load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = purchases.filter(p => {
    const ref = p.reference || p.invoiceNumber || '';
    const supplier = p.supplierName || p.supplier?.name || '';
    const matchesSearch = ref.toLowerCase().includes(search.toLowerCase()) ||
      supplier.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && (p.status || 'recorded').toLowerCase() === statusFilter.toLowerCase();
  });

  const totalAmount = purchases.reduce((sum, p) => sum + (p.total || p.finalTotal || p.amount || 0), 0);
  const totalCount = purchases.length;
  const pendingCount = purchases.filter(p => (p.status || '').toLowerCase() === 'pending').length;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading purchases…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search purchases or suppliers…"
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
      </View>

      {/* Filter Tabs */}
      <FilterBar filters={FILTERS} selected={statusFilter} onSelect={setStatusFilter} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        {/* Summary stats */}
        <View style={styles.statsRow}>
          <StatCard
            icon="wallet-outline"
            iconColor={COLORS.success}
            label="Total Spent"
            value={`$${totalAmount.toFixed(2)}`}
          />
          <View style={{ width: 12 }} />
          <StatCard
            icon="document-text-outline"
            iconColor={COLORS.primary}
            label="Total Bills"
            value={totalCount}
            sub={`${pendingCount} pending`}
          />
        </View>

        {/* List of Purchases */}
        {filtered.length === 0 ? (
          <EmptyState icon="cart-outline" title="No Purchases Found" message="No purchases match your criteria." />
        ) : (
          filtered.map((p) => {
            const ref = p.reference || p.invoiceNumber || `PO-${p._id.slice(-6).toUpperCase()}`;
            const supplier = p.supplierName || p.supplier?.name || 'Unknown Supplier';
            const dateStr = p.date || p.createdAt || '';
            const date = dateStr ? new Date(dateStr).toLocaleDateString() : '—';
            const total = p.total || p.finalTotal || p.amount || 0;
            const status = p.status || 'recorded';

            return (
              <TouchableOpacity
                key={p._id}
                style={styles.purchaseCard}
                onPress={() => setSelected(p)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.refCol}>
                    <Text style={styles.refText}>{ref}</Text>
                    <Text style={styles.supplierText}>{supplier}</Text>
                  </View>
                  <View style={styles.totalCol}>
                    <Text style={styles.totalText}>${total.toFixed(2)}</Text>
                    <Text style={styles.dateText}>{date}</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <StatusBadge status={status} />
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {selected?.reference || selected?.invoiceNumber || 'Purchase Detail'}
              </Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={26} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView contentContainerStyle={styles.sheetBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Supplier</Text>
                  <Text style={styles.detailValue}>
                    {selected.supplierName || selected.supplier?.name || '—'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {selected.date || selected.createdAt ? new Date(selected.date || selected.createdAt || '').toLocaleDateString() : '—'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <StatusBadge status={selected.status || 'recorded'} size="md" />
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Paid</Text>
                  <Text style={[styles.detailValue, { color: COLORS.primary, fontWeight: '800' }]}>
                    ${(selected.total || selected.finalTotal || selected.amount || 0).toFixed(2)}
                  </Text>
                </View>

                {/* Items breakdown */}
                {selected.items && selected.items.length > 0 && (
                  <View style={styles.itemsSection}>
                    <Text style={styles.itemsTitle}>Purchased Items</Text>
                    {selected.items.map((item, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          {item.cost ? <Text style={styles.itemCost}>Cost: ${item.cost.toFixed(2)}</Text> : null}
                        </View>
                        <Text style={styles.itemQty}>×{item.qty}</Text>
                        <Text style={styles.itemTotal}>
                          ${(item.total || (item.cost || 0) * item.qty).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
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
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
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
  scrollContent: { padding: 16, gap: 12 },
  statsRow: { flexDirection: 'row', marginBottom: 4 },
  purchaseCard: {
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  refCol: { flex: 1, marginRight: 8 },
  refText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  supplierText: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  totalCol: { alignItems: 'flex-end' },
  totalText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  dateText: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingTop: 8,
    marginTop: 4,
  },
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
  itemCost: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  itemQty: { fontSize: 13, color: COLORS.secondary, marginHorizontal: 12 },
  itemTotal: { fontSize: 13, fontWeight: '700', color: COLORS.text, minWidth: 60, textAlign: 'right' },
});
