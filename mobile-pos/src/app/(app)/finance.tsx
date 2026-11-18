import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { financeApi } from '@/api';
import { COLORS } from '@/constants';
import StatCard from '@/components/StatCard';
import FilterBar from '@/components/FilterBar';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';

type Transaction = {
  _id: string;
  type?: string;
  category?: string;
  amount?: number;
  description?: string;
  date?: string;
  createdAt?: string;
  paymentMethod?: string;
};

type FinanceDashboard = {
  totalRevenue?: number;
  totalExpenses?: number;
  netProfit?: number;
  cashBalance?: number;
  revenueGrowth?: number;
};

const DATE_FILTERS = ['Today', 'Week', 'Month'];

export default function FinanceScreen() {
  const [dashboard, setDashboard] = useState<FinanceDashboard>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateFilter, setDateFilter] = useState('Today');
  const [typeFilter, setTypeFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dashRes, txRes] = await Promise.all([
        financeApi.getDashboard(),
        financeApi.getTransactions(),
      ]);
      setDashboard((dashRes.data as FinanceDashboard) || {});
      setTransactions((txRes.transactions || []) as Transaction[]);
    } catch (err) {
      console.error('Finance load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredTx = typeFilter === 'All'
    ? transactions
    : transactions.filter((t) => (t.type || '').toLowerCase() === typeFilter.toLowerCase());

  const revenue = dashboard.totalRevenue ?? 0;
  const expenses = dashboard.totalExpenses ?? 0;
  const profit = dashboard.netProfit ?? (revenue - expenses);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading finance data…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FilterBar filters={DATE_FILTERS} selected={dateFilter} onSelect={setDateFilter} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        {/* KPI cards row 1 */}
        <View style={styles.statsRow}>
          <StatCard icon="cash-outline"    iconColor={COLORS.success}  label="Total Revenue"  value={`$${revenue.toFixed(2)}`} />
          <View style={styles.cardGap} />
          <StatCard icon="receipt-outline" iconColor={COLORS.danger}   label="Total Expenses" value={`$${expenses.toFixed(2)}`} />
        </View>
        <View style={styles.statsRow}>
          <StatCard icon="trending-up-outline" iconColor={profit >= 0 ? COLORS.success : COLORS.danger} label="Net Profit" value={`$${profit.toFixed(2)}`} />
          <View style={styles.cardGap} />
          <StatCard icon="wallet-outline"  iconColor={COLORS.primary}  label="Cash Balance"   value={`$${(dashboard.cashBalance ?? 0).toFixed(2)}`} />
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <View style={styles.typeFilters}>
              {['All', 'income', 'expense'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.typeChip, typeFilter === f && styles.activeTypeChip]}
                  onPress={() => setTypeFilter(f)}
                >
                  <Text style={[styles.typeChipText, typeFilter === f && styles.activeTypeChipText]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {filteredTx.length === 0 ? (
            <EmptyState icon="wallet-outline" message="No transactions found." />
          ) : (
            filteredTx.map((tx) => (
              <View key={tx._id} style={styles.txRow}>
                <View style={[styles.txIconWrap, {
                  backgroundColor: tx.type === 'expense' ? `${COLORS.danger}12` : `${COLORS.success}12`,
                }]}>
                  <Ionicons
                    name={tx.type === 'expense' ? 'arrow-up-outline' : 'arrow-down-outline'}
                    size={18}
                    color={tx.type === 'expense' ? COLORS.danger : COLORS.success}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc} numberOfLines={1}>
                    {tx.description || tx.category || 'Transaction'}
                  </Text>
                  <Text style={styles.txDate}>
                    {tx.date || tx.createdAt
                      ? new Date(tx.date || tx.createdAt || '').toLocaleDateString()
                      : '—'}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: tx.type === 'expense' ? COLORS.danger : COLORS.success }]}>
                    {tx.type === 'expense' ? '-' : '+'}${(tx.amount ?? 0).toFixed(2)}
                  </Text>
                  {tx.paymentMethod ? (
                    <Text style={styles.txMethod}>{tx.paymentMethod}</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 15 },
  content: { padding: 16, gap: 0 },
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  cardGap: { width: 12 },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderColor: COLORS.cardBorder,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  typeFilters: { flexDirection: 'row', gap: 6 },
  typeChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1, borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
  },
  activeTypeChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: 11, fontWeight: '600', color: COLORS.secondary },
  activeTypeChipText: { color: COLORS.white },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderTopWidth: 1, borderColor: COLORS.cardBorder,
  },
  txIconWrap: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  txDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txMethod: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
