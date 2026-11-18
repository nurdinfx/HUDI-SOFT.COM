import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { orderRepo, Order } from '@/db/repositories/orderRepo';
import { productRepo } from '@/db/repositories/productRepo';
import { useSyncStore } from '@/store/syncStore';
import { useAuthStore } from '@/store/authStore';
import { SyncManager } from '@/sync/SyncManager';
import { COLORS } from '@/constants';
import { getFeaturedModules } from '@/constants/modules';

type Timeframe = 'today' | 'week' | 'month';

interface DashStats {
  todayRevenue: number;
  todayOrders: number;
  completedOrders: number;
  monthlyRevenue: number;
  totalCustomers: number;
  lowStockProducts: number;
  availableTables: number;
  averageOrderValue: number;
  catalogCount: number;
  unsyncedCount: number;
}

const STAT_CARDS = (stats: DashStats) => [
  {
    title: "Today's Revenue",
    value: `$${stats.todayRevenue.toFixed(2)}`,
    icon: 'cash-outline' as const,
    gradFrom: '#10b981',
    gradTo: '#059669',
    change: 'Live',
  },
  {
    title: "Today's Orders",
    value: String(stats.todayOrders),
    icon: 'cart-outline' as const,
    gradFrom: '#3b82f6',
    gradTo: '#2563eb',
    change: 'Live',
  },
  {
    title: 'Completed Orders',
    value: String(stats.completedOrders),
    icon: 'checkmark-circle-outline' as const,
    gradFrom: '#22c55e',
    gradTo: '#16a34a',
    change: 'Today',
  },
  {
    title: 'Monthly Revenue',
    value: `$${stats.monthlyRevenue.toFixed(2)}`,
    icon: 'trending-up-outline' as const,
    gradFrom: '#a855f7',
    gradTo: '#7c3aed',
    change: 'Month',
  },
  {
    title: 'Total Customers',
    value: String(stats.totalCustomers),
    icon: 'people-outline' as const,
    gradFrom: '#f59e0b',
    gradTo: '#d97706',
    change: 'All time',
  },
  {
    title: 'Low Stock Items',
    value: String(stats.lowStockProducts),
    icon: 'alert-circle-outline' as const,
    gradFrom: '#f43f5e',
    gradTo: '#e11d48',
    change: 'Attention',
  },
  {
    title: 'Available Tables',
    value: `${stats.availableTables}`,
    icon: 'restaurant-outline' as const,
    gradFrom: '#6366f1',
    gradTo: '#4f46e5',
    change: 'Live',
  },
  {
    title: 'Avg. Order Value',
    value: `$${stats.averageOrderValue.toFixed(2)}`,
    icon: 'bar-chart-outline' as const,
    gradFrom: '#06b6d4',
    gradTo: '#0891b2',
    change: 'Today',
  },
];

function getStatusColor(status?: string) {
  switch (status) {
    case 'completed': return { bg: '#f0fdf4', text: '#15803d' };
    case 'preparing': return { bg: '#fffbeb', text: '#d97706' };
    case 'served':    return { bg: '#eff6ff', text: '#2563eb' };
    case 'pending':   return { bg: '#f8fafc', text: '#475569' };
    default:          return { bg: '#f8fafc', text: '#475569' };
  }
}

function getOrderTypeIcon(type?: string): string {
  switch (type) {
    case 'dine-in':  return 'restaurant-outline';
    case 'takeaway': return 'bag-handle-outline';
    case 'delivery': return 'bicycle-outline';
    default:         return 'cafe-outline';
  }
}

