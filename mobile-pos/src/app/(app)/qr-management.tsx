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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { qrApi } from '@/api';
import { COLORS } from '@/constants';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

type QRTable = {
  _id: string;
  name: string;
  number?: string | number;
  tableNumber?: string | number;
  capacity?: number;
  location?: string;
  qrToken?: string;
  qrUrl?: string;
  qrEnabled?: boolean;
  qrScanCount?: number;
};

type QRAnalytics = {
  totalScans?: number;
  totalQROrders?: number;
  totalQRRevenue?: number;
  tablesWithQR?: number;
};

const buildQRValue = (table: QRTable) => {
  if (table.qrUrl) {
    return table.qrUrl.replace('/menu?table=', '/order?table=');
  }
  return `https://hudi-soft-pos.online/order?table=${table.qrToken || ''}`;
};

export default function QRManagementScreen() {
  const [tables, setTables] = useState<QRTable[]>([]);
  const [analytics, setAnalytics] = useState<QRAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTable, setSelectedTable] = useState<QRTable | null>(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tablesRes, analyticsRes] = await Promise.all([
        qrApi.getTablesWithQR(),
        qrApi.getAnalytics().catch(() => ({ success: false, data: null })),
      ]);

      const extractedTables = tablesRes.tables?.length
        ? tablesRes.tables
        : (Array.isArray(tablesRes.data) ? tablesRes.data : []);
      
      setTables((extractedTables || []) as QRTable[]);
      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data as QRAnalytics);
      }
    } catch (err) {
      console.error('QR load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerateQR = async (tableId: string) => {
    setActionLoading(true);
    try {
      const res = await qrApi.generateQR(tableId);
      if (res.success) {
        Alert.alert('Success', 'QR code generated successfully!');
        load();
        if (selectedTable && selectedTable._id === tableId) {
          setSelectedTable({
            ...selectedTable,
            qrToken: res.data?.qrToken || 'token',
            qrUrl: res.data?.qrUrl,
            qrEnabled: true,
          });
        }
      } else {
        Alert.alert('Failed', res.message || 'Could not generate QR code');
      }
    } catch (err) {
      Alert.alert('Error', 'An error occurred while generating the QR code');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleQR = async (tableId: string) => {
    setActionLoading(true);
    try {
      const res = await qrApi.toggleQR(tableId);
      if (res.success) {
        const isEnabled = res.data?.qrEnabled;
        setTables(prev =>
          prev.map(t => t._id === tableId ? { ...t, qrEnabled: isEnabled } : t)
        );
        if (selectedTable && selectedTable._id === tableId) {
          setSelectedTable({ ...selectedTable, qrEnabled: isEnabled });
        }
      } else {
        Alert.alert('Failed', res.message || 'Could not toggle QR status');
      }
    } catch (err) {
      Alert.alert('Error', 'An error occurred while toggling QR status');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = tables.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    String(t.number || t.tableNumber || '').includes(search) ||
    (t.location || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading QR codes…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and stats bar */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tables…"
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

      {/* Analytics dashboard summary */}
      {analytics && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.analyticsScroll}>
          <View style={styles.statMiniCard}>
            <Text style={styles.statLabel}>Total Scans</Text>
            <Text style={styles.statValue}>{analytics.totalScans || 0}</Text>
          </View>
          <View style={styles.statMiniCard}>
            <Text style={styles.statLabel}>QR Orders</Text>
            <Text style={styles.statValue}>{analytics.totalQROrders || 0}</Text>
          </View>
          <View style={styles.statMiniCard}>
            <Text style={styles.statLabel}>QR Revenue</Text>
            <Text style={styles.statValue}>${(analytics.totalQRRevenue || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.statMiniCard}>
            <Text style={styles.statLabel}>Tables Active</Text>
            <Text style={styles.statValue}>{analytics.tablesWithQR || 0} / {tables.length}</Text>
          </View>
        </ScrollView>
      )}

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        {filtered.length === 0 ? (
          <EmptyState icon="qr-code-outline" title="No QR tables" message="No tables found matching criteria." />
        ) : (
          filtered.map((t) => {
            const qrVal = buildQRValue(t);
            const tableNum = t.number || t.tableNumber || '—';
            return (
              <View key={t._id} style={styles.tableCard}>
                <View style={styles.cardInfo}>
                  <View style={styles.tableTitleRow}>
                    <Text style={styles.tableTitle}>TBL {tableNum} — {t.name}</Text>
                    {t.qrToken ? (
                      <StatusBadge status={t.qrEnabled ? 'active' : 'disabled'} />
                    ) : (
                      <StatusBadge status="unpaid" label="No QR" />
                    )}
                  </View>
                  <Text style={styles.tableSub}>
                    {t.location || 'Main Section'} • {t.capacity || 4} seats
                  </Text>
                  {t.qrToken ? (
                    <Text style={styles.scanCount}>Scans: {t.qrScanCount || 0}</Text>
                  ) : null}
                </View>

                <View style={styles.cardActions}>
                  {t.qrToken ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnOutline]}
                      onPress={() => setSelectedTable(t)}
                    >
                      <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.btnTextOutline}>View QR</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnPrimary]}
                      onPress={() => handleGenerateQR(t._id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <Ionicons name="qr-code-outline" size={16} color={COLORS.white} />
                          <Text style={styles.btnTextPrimary}>Generate QR</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* QR Preview Modal */}
      <Modal visible={!!selectedTable} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.previewSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                Table {selectedTable?.number || selectedTable?.tableNumber} QR Code
              </Text>
              <TouchableOpacity onPress={() => setSelectedTable(null)}>
                <Ionicons name="close" size={26} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedTable && (
              <ScrollView contentContainerStyle={styles.sheetBody}>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={buildQRValue(selectedTable)}
                    size={220}
                    color={COLORS.dark}
                    backgroundColor={COLORS.white}
                  />
                </View>

                <View style={styles.urlContainer}>
                  <Text style={styles.urlLabel}>Ordering URL</Text>
                  <Text style={styles.urlText} selectable>{buildQRValue(selectedTable)}</Text>
                </View>

                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      selectedTable.qrEnabled ? styles.btnDanger : styles.btnSuccess
                    ]}
                    onPress={() => handleToggleQR(selectedTable._id)}
                    disabled={actionLoading}
                  >
                    <Ionicons name="power-outline" size={18} color={COLORS.white} />
                    <Text style={styles.actionBtnText}>
                      {selectedTable.qrEnabled ? 'Disable Ordering' : 'Enable Ordering'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnWarning]}
                    onPress={() => handleGenerateQR(selectedTable._id)}
                    disabled={actionLoading}
                  >
                    <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
                    <Text style={styles.actionBtnText}>Regenerate QR</Text>
                  </TouchableOpacity>
                </View>
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
  analyticsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  statMiniCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 10,
    minWidth: 100,
    alignItems: 'center',
    marginRight: 6,
  },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  scrollContent: { padding: 16, gap: 12 },
  tableCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardInfo: { flex: 1, marginRight: 12 },
  tableTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tableTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  tableSub: { fontSize: 12, color: COLORS.textMuted },
  scanCount: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginTop: 4 },
  cardActions: { minWidth: 110, alignItems: 'flex-end' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  btnTextOutline: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnTextPrimary: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  previewSheet: {
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
  sheetBody: { padding: 20, alignItems: 'center' },
  qrContainer: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  urlContainer: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 10,
    marginBottom: 20,
  },
  urlLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  urlText: { fontSize: 12, color: COLORS.text, fontFamily: 'monospace' },
  sheetActions: { width: '100%', gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 8,
  },
  btnSuccess: { backgroundColor: COLORS.success },
  btnDanger: { backgroundColor: COLORS.danger },
  btnWarning: { backgroundColor: COLORS.warning },
  actionBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});
