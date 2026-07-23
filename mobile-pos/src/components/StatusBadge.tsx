import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants';

type StatusType =
  | 'pending' | 'preparing' | 'ready' | 'served'
  | 'completed' | 'cancelled' | 'active' | 'paid' | 'unpaid'
  | 'available' | 'occupied' | 'reserved'
  | string;

const STATUS_MAP: Record<string, { bg: string; text: string; label?: string }> = {
  pending:   { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706' },
  preparing: { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb' },
  ready:     { bg: 'rgba(22, 163, 74, 0.12)',  text: '#16a34a' },
  served:    { bg: 'rgba(22, 163, 74, 0.12)',  text: '#16a34a' },
  completed: { bg: 'rgba(22, 163, 74, 0.12)',  text: '#16a34a' },
  cancelled: { bg: 'rgba(220, 38, 38, 0.12)',  text: '#dc2626' },
  active:    { bg: 'rgba(37, 99, 235, 0.12)',  text: '#2563eb' },
  paid:      { bg: 'rgba(22, 163, 74, 0.12)',  text: '#16a34a' },
  unpaid:    { bg: 'rgba(220, 38, 38, 0.12)',  text: '#dc2626' },
  available: { bg: 'rgba(22, 163, 74, 0.12)',  text: '#16a34a' },
  occupied:  { bg: 'rgba(220, 38, 38, 0.12)',  text: '#dc2626' },
  reserved:  { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706' },
};

interface Props {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, label, size = 'sm' }: Props) {
  const key = (status || '').toLowerCase();
  const cfg = STATUS_MAP[key] || { bg: 'rgba(100,116,139,0.12)', text: COLORS.secondary };
  const displayLabel = label || key.charAt(0).toUpperCase() + key.slice(1);

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, size === 'md' && styles.badgeMd]}>
      <Text style={[styles.text, { color: cfg.text }, size === 'md' && styles.textMd]}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  textMd: {
    fontSize: 13,
  },
});