export default function DashboardScreen() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  const [stats, setStats] = useState<DashStats>({
    todayRevenue: 0,
    todayOrders: 0,
    completedOrders: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
    availableTables: 0,
    averageOrderValue: 0,
    catalogCount: 0,
    unsyncedCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const { isSyncing, lastSyncTime, error } = useSyncStore();
  const { user } = useAuthStore();
  const featuredModules = useMemo(() => getFeaturedModules(user?.role, 4), [user?.role]);

  const loadData = (tf: Timeframe = timeframe) => {
    try {
      const allOrders = orderRepo.getOrders(500);
      const products  = productRepo.getProducts();

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Filter by timeframe for the main stats
      let filtered: Order[];
      if (tf === 'today') {
        filtered = allOrders.filter((o) => o.created_at.startsWith(todayStr));
      } else if (tf === 'week') {
        filtered = allOrders.filter((o) => new Date(o.created_at) >= startOfWeek);
      } else {
        filtered = allOrders.filter((o) => new Date(o.created_at) >= startOfMonth);
      }

      const todayOrders   = allOrders.filter((o) => o.created_at.startsWith(todayStr));
      const monthlyOrders = allOrders.filter((o) => new Date(o.created_at) >= startOfMonth);

      const revenue     = filtered.reduce((s, o) => s + o.total, 0);
      const completed   = filtered.filter((o: any) => o.status === 'completed').length;
      const avgVal      = filtered.length > 0 ? revenue / filtered.length : 0;
      const lowStock    = products.filter((p) => p.stock <= 5).length;
      const unsynced    = orderRepo.getPendingSyncQueue().length;
      const monthRev    = monthlyOrders.reduce((s, o) => s + o.total, 0);

      setStats({
        todayRevenue: todayOrders.reduce((s, o) => s + o.total, 0),
        todayOrders: todayOrders.length,
        completedOrders: completed,
        monthlyRevenue: monthRev,
        totalCustomers: 0, // needs customerRepo
        lowStockProducts: lowStock,
        availableTables: 0, // needs API
        averageOrderValue: avgVal,
        catalogCount: products.length,
        unsyncedCount: unsynced,
      });

      setRecentOrders(orderRepo.getOrders(8));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard load error', err);
    }
  };

  useEffect(() => {
    loadData(timeframe);
    const unsub = useSyncStore.subscribe((state) => {
      if (!state.isSyncing) loadData(timeframe);
    });
    return () => unsub();
  }, [timeframe]);

  const handleSync = async () => {
    setRefreshing(true);
    await SyncManager.syncAll();
    loadData(timeframe);
    setRefreshing(false);
  };

  const statCards = STAT_CARDS(stats);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleSync} tintColor={COLORS.primary} />
      }
    >
      {/* ─── Header Card ─── */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.branchPill}>
            <Ionicons name="business-outline" size={13} color="#fff" />
            <Text style={styles.branchPillText}>{user?.branch?.name || 'Main Branch'}</Text>
          </View>
          <TouchableOpacity style={styles.menuShortcut} onPress={() => router.push('/(app)/more')}>
            <Ionicons name="apps-outline" size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerMainRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.cashierName}>{user?.name || 'POS Cashier'}</Text>
            <Text style={styles.branchName}>
              {user?.role ? `${user.role.toUpperCase()} terminal` : 'Branch terminal'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.syncingButton]}
            onPress={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="sync-outline" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.headerSub}>
          Restaurant Dashboard • Real-time POS Data • Updated{' '}
          {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      {/* ─── Sync Status ─── */}
      <View style={styles.syncRow}>
        <View style={styles.syncLeft}>
          <View style={[styles.dot, stats.unsyncedCount > 0 ? styles.dotWarn : styles.dotOk]} />
          <Text style={styles.syncText}>
            {stats.unsyncedCount > 0
              ? `${stats.unsyncedCount} orders waiting to sync`
              : 'All systems synchronized'}
          </Text>
        </View>
        <Text style={styles.syncTime}>
          {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}
        </Text>
      </View>

      {/* ─── Timeframe Switcher ─── */}
      <View style={styles.timeframeRow}>
        {(['today', 'week', 'month'] as Timeframe[]).map((tf) => (
          <TouchableOpacity
            key={tf}
            style={[styles.tfChip, timeframe === tf && styles.tfChipActive]}
            onPress={() => setTimeframe(tf)}
          >
            <Text style={[styles.tfChipText, timeframe === tf && styles.tfChipTextActive]}>
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadData(timeframe)}
        >
          <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Stats Grid (8 cards — 2 per row) ─── */}
      <View style={styles.statsGrid}>
        {statCards.map((card, i) => (
          <View
            key={i}
            style={[styles.statCard, { backgroundColor: card.gradFrom }]}
          >
            <View style={styles.statCardTop}>
              <View style={styles.statIconWrap}>
                <Ionicons name={card.icon} size={22} color="#fff" />
              </View>
              <View style={styles.changePill}>
                <Text style={styles.changeText}>{card.change}</Text>
              </View>
            </View>
            <Text style={styles.statTitle}>{card.title}</Text>
            <Text style={styles.statValue}>{card.value}</Text>
            <View style={styles.statBar}>
              <View style={[styles.statBarFill, { width: '70%' }]} />
            </View>
          </View>
        ))}
      </View>

      {/* ─── Quick Actions ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/more')}>
            <Text style={styles.sectionLink}>Open menu</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickGrid}>
          {featuredModules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={styles.quickCard}
              onPress={() => router.push(module.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: `${module.color}22` }]}>
                <Ionicons name={module.icon} size={22} color={module.color} />
              </View>
              <Text style={styles.quickTitle}>{module.title}</Text>
              <Text style={styles.quickSub} numberOfLines={2}>{module.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ─── Operational Status ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Operational Status</Text>
        </View>

        {[
          {
            title: 'Catalog Ready',
            sub: `${stats.catalogCount} products on this device`,
            icon: 'cube-outline',
            iconBg: 'rgba(34,197,94,0.12)',
            iconColor: COLORS.success,
            value: stats.catalogCount,
          },
          {
            title: 'Stock Attention',
            sub: stats.lowStockProducts > 0 ? 'Some items need restocking' : 'No low-stock products',
            icon: 'alert-circle-outline',
            iconBg: 'rgba(245,158,11,0.12)',
            iconColor: '#f59e0b',
            value: stats.lowStockProducts,
          },
          {
            title: 'Sync Queue',
            sub: stats.unsyncedCount > 0 ? 'Orders waiting to upload' : 'Device and cloud aligned',
            icon: 'cloud-done-outline',
            iconBg: 'rgba(79,70,229,0.12)',
            iconColor: COLORS.primary,
            value: stats.unsyncedCount,
          },
        ].map((row, i) => (
          <View key={i} style={styles.statusRow}>
            <View style={styles.statusRowLeft}>
              <View style={[styles.statusIconWrap, { backgroundColor: row.iconBg }]}>
                <Ionicons name={row.icon as any} size={18} color={row.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>{row.title}</Text>
                <Text style={styles.statusSub}>{row.sub}</Text>
              </View>
            </View>
            <Text style={styles.statusValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* ─── Recent Orders ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/orders')}>
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="file-tray-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No sales recorded yet today.</Text>
          </View>
        ) : (
          recentOrders.map((order) => {
            const sc = getStatusColor((order as any).status);
            return (
              <View key={order.id} style={styles.orderRow}>
                <View style={styles.orderRowLeft}>
                  <View style={styles.orderTypeIcon}>
                    <Ionicons
                      name={getOrderTypeIcon((order as any).type) as any}
                      size={18}
                      color={COLORS.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.orderNum}>Order #{order.id.slice(-8).toUpperCase()}</Text>
                    <Text style={styles.orderMeta}>
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {order.items.length} items
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
                  <View style={[styles.syncBadge, order.synced ? styles.syncedBadge : styles.pendingBadge]}>
                    <Text style={styles.syncBadgeText}>{order.synced ? 'Synced' : 'Offline'}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ─── Footer ─── */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={[styles.dot, styles.dotOk]} />
          <Text style={styles.footerText}>Live Data</Text>
        </View>
        <View style={styles.footerLeft}>
          <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.footerText}>Cached Data</Text>
        </View>
        <Text style={styles.footerVersion}>POS v2.0</Text>
      </View>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Header
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  branchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  branchPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  menuShortcut: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  headerMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { fontSize: 13, color: COLORS.textMuted },
  cashierName: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  branchName: { fontSize: 12, color: COLORS.accent, marginTop: 4, fontWeight: '600' },
  headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 14, lineHeight: 18 },
  syncButton: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  syncingButton: { backgroundColor: COLORS.cardBorder },

  // Sync Status
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  syncLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOk: { backgroundColor: COLORS.success },
  dotWarn: { backgroundColor: '#f59e0b' },
  syncText: { fontSize: 12, color: COLORS.text, fontWeight: '500' },
  syncTime: { fontSize: 11, color: COLORS.textMuted },

  // Timeframe Switcher
  timeframeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tfChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tfChipActive: { backgroundColor: COLORS.primary },
  tfChipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tfChipTextActive: { color: '#fff', fontWeight: '700' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  refreshBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '47.5%',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  statIconWrap: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  changePill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  statTitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  statBar: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 8,
  },
  statBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 99 },

  // Sections
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  sectionLink: { fontSize: 13, color: COLORS.accent, fontWeight: '700' },

  // Quick Actions
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    width: '47.5%',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    minHeight: 120,
  },
  quickIcon: {
    width: 42, height: 42,
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  quickTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  quickSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },

  // Operational Status rows
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  statusRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12, paddingRight: 8 },
  statusIconWrap: {
    width: 36, height: 36,
    borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  statusTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  statusSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  statusValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },

  // Recent Orders
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  orderRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  orderTypeIcon: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}18`,
    justifyContent: 'center', alignItems: 'center',
  },
  orderNum: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  orderMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  orderTotal: { fontSize: 16, fontWeight: '800', color: COLORS.success },
  syncBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, marginTop: 4,
  },
  syncedBadge: { backgroundColor: 'rgba(16,185,129,0.15)' },
  pendingBadge: { backgroundColor: 'rgba(245,158,11,0.15)' },
  syncBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.text },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 12, color: COLORS.textMuted },
  footerVersion: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
});
