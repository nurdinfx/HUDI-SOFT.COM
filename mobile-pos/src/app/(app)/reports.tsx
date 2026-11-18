import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { orderRepo, Order } from '@/db/repositories/orderRepo';
import { COLORS } from '@/constants';

type Timeframe = 'today' | 'week' | 'month' | 'all';

interface ReportData {
  totalRevenue: number;
  ordersCount: number;
  avgOrderValue: number;
  completedOrders: number;
  cashTotal: number;
  cardTotal: number;
  mobileTotal: number;
  creditTotal: number;
  topProducts: { name: string; qty: number; total: number }[];
  // Hourly breakdown for chart approximation
  hourlyRevenue: { hour: string; revenue: number }[];
  dineIn: number;
  takeaway: number;
  delivery: number;
}

function filterOrders(orders: Order[], tf: Timeframe): Order[] {
  const now = new Date();
  if (tf === 'all') return orders;

  const todayStr = now.toISOString().split('T')[0];
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return orders.filter((o) => {
    const d = new Date(o.created_at);
    if (tf === 'today')  return o.created_at.startsWith(todayStr);
    if (tf === 'week')   return d >= startOfWeek;
    if (tf === 'month')  return d >= startOfMonth;
    return true;
  });
}

function buildReport(orders: any[]): ReportData {
  let totalRevenue = 0;
  let cashTotal = 0;
  let cardTotal = 0;
  let mobileTotal = 0;
  let creditTotal = 0;
  let completedOrders = 0;
  let dineIn = 0;
  let takeaway = 0;
  let delivery = 0;
  const productMap: Record<string, { qty: number; total: number }> = {};
  const hourMap: Record<string, number> = {};

  for (const order of orders) {
    const total = order.total ?? order.finalTotal ?? 0;
    totalRevenue += total;

    const pm = (order.payment_method || order.paymentMethod || '').toLowerCase();
    if (pm === 'cash')   cashTotal   += total;
    else if (pm === 'card') cardTotal += total;
    else if (pm === 'mobile_money' || pm === 'mobile') mobileTotal += total;
    else if (pm === 'credit') creditTotal += total;

    if (order.status === 'completed') completedOrders++;

    const ot = (order.orderType || order.type || '').toLowerCase();
    if (ot === 'dine-in')  dineIn++;
    else if (ot === 'takeaway') takeaway++;
    else if (ot === 'delivery') delivery++;

    // Hourly
    const hour = new Date(order.created_at || order.createdAt || Date.now()).getHours();
    const label = `${hour}:00`;
    hourMap[label] = (hourMap[label] || 0) + total;

    for (const item of (order.items || [])) {
      const name = item.name || item.product_name || 'Unknown';
      const qty  = item.qty ?? item.quantity ?? 1;
      const price = item.price ?? 0;
      if (!productMap[name]) productMap[name] = { qty: 0, total: 0 };
      productMap[name].qty   += qty;
      productMap[name].total += qty * price;
    }
  }

  const topProducts = Object.entries(productMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  const hourlyRevenue = Object.entries(hourMap)
    .map(([hour, revenue]) => ({ hour, revenue }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  return {
    totalRevenue,
    ordersCount: orders.length,
    avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    completedOrders,
    cashTotal,
    cardTotal,
    mobileTotal,
    creditTotal,
    topProducts,
    hourlyRevenue,
    dineIn,
    takeaway,
    delivery,
  };
}

export default function ReportsScreen() {
  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  const [report, setReport] = useState<ReportData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const generate = useCallback((tf: Timeframe = timeframe) => {
    try {
      const all = orderRepo.getOrders(1000);
      const filtered = filterOrders(all as any[], tf);
      setReport(buildReport(filtered));
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [timeframe]);

  useEffect(() => {
    generate(timeframe);
  }, [timeframe]);

  const maxRevenue = Math.max(...(report?.hourlyRevenue?.map((h) => h.revenue) ?? [1]), 1);
  const maxProductQty = Math.max(...(report?.topProducts?.map((p) => p.qty) ?? [1]), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); generate(timeframe); }} tintColor={COLORS.primary} />
      }
    >
      {/* ── Timeframe Switcher ── */}
      <View style={styles.timeframeRow}>
        {(['today', 'week', 'month', 'all'] as Timeframe[]).map((tf) => (
          <TouchableOpacity
            key={tf}
            style={[styles.tfChip, timeframe === tf && styles.tfChipActive]}
            onPress={() => setTimeframe(tf)}
          >
            <Text style={[styles.tfText, timeframe === tf && styles.tfTextActive]}>
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Hero Revenue Card ── */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroLabel}>Total Revenue</Text>
          <Text style={styles.heroValue}>${report?.totalRevenue.toFixed(2) ?? '0.00'}</Text>
          <Text style={styles.heroSub}>
            {report?.ordersCount ?? 0} orders • Avg ${report?.avgOrderValue.toFixed(2) ?? '0.00'}
          </Text>
        </View>
        <View style={styles.heroIconWrap}>
          <Ionicons name="trending-up" size={40} color="rgba(255,255,255,0.8)" />
        </View>
      </View>

      {/* ── KPI Cards Row ── */}
      <View style={styles.kpiRow}>
        {[
          { label: 'Orders',     value: String(report?.ordersCount ?? 0),         icon: 'receipt-outline',       color: '#3b82f6' },
          { label: 'Completed',  value: String(report?.completedOrders ?? 0),      icon: 'checkmark-circle-outline', color: '#10b981' },
          { label: 'Avg Value',  value: `$${report?.avgOrderValue.toFixed(2) ?? '0.00'}`, icon: 'bar-chart-outline', color: '#8b5cf6' },
        ].map((kpi, i) => (
          <View key={i} style={[styles.kpiCard, { borderTopColor: kpi.color, borderTopWidth: 3 }]}>
            <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
            <Text style={styles.kpiValue}>{kpi.value}</Text>
            <Text style={styles.kpiLabel}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Revenue by Hour (bar chart approximation) ── */}
      {(report?.hourlyRevenue?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue by Hour</Text>
          <View style={styles.barChart}>
            {report!.hourlyRevenue.map((h) => (
              <View key={h.hour} style={styles.barGroup}>
                <Text style={styles.barValue}>${h.revenue >= 100 ? Math.round(h.revenue) : h.revenue.toFixed(0)}</Text>
                <View style={[styles.bar, { height: Math.max(4, (h.revenue / maxRevenue) * 80) }]} />
                <Text style={styles.barLabel}>{h.hour}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Payment Method Breakdown ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sales by Payment Method</Text>
        {[
          { label: 'Cash',         value: report?.cashTotal   ?? 0, color: '#10b981', icon: 'cash-outline' },
          { label: 'Card',         value: report?.cardTotal   ?? 0, color: '#3b82f6', icon: 'card-outline' },
          { label: 'Mobile Money', value: report?.mobileTotal ?? 0, color: '#f59e0b', icon: 'phone-portrait-outline' },
          { label: 'Credit',       value: report?.creditTotal ?? 0, color: '#8b5cf6', icon: 'person-circle-outline' },
        ].map((pm) => {
          const pct = report?.totalRevenue ? (pm.value / report.totalRevenue) * 100 : 0;
          return (
            <View key={pm.label} style={styles.paymentRow}>
              <View style={[styles.pmIconWrap, { backgroundColor: `${pm.color}18` }]}>
                <Ionicons name={pm.icon as any} size={18} color={pm.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.pmLabelRow}>
                  <Text style={styles.pmLabel}>{pm.label}</Text>
                  <Text style={styles.pmValue}>${pm.value.toFixed(2)}</Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pm.color }]} />
                </View>
                <Text style={styles.pmPct}>{pct.toFixed(1)}% of total</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* ── Order Type Breakdown ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Orders by Type</Text>
        <View style={styles.typeRow}>
          {[
            { label: 'Dine-in',  value: report?.dineIn   ?? 0, icon: 'restaurant-outline', color: '#3b82f6' },
            { label: 'Takeaway', value: report?.takeaway  ?? 0, icon: 'bag-handle-outline', color: '#10b981' },
            { label: 'Delivery', value: report?.delivery  ?? 0, icon: 'bicycle-outline',    color: '#f59e0b' },
          ].map((ot, i) => (
            <View key={i} style={[styles.typeCard, { borderColor: `${ot.color}44` }]}>
              <Ionicons name={ot.icon as any} size={24} color={ot.color} />
              <Text style={[styles.typeNum, { color: ot.color }]}>{ot.value}</Text>
              <Text style={styles.typeLabel}>{ot.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Top Products ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Best Sellers</Text>

        {(report?.topProducts?.length ?? 0) === 0 ? (
          <Text style={styles.emptyText}>No sales data to compute product statistics.</Text>
        ) : (
          report!.topProducts.map((p, index) => {
            const pct = (p.qty / maxProductQty) * 100;
            return (
              <View key={index} style={styles.productRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.productLabelRow}>
                    <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.productTotal}>${p.total.toFixed(2)}</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: COLORS.primary }]} />
                  </View>
                  <Text style={styles.productQty}>{p.qty} units sold</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: 14, paddingBottom: 40 },

  timeframeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 5,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tfChip: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tfChipActive: { backgroundColor: COLORS.primary },
  tfText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  tfTextActive: { color: '#fff', fontWeight: '700' },

  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 22,
    marginBottom: 14,
  },
  heroLeft: { flex: 1 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  heroSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  heroIconWrap: { marginLeft: 16 },

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 4,
  },
  kpiValue: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  kpiLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },

  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },

  // Bar Chart
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 110,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingBottom: 6,
  },
  barGroup: { alignItems: 'center', gap: 4, flex: 1 },
  barValue: { fontSize: 9, color: COLORS.textMuted },
  bar: {
    width: 16,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  barLabel: { fontSize: 9, color: COLORS.textMuted },

  // Payment Rows
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  pmIconWrap: {
    width: 38, height: 38,
    borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  pmLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pmLabel:    { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  pmValue:    { fontSize: 13, color: COLORS.text, fontWeight: '700' },
  pmPct:      { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },

  progressBg: {
    height: 6,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 99,
  },

  // Order Type
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: COLORS.background,
    gap: 4,
  },
  typeNum:   { fontSize: 22, fontWeight: '800' },
  typeLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },

  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 16 },

  // Top Products
  productRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  rankBadge: {
    width: 32, height: 32,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}18`,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  rankText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  productLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productName:  { fontSize: 13, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  productTotal: { fontSize: 13, fontWeight: '700', color: COLORS.success },
  productQty:   { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
});
