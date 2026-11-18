import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants';
import { useAuthStore } from '@/store/authStore';

export default function AppLayout() {
  const router = useRouter();
  const { user } = useAuthStore();

  return (
    <Tabs
      screenOptions={{
        sceneStyle: {
          backgroundColor: COLORS.background,
        },
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerShadowVisible: false,
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerTitleAlign: 'left',
        headerRight: () => (
          <TouchableOpacity style={styles.headerMenuButton} onPress={() => router.push('/(app)/more')}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>
                {(user?.name || 'P').trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <Ionicons name="apps-outline" size={18} color={COLORS.text} />
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.cardBorder,
          height: 72,
          paddingBottom: 10,
          paddingTop: 10,
          paddingHorizontal: 6,
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarItemStyle: { borderRadius: 14 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'Point of Sale',
          tabBarLabel: 'POS',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Menu & Modules',
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, size }) => <Ionicons name="apps-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />

      {/* Hidden routes — opened from More hub */}
      <Tabs.Screen name="products" options={{ title: 'Products', href: null }} />
      <Tabs.Screen name="inventory" options={{ title: 'Inventory', href: null }} />
      <Tabs.Screen name="customers" options={{ title: 'Customers', href: null }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', href: null }} />
      <Tabs.Screen name="sales" options={{ title: 'Sales', href: null }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', href: null }} />
      <Tabs.Screen name="purchase" options={{ title: 'Purchases', href: null }} />
      <Tabs.Screen name="tables" options={{ title: 'Tables', href: null }} />
      <Tabs.Screen name="users" options={{ title: 'Users', href: null }} />
      <Tabs.Screen name="qr-menu" options={{ title: 'QR Menu', href: null }} />
      <Tabs.Screen name="qr-management" options={{ title: 'QR Management', href: null }} />
      <Tabs.Screen name="finance" options={{ title: 'Finance', href: null }} />
      <Tabs.Screen name="employees" options={{ title: 'Employees', href: null }} />
      <Tabs.Screen name="customer-ledger" options={{ title: 'Customer Ledger', href: null }} />
      <Tabs.Screen name="kitchen" options={{ title: 'Kitchen', href: null }} />
      <Tabs.Screen name="waiter" options={{ title: 'Waiter Dashboard', href: null }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expenses', href: null }} />
      <Tabs.Screen name="cashier-handover" options={{ title: 'Cashier Handover', href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 6,
  },
  headerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerAvatarText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
