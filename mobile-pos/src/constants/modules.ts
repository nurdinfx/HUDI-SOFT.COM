import { Ionicons } from '@expo/vector-icons';

export type ModuleItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  roles?: string[];
  featured?: boolean;
};

export type ModuleSection = {
  id: string;
  title: string;
  items: ModuleItem[];
};

export const APP_MODULE_SECTIONS: ModuleSection[] = [
  {
    id: 'sales-ops',
    title: 'Sales & Operations',
    items: [
      { id: 'pos', title: 'POS', subtitle: 'Create orders and checkout fast', icon: 'cart-outline', route: '/(app)/pos', color: '#4f46e5', featured: true },
      { id: 'orders', title: 'Orders', subtitle: 'Track live and completed orders', icon: 'receipt-outline', route: '/(app)/orders', color: '#0ea5e9', featured: true },
      { id: 'sales', title: 'Sales', subtitle: 'Review daily sales activity', icon: 'cash-outline', route: '/(app)/sales', color: '#22c55e', roles: ['admin', 'manager'] },
      { id: 'kitchen', title: 'Kitchen', subtitle: 'Manage kitchen queue', icon: 'restaurant-outline', route: '/(app)/kitchen', color: '#f59e0b', roles: ['admin', 'chef', 'kitchen'], featured: true },
      { id: 'waiter', title: 'Waiter', subtitle: 'Handle service and QR calls', icon: 'walk-outline', route: '/(app)/waiter', color: '#ec4899', roles: ['admin', 'manager', 'waiter'] },
      { id: 'tables', title: 'Tables', subtitle: 'See seating and table states', icon: 'grid-outline', route: '/(app)/tables', color: '#06b6d4', roles: ['admin', 'manager', 'cashier', 'waiter'] },
    ],
  },
  {
    id: 'catalog',
    title: 'Catalog & Inventory',
    items: [
      { id: 'products', title: 'Products', subtitle: 'Browse and search catalog', icon: 'barcode-outline', route: '/(app)/products', color: '#8b5cf6', featured: true },
      { id: 'inventory', title: 'Inventory', subtitle: 'Monitor stock levels', icon: 'cube-outline', route: '/(app)/inventory', color: '#f97316', roles: ['admin', 'manager'], featured: true },
      { id: 'purchase', title: 'Purchases', subtitle: 'Review supplier purchases', icon: 'bag-handle-outline', route: '/(app)/purchase', color: '#14b8a6', roles: ['admin', 'manager'] },
    ],
  },
  {
    id: 'customers-finance',
    title: 'Customers & Finance',
    items: [
      { id: 'customers', title: 'Customers', subtitle: 'Search and register customers', icon: 'people-outline', route: '/(app)/customers', color: '#3b82f6', roles: ['admin', 'manager', 'cashier'], featured: true },
      { id: 'ledger', title: 'Ledger', subtitle: 'Check balances and credit', icon: 'book-outline', route: '/(app)/customer-ledger', color: '#22c55e', roles: ['admin', 'manager', 'cashier'] },
      { id: 'finance', title: 'Finance', subtitle: 'Revenue and expense overview', icon: 'wallet-outline', route: '/(app)/finance', color: '#eab308', roles: ['admin', 'manager'] },
      { id: 'expenses', title: 'Expenses', subtitle: 'Track business costs', icon: 'receipt-outline', route: '/(app)/expenses', color: '#ef4444', roles: ['admin', 'manager'] },
    ],
  },
  {
    id: 'reports-hr',
    title: 'Reports & Staff',
    items: [
      { id: 'reports', title: 'Reports', subtitle: 'Sales and performance insights', icon: 'trending-up-outline', route: '/(app)/reports', color: '#6366f1', roles: ['admin', 'manager'], featured: true },
      { id: 'handover', title: 'Handover', subtitle: 'Cashier shift close summary', icon: 'swap-horizontal-outline', route: '/(app)/cashier-handover', color: '#a855f7', roles: ['admin', 'manager'] },
      { id: 'employees', title: 'Employees', subtitle: 'Staff directory and advances', icon: 'briefcase-outline', route: '/(app)/employees', color: '#14b8a6', roles: ['admin', 'manager'] },
      { id: 'attendance', title: 'Attendance', subtitle: 'Clock logs and attendance stats', icon: 'time-outline', route: '/(app)/attendance', color: '#f59e0b', roles: ['admin', 'manager'] },
      { id: 'users', title: 'Users', subtitle: 'Manage POS user accounts', icon: 'person-circle-outline', route: '/(app)/users', color: '#64748b', roles: ['admin', 'manager'] },
    ],
  },
  {
    id: 'qr',
    title: 'QR Ordering',
    items: [
      { id: 'qr-management', title: 'QR Management', subtitle: 'Generate and manage table QR codes', icon: 'qr-code-outline', route: '/(app)/qr-management', color: '#06b6d4', roles: ['admin', 'manager'] },
      { id: 'qr-menu', title: 'QR Menu', subtitle: 'Review self-ordering setup', icon: 'phone-portrait-outline', route: '/(app)/qr-menu', color: '#8b5cf6', roles: ['admin', 'manager'] },
    ],
  },
];

export function canAccessModule(role: string | undefined, roles?: string[]) {
  if (!roles || roles.length === 0) return true;
  if (!role) return false;
  return roles.includes(role) || role === 'admin';
}

export function getVisibleModuleSections(role: string | undefined) {
  return APP_MODULE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccessModule(role, item.roles)),
  })).filter((section) => section.items.length > 0);
}

export function getFeaturedModules(role: string | undefined, limit = 6) {
  return getVisibleModuleSections(role)
    .flatMap((section) => section.items)
    .filter((item) => item.featured)
    .slice(0, limit);
}
