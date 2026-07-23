import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '@/constants';

interface FilterBarProps {
  filters: string[];
  selected: string;
  onSelect: (f: string) => void;
}

export default function FilterBar({ filters, selected, onSelect }: FilterBarProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, selected === f && styles.activeChip]}
            onPress={() => onSelect(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selected === f && styles.activeChipText]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 10,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
    marginRight: 8,
  },
  activeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  activeChipText: {
    color: COLORS.white,
  },
});
