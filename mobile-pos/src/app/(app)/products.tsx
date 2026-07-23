import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { productRepo, Product, Category } from '@/db/repositories/productRepo';
import { COLORS } from '@/constants';

export default function ProductsScreen() {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [products, setProducts] = useState<Product[]>([]);

  const loadData = () => {
    try {
      const cats = productRepo.getCategories();
      setCategories([{ id: 'all', name: 'All' }, ...cats]);

      const prods = productRepo.getProducts(search, selectedCategory);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load products list', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory]);

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, category, or barcode..."
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

      {/* Category Chips Scroll */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                selectedCategory === cat.name && styles.activeChip,
              ]}
              onPress={() => setSelectedCategory(cat.name)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategory === cat.name && styles.activeChipText,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products list */}
      <View style={styles.listContainer}>
        {products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No products found matching filters.</Text>
          </View>
        ) : (
          <FlashList
            data={products}
            keyExtractor={(item) => item.id}
            estimatedItemSize={100}
            renderItem={({ item }) => (
              <View style={styles.productCard}>
                <View style={styles.cardLeft}>
                  <View style={styles.productBadge}>
                    <Text style={styles.productBadgeText}>
                      {item.name.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.productDetails}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productMeta}>
                      Category: {item.category || 'General'}
                    </Text>
                    {item.barcode ? (
                      <Text style={styles.productMeta}>Barcode: {item.barcode}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
                  <View
                    style={[
                      styles.stockIndicator,
                      item.stock <= 5 ? styles.stockLow : styles.stockOk,
                    ]}
                  >
                    <Text style={styles.stockLabel}>Stock: {item.stock}</Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  searchBar: {
    height: 48,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    marginLeft: 8,
    fontSize: 14,
  },
  categoryContainer: {
    backgroundColor: COLORS.surface,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  categoryScroll: {
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  activeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  activeChipText: {
    color: COLORS.white,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  productCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginRight: 12,
  },
  productBadgeText: {
    color: COLORS.accent,
    fontWeight: 'bold',
    fontSize: 14,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  productMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  stockIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  stockLow: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  stockLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary,
  },
});
