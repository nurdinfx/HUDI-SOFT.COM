import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { customerRepo, Customer } from '@/db/repositories/customerRepo';
import { COLORS } from '@/constants';

export default function CustomersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const loadData = () => {
    try {
      const list = customerRepo.getCustomers(search);
      setCustomers(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleAddCustomer = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter customer name.');
      return;
    }

    const newCustomer: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      phone: phone.trim() || undefined,
      balance: 0,
      loyalty_points: 0,
    };

    try {
      customerRepo.createCustomerOffline(newCustomer);
      setIsAddOpen(false);
      setName('');
      setPhone('');
      loadData();
      Alert.alert('Success', 'Customer added successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create customer.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Search & Add bar */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setIsAddOpen(true)}>
          <Ionicons name="person-add-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Customer registry list */}
      <View style={styles.listContainer}>
        {customers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No registered customers found.</Text>
          </View>
        ) : (
          <FlashList
            data={customers}
            keyExtractor={(item) => item.id}
            estimatedItemSize={80}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.customerCard}
                onPress={() => router.push({ pathname: '/(app)/customer-ledger', params: { id: item.id } })}
                activeOpacity={0.7}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.avatarBadge}>
                    <Text style={styles.avatarText}>
                      {item.name.substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.customerDetails}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    {item.phone ? (
                      <Text style={styles.customerPhone}>📞 {item.phone}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <Text style={styles.loyaltyPoints}>{item.loyalty_points || 0} pts</Text>
                  <Text style={[styles.balanceText, (item.balance || 0) < 0 && { color: COLORS.danger }]}>
                    Bal: ${(item.balance || 0).toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Add Customer Modal */}
      <Modal visible={isAddOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.addDrawer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Customer</Text>
              <TouchableOpacity onPress={() => setIsAddOpen(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Customer Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +252615555555"
                  placeholderTextColor={COLORS.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleAddCustomer}>
                <Text style={styles.saveButtonText}>Register Customer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchBar: {
    flex: 1,
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
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
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
  customerCard: {
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
  avatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  avatarText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  customerPhone: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  loyaltyPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  balanceText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  addDrawer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.text,
  },
  saveButton: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
