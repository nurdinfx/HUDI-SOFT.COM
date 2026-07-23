import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { qrApi } from '@/api';
import { COLORS } from '@/constants';

export default function QRMenuScreen() {
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await qrApi.getAnalytics();
        setAnalytics((res.data || {}) as Record<string, unknown>);
      } catch {
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Ionicons name="phone-portrait-outline" size={40} color={COLORS.primary} />
        <Text style={styles.title}>QR Self-Order Menu</Text>
        <Text style={styles.sub}>
          Customers scan the table QR code to browse the menu and place orders from their phone.
          Manage QR codes under QR Management.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>QR Analytics</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total QR Orders</Text>
          <Text style={styles.statVal}>{Number(analytics?.totalOrders || analytics?.totalQROrders || 0)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Active Tables</Text>
          <Text style={styles.statVal}>{Number(analytics?.activeTables || 0)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Today's QR Revenue</Text>
          <Text style={styles.statVal}>${Number(analytics?.todayRevenue || 0).toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>1. Open QR Management and generate a code per table.</Text>
        <Text style={styles.infoText}>2. Customer scans QR → opens the mobile menu.</Text>
        <Text style={styles.infoText}>3. Orders appear in Kitchen and Waiter dashboards.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  hero: { alignItems: 'center', padding: 24, marginBottom: 16 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  sub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  statLabel: { color: COLORS.textMuted, fontSize: 14 },
  statVal: { color: COLORS.accent, fontWeight: 'bold', fontSize: 14 },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },
  infoTitle: { color: COLORS.text, fontWeight: 'bold', marginBottom: 10 },
  infoText: { color: COLORS.textMuted, fontSize: 13, marginBottom: 6, lineHeight: 18 },
});
