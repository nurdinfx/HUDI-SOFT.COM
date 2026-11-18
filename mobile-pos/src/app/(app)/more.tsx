import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants';
import { getFeaturedModules, getVisibleModuleSections } from '@/constants/modules';

export default function MoreScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.role;
  const visibleSections = getVisibleModuleSections(role);
  const featuredModules = getFeaturedModules(role, 6);
  const totalModules = visibleSections.reduce((sum, section) => sum + section.items.length, 0);
  const operationalSections = visibleSections.slice(0, 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Ionicons name="grid-outline" size={16} color={COLORS.white} />
          <Text style={styles.heroBadgeText}>Mobile Command Center</Text>
        </View>
        <Text style={styles.heroTitle}>Menu & Modules</Text>
        <Text style={styles.heroSub}>
          Faster access to sales, stock, customers, kitchen, reports, and branch operations.
        </Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{totalModules}</Text>
            <Text style={styles.heroStatLabel}>Modules</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{visibleSections.length}</Text>
            <Text style={styles.heroStatLabel}>Sections</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{user?.branch?.name ? 'Live' : 'Setup'}</Text>
            <Text style={styles.heroStatLabel}>Branch</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <Text style={styles.sectionHint}>The most-used mobile workflows</Text>
        </View>
        <View style={styles.featuredGrid}>
          {featuredModules.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.featuredCard}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.featuredIconWrap, { backgroundColor: `${item.color}22` }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.featuredTitle}>{item.title}</Text>
              <Text style={styles.featuredSub}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Operations</Text>
          <Text style={styles.sectionHint}>Organized for mobile staff work</Text>
        </View>
        {operationalSections.map((section) => (
          <View key={section.id} style={styles.groupBlock}>
            <Text style={styles.groupTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuRow}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${item.color}1f` }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSub}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Sections</Text>
          <Text style={styles.sectionHint}>Everything available for your role</Text>
        </View>
        {visibleSections.map((section) => (
          <View key={section.id} style={styles.allSectionCard}>
            <Text style={styles.allSectionTitle}>{section.title}</Text>
            <View style={styles.tagWrap}>
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.tag, { borderColor: `${item.color}55` }]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={item.icon} size={14} color={item.color} />
                  <Text style={styles.tagText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32 },
  hero: {
    padding: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  heroBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: '700', marginLeft: 6 },
  heroTitle: { color: COLORS.text, fontSize: 26, fontWeight: 'bold' },
  heroSub: { color: COLORS.textMuted, fontSize: 13, marginTop: 8, lineHeight: 19 },
  heroStats: { flexDirection: 'row', marginTop: 18, gap: 10 },
  heroStatCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
  },
  heroStatValue: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  heroStatLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featuredCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 12,
    minHeight: 132,
  },
  featuredIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  featuredSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  groupBlock: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 14,
  },
  groupTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    marginBottom: 10,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: { flex: 1 },
  menuTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  menuSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  allSectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  allSectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: { color: COLORS.text, fontSize: 12, fontWeight: '600', marginLeft: 6 },
});
