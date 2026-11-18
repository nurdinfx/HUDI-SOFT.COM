import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expensesApi } from '@/api';
import { COLORS } from '@/constants';
import StatCard from '@/components/StatCard';
import FilterBar from '@/components/FilterBar';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';

type ExpenseItem = {
  _id: string;
  description: string;
  category: string;
  amount: number;
  date?: string;
  createdAt?: string;
  paymentMethod?: string;
  payment_method?: string;
  notes?: string;
};

const CATEGORIES = ['All', 'Rent', 'Utilities', 'Inventory', 'Salary', 'Marketing', 'Other'];

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Modals & Forms
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await expensesApi.getAll({ limit: 200 });
      setExpenses((res.expenses || []) as ExpenseItem[]);
    } catch (err) {
      console.error('Expenses load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = expenses.filter(e => {
    const desc = e.description || '';
    const cat = e.category || '';
    const matchesSearch = desc.toLowerCase().includes(search.toLowerCase()) ||
      cat.toLowerCase().includes(search.toLowerCase());
    
    if (categoryFilter === 'All') return matchesSearch;
    return matchesSearch && cat.toLowerCase() === categoryFilter.toLowerCase();
  });

  const totalSpent = filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const handleDeleteExpense = async (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this expense record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await expensesApi.delete(id);
            if (res.success) {
              setExpenses(prev => prev.filter(e => e._id !== id));
              Alert.alert('Success', 'Expense deleted successfully.');
            } else {
              Alert.alert('Failed', res.message || 'Could not delete expense.');
            }
          } catch {
            Alert.alert('Error', 'An error occurred.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading expenses…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by description or category…"
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

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingExpense(null);
            setShowModal(true);
          }}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter bar */}
      <FilterBar filters={CATEGORIES} selected={categoryFilter} onSelect={setCategoryFilter} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        {/* Spent card */}
        <StatCard
          icon="receipt-outline"
          iconColor={COLORS.danger}
          label="Total Expenses Filtered"
          value={`$${totalSpent.toFixed(2)}`}
          sub={`Based on ${filtered.length} entries`}
        />

        {/* List of Expenses */}
        {filtered.length === 0 ? (
          <EmptyState icon="receipt-outline" title="No Expenses Found" message="No expense records match criteria." />
        ) : (
          filtered.map((e) => {
            const dateStr = e.date || e.createdAt || '';
            const date = dateStr ? new Date(dateStr).toLocaleDateString() : '—';
            const amount = Number(e.amount) || 0;
            const method = (e.paymentMethod || e.payment_method || 'cash').toUpperCase();

            return (
              <View key={e._id} style={styles.expenseCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.infoCol}>
                    <Text style={styles.descText}>{e.description || 'Expense'}</Text>
                    <Text style={styles.categoryBadge}>{e.category}</Text>
                  </View>
                  <View style={styles.amountCol}>
                    <Text style={styles.amountText}>-${amount.toFixed(2)}</Text>
                    <Text style={styles.dateText}>{date}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.methodText}>Method: {method}</Text>
                  <View style={styles.actionGroup}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        setEditingExpense(e);
                        setShowModal(true);
                      }}
                    >
                      <Ionicons name="pencil" size={14} color={COLORS.primary} />
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnDelete]}
                      onPress={() => handleDeleteExpense(e._id)}
                    >
                      <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add/Edit Expense Modal */}
      {showModal && (
        <ExpenseFormModal
          expense={editingExpense}
          onClose={() => {
            setShowModal(false);
            setEditingExpense(null);
          }}
          onSave={async (data) => {
            try {
              let res;
              if (editingExpense) {
                res = await expensesApi.update(editingExpense._id, data);
              } else {
                res = await expensesApi.create(data);
              }
              if (res.success || res._id) {
                Alert.alert('Success', `Expense ${editingExpense ? 'updated' : 'recorded'} successfully.`);
                load();
                setShowModal(false);
                setEditingExpense(null);
              } else {
                Alert.alert('Failed', res.message || 'Could not save expense.');
              }
            } catch (err) {
              Alert.alert('Error', 'An error occurred while saving expense.');
            }
          }}
        />
      )}
    </View>
  );
}

// Expense Form Modal Component
function ExpenseFormModal({ expense, onClose, onSave }: { expense: ExpenseItem | null; onClose: () => void; onSave: (data: any) => void }) {
  const [description, setDescription] = useState(expense?.description || '');
  const [category, setCategory] = useState(expense?.category || 'Other');
  const [amount, setAmount] = useState(expense?.amount ? String(expense.amount) : '');
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod || expense?.payment_method || 'cash');
  const [notes, setNotes] = useState(expense?.notes || '');

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!description || isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Description and a valid positive amount are required.');
      return;
    }

    onSave({
      description,
      category,
      amount: amt,
      paymentMethod,
      notes,
      date: expense?.date || new Date().toISOString()
    });
  };

  return (
    <Modal animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.formSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{expense ? 'Edit Expense' : 'Record Expense'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody}>
            <Text style={styles.label}>Description *</Text>
            <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Rent / Internet Bill" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Amount ($) *</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              {CATEGORIES.filter(c => c !== 'All').map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pickerOption, category === cat && styles.pickerOptionActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.pickerOptionText, category === cat && styles.pickerOptionTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.pickerContainer}>
              {['cash', 'card', 'mobile_money'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[styles.pickerOption, paymentMethod === method && styles.pickerOptionActive]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text style={[styles.pickerOptionText, paymentMethod === method && styles.pickerOptionTextActive]}>
                    {method.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Additional Notes</Text>
            <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Optional notes" placeholderTextColor={COLORS.textMuted} />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{expense ? 'Save Changes' : 'Record Expense'}</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchBox: {
    flex: 1,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 16, gap: 12 },
  expenseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoCol: { flex: 1, marginRight: 8 },
  descText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.secondary,
    marginTop: 4,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  amountCol: { alignItems: 'flex-end' },
  amountText: { fontSize: 15, fontWeight: '800', color: COLORS.danger },
  dateText: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingTop: 10,
  },
  methodText: { fontSize: 11, color: COLORS.textMuted },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 28,
  },
  actionBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  btnDelete: { borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  formSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  formBody: { padding: 20 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.secondary, marginBottom: 6 },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    marginBottom: 16,
  },
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  pickerOption: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
  },
  pickerOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pickerOptionText: { fontSize: 10, fontWeight: '700', color: COLORS.secondary },
  pickerOptionTextActive: { color: COLORS.white },
  saveButton: {
    backgroundColor: COLORS.primary,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});
