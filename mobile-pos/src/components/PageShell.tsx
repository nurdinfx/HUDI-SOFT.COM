import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants';

interface PageShellProps<T> {
  load: () => Promise<T[]>;
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactElement;
  emptyText?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  estimatedItemSize?: number;
  header?: React.ReactNode;
}

export function PageShell<T>({
  load,
  keyExtractor,
  renderItem,
  emptyText = 'No records found.',
  emptyIcon = 'file-tray-outline',
  estimatedItemSize = 88,
  header,
}: PageShellProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await load();
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.center}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.primary} />
        }
      >
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.hintText}>Pull down to retry</Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      {items.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.primary} />
          }
        >
          <Ionicons name={emptyIcon} size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>{emptyText}</Text>
        </ScrollView>
      ) : (
        <FlashList
          data={items}
          keyExtractor={keyExtractor}
          estimatedItemSize={estimatedItemSize}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.primary} />
          }
          renderItem={({ item }) => renderItem(item)}
        />
      )}
    </View>
  );
}

export function ListCard({
  title,
  subtitle,
  right,
  badge,
  badgeColor,
}: {
  title: string;
  subtitle?: string;
  right?: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
        {badge ? (
          <View style={[styles.badge, badgeColor ? { backgroundColor: badgeColor } : null]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {right ? <Text style={styles.cardRight}>{right}</Text> : null}
    </View>
  );
}

export function StatGrid({ stats }: { stats: { label: string; value: string; color?: string }[] }) {
  return (
    <View style={styles.statGrid}>
      {stats.map((s) => (
        <View key={s.label} style={styles.statCard}>
          <Text style={[styles.statVal, s.color ? { color: s.color } : null]}>{s.value}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  hintText: { color: COLORS.textMuted, fontSize: 12, marginTop: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, marginTop: 12, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBody: { flex: 1, paddingRight: 12 },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
  cardSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  cardRight: { color: COLORS.accent, fontSize: 14, fontWeight: 'bold' },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
  },
  badgeText: { color: COLORS.text, fontSize: 10, fontWeight: '600' },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 0,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  statVal: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
});
