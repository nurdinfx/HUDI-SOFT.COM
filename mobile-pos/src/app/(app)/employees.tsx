import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { employeesApi } from '@/api';
import { COLORS } from '@/constants';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

type Employee = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  salary?: number;
  status?: string;
  hireDate?: string;
  advances?: { amount: number; date: string; reason?: string }[];
};

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await employeesApi.getAll();
      setEmployees((res.employees || []) as Employee[]);
    } catch (err) {
      console.error('Employees load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const getRoleColor = (role: string = '') => {
    const map: Record<string, string> = {
      admin: COLORS.primary, manager: '#7c3aed', cashier: COLORS.success,
      waiter: COLORS.warning, chef: '#f97316', driver: COLORS.secondary,
    };
    return map[role.toLowerCase()] || COLORS.secondary;
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading staff directory…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees…"
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

      {/* Summary pill */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>{filtered.length} staff member{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        {filtered.length === 0 ? (
          <EmptyState icon="briefcase-outline" title="No Staff Found" message="No employees match your search." />
        ) : (
          filtered.map((emp) => (
            <TouchableOpacity
              key={emp._id}
              style={styles.empCard}
              onPress={() => setSelected(emp)}
              activeOpacity={0.8}
            >
              <View style={[styles.avatar, { backgroundColor: `${getRoleColor(emp.role)}20` }]}>
                <Text style={[styles.avatarText, { color: getRoleColor(emp.role) }]}>
                  {emp.name.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.empInfo}>
                <Text style={styles.empName}>{emp.name}</Text>
                <Text style={styles.empSub}>
                  {[emp.department, emp.email].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={styles.empRight}>
                <StatusBadge status={emp.status || 'active'} />
                {emp.role ? (
                  <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(emp.role)}15` }]}>
                    <Text style={[styles.roleText, { color: getRoleColor(emp.role) }]}>
                      {emp.role.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Employee Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selected?.name}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={26} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView style={styles.sheetBody}>
                {[
                  { label: 'Role',       value: selected.role },
                  { label: 'Department', value: selected.department },
                  { label: 'Email',      value: selected.email },
                  { label: 'Phone',      value: selected.phone },
                  { label: 'Status',     value: selected.status },
                  { label: 'Salary',     value: selected.salary != null ? `$${selected.salary.toFixed(2)}/mo` : undefined },
                  { label: 'Hire Date',  value: selected.hireDate ? new Date(selected.hireDate).toLocaleDateString() : undefined },
                ].filter((r) => r.value).map((row) => (
                  <View key={row.label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    <Text style={styles.detailValue}>{row.value}</Text>
                  </View>
                ))}

                {(selected.advances || []).length > 0 && (
                  <View style={styles.advancesSection}>
                    <Text style={styles.advancesTitle}>Advance Payments</Text>
                    {(selected.advances || []).map((adv, i) => (
                      <View key={i} style={styles.advanceRow}>
                        <View>
                          <Text style={styles.advanceAmount}>${adv.amount.toFixed(2)}</Text>
                          {adv.reason ? <Text style={styles.advanceReason}>{adv.reason}</Text> : null}
                        </View>
                        <Text style={styles.advanceDate}>{new Date(adv.date).toLocaleDateString()}</Text>
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
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, margin: 16,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 12, height: 46,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  summaryRow: { paddingHorizontal: 16, marginBottom: 8 },
  summaryText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  empCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  empSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  empRight: { alignItems: 'flex-end', gap: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 32,
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
  detailLabel: { fontSize: 14, color: COLORS.secondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  advancesSection: { marginTop: 16 },
  advancesTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  advanceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderTopWidth: 1, borderColor: COLORS.cardBorder,
  },
  advanceAmount: { fontSize: 14, fontWeight: '700', color: COLORS.danger },
  advanceReason: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  advanceDate: { fontSize: 12, color: COLORS.textMuted },
});
