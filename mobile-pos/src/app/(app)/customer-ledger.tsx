import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { PageShell, ListCard } from '@/components/PageShell';
import { customersApi } from '@/api';
import { COLORS } from '@/constants';

const pickId = (r: Record<string, unknown>) => String(r.id || r._id || '');

export default function CustomerLedgerScreen() {
  const params = useLocalSearchParams();
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [ledger, setLedger] = useState<Record<string, unknown>[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    const res = await customersApi.getAll({ limit: 200 });
    const list = (res.customers || []) as Record<string, unknown>[];
    setCustomers(list);
    return list;
  }, []);

  const openLedger = async (customer: Record<string, unknown>) => {
    setSelected(customer);
    setLoadingLedger(true);
    try {
      const res = await customersApi.getLedger(pickId(customer), { limit: 50 });
      setLedger(res.entries || []);
    } catch {
      setLedger([]);
    } finally {
      setLoadingLedger(false);
    }
  };

  // If redirected from customers page with an ID, open that customer's ledger automatically
  useEffect(() => {
    if (params.id && customers.length > 0) {
      const cust = customers.find(c => pickId(c) === params.id);
      if (cust) {
        openLedger(cust);
      }
    }
  }, [params.id, customers]);

  return (
    <>
      <PageShell
        load={load}
        keyExtractor={pickId}
        emptyText="No customers with ledger accounts."
        emptyIcon="book-outline"
        renderItem={(c) => (
          <TouchableOpacity onPress={() => openLedger(c)} activeOpacity={0.7}>
            <ListCard
              title={String(c.name || 'Customer')}
              subtitle={String(c.phone || c.email || '')}
              right={`$${Number(c.currentBalance || c.balance || 0).toFixed(2)}`}
              badge="View ledger"
            />
          </TouchableOpacity>
        )}
      />

      <Modal visible={selected !== null} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{String(selected?.name || 'Ledger')}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={26} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetBody}>
              {loadingLedger ? (
                <View style={styles.center}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : ledger.length === 0 ? (
                <Text style={styles.muted}>No ledger entries for this customer.</Text>
              ) : (
                ledger.map((entry, i) => (
                  <View key={String(entry.id || entry._id || i)} style={styles.entry}>
                    <Text style={styles.entryTitle}>{String(entry.description || entry.type || 'Entry')}</Text>
                    <Text style={styles.entrySub}>
                      {new Date(String(entry.date || entry.createdAt || '')).toLocaleString()}
                    </Text>
                    <Text style={styles.entryAmt}>
                      Balance: ${Number(entry.balance || 0).toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 24 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sheetTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  sheetBody: { padding: 16 },
  muted: { color: COLORS.textMuted, textAlign: 'center', padding: 24 },
  center: { padding: 24, justifyContent: 'center', alignItems: 'center' },
  entry: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  entryTitle: { color: COLORS.text, fontWeight: '600' },
  entrySub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  entryAmt: { color: COLORS.accent, fontWeight: 'bold', marginTop: 6 },
});
