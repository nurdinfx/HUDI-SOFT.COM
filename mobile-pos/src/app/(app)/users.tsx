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
import { usersApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/constants';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

type POSUser = {
  _id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  isActive?: boolean;
  address?: string;
  lastLogin?: string;
  createdAt?: string;
};

const ROLES = ['admin', 'manager', 'chef', 'cashier', 'waiter'];

export default function UsersScreen() {
  const [users, setUsers] = useState<POSUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modals / Editing
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<POSUser | null>(null);
  
  const { user: currentUser } = useAuthStore();

  const load = useCallback(async () => {
    try {
      const res = await usersApi.getAll({ limit: 200 });
      if (res.success) {
        const raw = (res.users || []) as POSUser[];
        setUsers(raw.map(u => ({ ...u })));
      }
    } catch (err) {
      console.error('Users load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = users.filter((u) => {
    const nameStr = u.name || '';
    const userStr = u.username || '';
    const emailStr = u.email || '';
    const phoneStr = u.phone || '';
    const matchesSearch = nameStr.toLowerCase().includes(search.toLowerCase()) ||
      userStr.toLowerCase().includes(search.toLowerCase()) ||
      emailStr.toLowerCase().includes(search.toLowerCase()) ||
      phoneStr.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'All' || u.role.toLowerCase() === roleFilter.toLowerCase();

    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string = '') => {
    const map: Record<string, string> = {
      admin: COLORS.danger,
      manager: COLORS.primary,
      chef: COLORS.success,
      cashier: '#7c3aed',
      waiter: COLORS.warning,
    };
    return map[role.toLowerCase()] || COLORS.secondary;
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await usersApi.updateUser(userId, { isActive: !currentStatus });
      if (res.success || res._id) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: !currentStatus } : u));
        Alert.alert('Success', `User ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not toggle user status.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?._id) {
      Alert.alert('Action Denied', 'You cannot delete yourself.');
      return;
    }
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this user account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await usersApi.deleteUser(userId);
            if (res.success) {
              setUsers(prev => prev.filter(u => u._id !== userId));
              Alert.alert('Success', 'User deleted successfully.');
            } else {
              Alert.alert('Failed', res.message || 'Could not delete user.');
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
        <Text style={styles.loadingText}>Loading user accounts…</Text>
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
            placeholder="Search by name, email, role…"
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
            setEditingUser(null);
            setShowModal(true);
          }}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add User</Text>
        </TouchableOpacity>
      </View>

      {/* Role Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleChips}>
        {['All', ...ROLES].map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.chip, roleFilter === role && styles.activeChip]}
            onPress={() => setRoleFilter(role)}
          >
            <Text style={[styles.chipText, roleFilter === role && styles.activeChipText]}>
              {role.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        {filtered.length === 0 ? (
          <EmptyState icon="person-circle-outline" title="No Users Found" message="No matching POS users exist." />
        ) : (
          filtered.map((u) => {
            const roleColor = getRoleColor(u.role);
            return (
              <View key={u._id} style={styles.userCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: `${roleColor}15` }]}>
                    <Text style={[styles.avatarText, { color: roleColor }]}>
                      {u.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.name}</Text>
                    <Text style={styles.userSub}>@{u.username} • {u.email || 'No email'}</Text>
                    {u.phone ? <Text style={styles.phoneText}>{u.phone}</Text> : null}
                  </View>
                  <StatusBadge status={u.isActive !== false ? 'active' : 'inactive'} />
                </View>

                <View style={styles.cardFooter}>
                  <View style={[styles.roleBadge, { backgroundColor: `${roleColor}15` }]}>
                    <Text style={[styles.roleText, { color: roleColor }]}>
                      {u.role.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.actionGroup}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnEdit]}
                      onPress={() => {
                        setEditingUser(u);
                        setShowModal(true);
                      }}
                    >
                      <Ionicons name="pencil" size={14} color={COLORS.primary} />
                      <Text style={styles.actionBtnTextEdit}>Edit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionBtn, u.isActive !== false ? styles.btnDeactivate : styles.btnActivate]}
                      onPress={() => handleToggleStatus(u._id, u.isActive !== false)}
                    >
                      <Text style={u.isActive !== false ? styles.deactivateText : styles.activateText}>
                        {u.isActive !== false ? 'Deactivate' : 'Activate'}
                      </Text>
                    </TouchableOpacity>

                    {u._id !== currentUser?._id && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.btnDelete]}
                        onPress={() => handleDeleteUser(u._id)}
                      >
                        <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* User Form Modal */}
      {showModal && (
        <UserFormModal
          user={editingUser}
          onClose={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
          onSave={async (data) => {
            try {
              let res;
              if (editingUser) {
                res = await usersApi.updateUser(editingUser._id, data);
              } else {
                res = await usersApi.createUser(data);
              }
              if (res.success || res._id) {
                Alert.alert('Success', `User ${editingUser ? 'updated' : 'created'} successfully.`);
                load();
                setShowModal(false);
                setEditingUser(null);
              } else {
                Alert.alert('Failed', res.message || 'Could not save user.');
              }
            } catch (err) {
              Alert.alert('Error', 'An error occurred while saving user.');
            }
          }}
        />
      )}
    </View>
  );
}

// User Form Modal Component
function UserFormModal({ user, onClose, onSave }: { user: POSUser | null; onClose: () => void; onSave: (data: any) => void }) {
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [role, setRole] = useState(user?.role || 'waiter');
  const [address, setAddress] = useState(user?.address || '');
  const [password, setPassword] = useState('');

  const handleSave = () => {
    if (!name || !username || !email) {
      Alert.alert('Validation Error', 'Full Name, Username, and Email are required.');
      return;
    }
    if (!user && !password) {
      Alert.alert('Validation Error', 'Password is required for new users.');
      return;
    }

    const payload: any = { name, username, email, phone, role, address };
    if (password) payload.password = password;
    onSave(payload);
  };

  return (
    <Modal animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.formSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{user ? 'Edit User' : 'Add New User'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="John Doe" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Username *</Text>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="johndoe" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Email Address *</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="john@hudipos.com" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="252..." placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Role *</Text>
            <View style={styles.pickerContainer}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.pickerOption, role === r && styles.pickerOptionActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.pickerOptionText, role === r && styles.pickerOptionTextActive]}>
                    {r.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Physical address" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>{user ? 'Password (leave blank to keep current)' : 'Password *'}</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="******" placeholderTextColor={COLORS.textMuted} />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{user ? 'Update Account' : 'Create Account'}</Text>
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
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  roleChips: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    maxHeight: 52,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
    marginRight: 6,
  },
  activeChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary },
  activeChipText: { color: COLORS.white },
  scrollContent: { padding: 16, gap: 12 },
  userCard: {
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  userSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  phoneText: { fontSize: 11, color: COLORS.secondary, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingTop: 10,
  },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: '800' },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  btnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  actionBtnTextEdit: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  btnDeactivate: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  btnActivate: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  deactivateText: { color: COLORS.danger, fontSize: 11, fontWeight: '700' },
  activateText: { color: COLORS.success, fontSize: 11, fontWeight: '700' },
  btnDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
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
