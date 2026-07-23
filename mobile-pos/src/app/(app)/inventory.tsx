import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { productRepo, Product } from '@/db/repositories/productRepo';
import { productsApi } from '@/api';
import { SyncManager } from '@/sync/SyncManager';
import { COLORS } from '@/constants';
import StatCard from '@/components/StatCard';
import FilterBar from '@/components/FilterBar';
import EmptyState from '@/components/EmptyState';

const LOW_STOCK_THRESHOLD = 5;

export default function InventoryScreen() {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [items, setItems] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'low'>('all');
  
  // Adjustment Modal
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadData = useCallback(() => {
    try {
      const cats = productRepo.getCategories().map(c => c.name);
      setCategories(['All', ...cats]);

      const products = productRepo.getProducts(search, selectedCategory === 'All' ? undefined : selectedCategory);
      if (viewMode === 'low') {
        setItems(products.filter(p => p.stock <= LOW_STOCK_THRESHOLD));
      } else {
        setItems(products);
      }
    } catch (err) {
      console.error('Failed to load inventory', err);
    }
  }, [search, selectedCategory, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await SyncManager.syncAll();
    loadData();
    setRefreshing(false);
  };

  const handleAdjustStock = async () => {
    if (!selectedItem) return;
    const newQty = parseInt(adjustmentValue, 10);
    if (isNaN(newQty) || newQty < 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive quantity.');
      return;
    }

    setUpdating(true);
    try {
      // 1. Update SQLite locally
      productRepo.updateStockDirect(selectedItem.id, newQty);
      
      // 2. Call API to update backend
      await productsApi.updateStock(selectedItem.id, newQty);
      
      Alert.alert('Success', 'Stock level adjusted successfully.');
      setSelectedItem(null);
      setAdjustmentValue('');
      loadData();
    } catch (err) {
      Alert.alert('Sync Offline', 'Adjusted locally. Change will sync when connection is back.');
      setSelectedItem(null);
      setAdjustmentValue('');
      loadData();
    } finally {
      setUpdating(false);
    }
  };

  const allProductsCount = productRepo.getProducts().length;
  const lowStockCount = productRepo.getProducts().filter(p => p.stock <= LOW_STOCK_THRESHOLD).length;

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search SKU, barcode, name…"
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

      {/* Tabs / Filters */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, viewMode === 'all' && styles.modeTabActive]}
          onPress={() => setViewMode('all')}
        >
          <Text style={[styles.modeTabText, viewMode === 'all' && styles.modeTabTextActive]}>
            All Items ({allProductsCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, viewMode === 'low' && styles.modeTabActive]}
          onPress={() => setViewMode('low')}
        >
          <Text style={[styles.modeTabText, viewMode === 'low' && styles.modeTabTextActive, lowStockCount > 0 && { color: COLORS.danger }]}>
            Low Stock ({lowStockCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category selector */}
      <FilterBar filters={categories} selected={selectedCategory} onSelect={setSelectedCategory} />

      {/* FlashList */}
      <View style={{ flex: 1 }}>
        {items.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
          >
            <EmptyState
              icon={viewMode === 'low' ? 'checkmark-circle-outline' : 'cube-outline'}
              title={viewMode === 'low' ? 'Stock Healthy' : 'Catalog Empty'}
              message={viewMode === 'low' ? 'No items are low on stock!' : 'No products loaded.'}
            />
          </ScrollView>
        ) : (
          <FlashList
            data={items}
            keyExtractor={(item) => item.id}
            estimatedItemSize={80}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
            renderItem={({ item }) => {
              const isLow = item.stock <= LOW_STOCK_THRESHOLD;
              return (
                <TouchableOpacity
                  style={[styles.itemCard, isLow && styles.itemCardLow]}
                  onPress={() => {
                    setSelectedItem(item);
                    setAdjustmentValue(String(item.stock));
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemMeta}>Category: {item.category || 'General'}</Text>
                    {item.barcode ? <Text style={styles.itemMeta}>Barcode: {item.barcode}</Text> : null}
                  </View>
                  <View style={[styles.stockBadge, isLow ? styles.badgeLow : styles.badgeNormal]}>
                    <Text style={[styles.stockValue, isLow ? { color: COLORS.danger } : { color: COLORS.success }]}>
                      {item.stock}
                    </Text>
                    <Text style={styles.stockLabel}>in stock</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Adjust Stock Modal */}
      <Modal visible={!!selectedItem} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.adjustmentSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Adjust Stock Level</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Ionicons name="close" size={26} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <View style={styles.sheetBody}>
                <Text style={styles.productLabel}>{selectedItem.name}</Text>
                <Text style={styles.skuLabel}>SKU/Barcode: {selectedItem.barcode || '—'}</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.formLabel}>New Stock Count</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    placeholder="Enter stock quantity"
                    placeholderTextColor={COLORS.textMuted}
                    value={adjustmentValue}
                    onChangeText={setAdjustmentValue}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAdjustStock}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>Confirm Stock Adjustment</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  modeTabActive: {
    borderColor: COLORS.primary,
  },
  modeTabText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  modeTabTextActive: { color: COLORS.primary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  itemCardLow: { borderColor: 'rgba(239, 68, 68, 0.2)' },
  itemInfo: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  itemMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  stockBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  badgeNormal: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  badgeLow: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  stockValue: { fontSize: 20, fontWeight: '800' },
  stockLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  adjustmentSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
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
  sheetBody: { padding: 20 },
  productLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  skuLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  formLabel: { fontSize: 12, fontWeight: '700', color: COLORS.secondary, marginBottom: 8 },
  formInput: {
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});
