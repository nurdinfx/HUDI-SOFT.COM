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
import { attendanceApi } from '@/api';
import { COLORS } from '@/constants';
import StatCard from '@/components/StatCard';
import FilterBar from '@/components/FilterBar';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';

type AttendanceLog = {
  _id: string;
  employeeName?: string;
  employee?: { name: string };
  checkIn?: string;
  checkOut?: string;
  date?: string;
  status?: 'present' | 'absent' | 'late' | string;
  hoursWorked?: number;
};

type AttendanceSummary = {
  totalPresent?: number;
  totalAbsent?: number;
  totalLate?: number;
  totalEmployees?: number;
  avgHours?: number;
};

const DATE_FILTERS = ['Today', 'Week', 'Month'];

export default function AttendanceScreen() {
  const [summary, setSummary] = useState<AttendanceSummary>({});
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [dateFilter, setDateFilter] = useState('Today');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        attendanceApi.getDashboardStats(),
        attendanceApi.getLogs(),
      ]);
      setSummary((statsRes.data as AttendanceSummary) || {});
      setLogs((logsRes.logs || []) as AttendanceLog[]);
    } catch (err) {
      console.error('Attendance load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredLogs = statusFilter === 'All'
    ? logs
    : logs.filter((l) => (l.status || '').toLowerCase() === statusFilter.toLowerCase());

  const formatTime = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading attendance data…</Text>
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
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="checkmark-circle-outline"
            iconColor={COLORS.success}
            label="Present"
            value={summary.totalPresent ?? 0}
          />
          <View style={{ width: 12 }} />
          <StatCard
            icon="close-circle-outline"
            iconColor={COLORS.danger}
            label="Absent"
            value={summary.totalAbsent ?? 0}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="time-outline"
            iconColor={COLORS.warning}
            label="Late"
            value={summary.totalLate ?? 0}
          />
          <View style={{ width: 12 }} />
          <StatCard
            icon="people-outline"
            iconColor={COLORS.primary}
            label="Total Staff"
            value={summary.totalEmployees ?? 0}
          />
        </View>

        {/* Status filter */}
        <View style={styles.filterRow}>
          {['All', 'present', 'absent', 'late'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, statusFilter === f && styles.activeChip]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[styles.chipText, statusFilter === f && styles.activeChipText]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Attendance logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Logs</Text>

          {filteredLogs.length === 0 ? (
            <EmptyState icon="time-outline" message="No attendance logs for this period." />
          ) : (
            filteredLogs.map((log) => (
              <View key={log._id} style={styles.logRow}>
                <View style={styles.logAvatar}>
                  <Text style={styles.logAvatarText}>
                    {(log.employeeName || log.employee?.name || 'S').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.logInfo}>
                  <Text style={styles.logName}>
                    {log.employeeName || log.employee?.name || 'Unknown'}
                  </Text>
                  <View style={styles.logTimes}>
                    <Ionicons name="log-in-outline" size={12} color={COLORS.success} />
                    <Text style={styles.logTimeText}>{formatTime(log.checkIn)}</Text>
                    <Ionicons name="log-out-outline" size={12} color={COLORS.danger} style={{ marginLeft: 10 }} />
                    <Text style={styles.logTimeText}>{formatTime(log.checkOut)}</Text>
                  </View>
                  {log.hoursWorked != null ? (
                    <Text style={styles.logHours}>{log.hoursWorked.toFixed(1)}h worked</Text>
                  ) : null}
                </View>
                <StatusBadge status={log.status || 'present'} />
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
  content: { padding: 16, gap: 12 },
  statsRow: { flexDirection: 'row', marginBottom: 0 },
  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingVertical: 4,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.surface,
  },
  activeChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },
  activeChipText: { color: COLORS.white },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.text,
    padding: 16, borderBottomWidth: 1, borderColor: COLORS.cardBorder,
  },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderTopWidth: 1, borderColor: COLORS.cardBorder,
  },
  logAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center', alignItems: 'center',
  },
  logAvatarText: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  logInfo: { flex: 1 },
  logName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  logTimes: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  logTimeText: { fontSize: 12, color: COLORS.secondary },
  logHours: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
