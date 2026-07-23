import apiClient from './client';
import { unwrapData, unwrapList } from './helpers';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LoginPayload  { email: string; password: string; }
export interface LicensePayload { licenseKey: string; machineId: string; }
export interface User {
  _id: string; name: string; email: string;
  role: string; branch: { _id: string; name: string; branchCode?: string };
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  /** Validate license key */
  validateLicense: async (payload: LicensePayload) => {
    const { data } = await apiClient.post('/license/validate', payload);
    return data as { success: boolean; valid: boolean; expiryDate: string; message: string };
  },

  /** Staff login with email + password */
  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post('/auth/login', payload);
    const inner = unwrapData<{ token: string; user: User }>(data);
    return {
      success: !!(data as { success?: boolean }).success,
      token: inner?.token,
      user: inner?.user,
      message: (data as { message?: string }).message,
    };
  },

  /** Get current user profile */
  getMe: async () => {
    const { data } = await apiClient.get('/auth/me');
    return {
      success: !!(data as { success?: boolean }).success,
      user: unwrapData<User>(data),
    };
  },

  /** Logout */
  logout: async () => {
    const { data } = await apiClient.post('/auth/logout');
    return data;
  },
};

// ─── Products API ─────────────────────────────────────────────────────────────
export const productsApi = {
  getAll: async (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
    const { data } = await apiClient.get('/products', { params });
    return {
      success: !!(data as { success?: boolean }).success,
      data: unwrapData<{ products: unknown[]; pagination?: unknown }>(data),
      products: unwrapList<Record<string, unknown>>(data, 'products'),
    };
  },
  getCategories: async () => {
    const { data } = await apiClient.get('/products/categories');
    const categories = unwrapData<string[]>(data);
    return {
      success: !!(data as { success?: boolean }).success,
      data: categories,
    };
  },
  getById: async (id: string) => {
    const { data } = await apiClient.get(`/products/${id}`);
    return {
      success: !!(data as { success?: boolean }).success,
      data: unwrapData(data),
    };
  },
  updateStock: async (id: string, quantity: number) => {
    const { data } = await apiClient.patch(`/products/${id}/stock`, { quantity });
    return data;
  },
  getLowStock: async () => {
    const { data } = await apiClient.get('/products/low-stock');
    return {
      success: !!(data as { success?: boolean }).success,
      products: unwrapList<Record<string, unknown>>(data, 'products'),
    };
  },
};

// ─── Orders API ───────────────────────────────────────────────────────────────
export const ordersApi = {
  getAll: async (params?: { status?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const { data } = await apiClient.get('/orders', { params });
    return {
      success: !!(data as { success?: boolean }).success,
      data: unwrapData<{ orders: unknown[]; pagination?: unknown }>(data),
      orders: unwrapList<Record<string, unknown>>(data, 'orders'),
    };
  },
  getById: async (id: string) => {
    const { data } = await apiClient.get(`/orders/${id}`);
    return {
      success: !!(data as { success?: boolean }).success,
      data: unwrapData(data),
    };
  },
  create: async (orderData: Record<string, unknown>) => {
    const { data } = await apiClient.post('/orders', orderData);
    return data;
  },
  updateStatus: async (id: string, status: string) => {
    const { data } = await apiClient.put(`/orders/${id}/status`, { status });
    return data;
  },
  getStats: async (period = 'today') => {
    const { data } = await apiClient.get('/orders/stats', { params: { period } });
    return {
      success: !!(data as { success?: boolean }).success,
      data: unwrapData(data),
    };
  },
  getKitchen: async () => {
    const { data } = await apiClient.get('/orders/kitchen');
    return {
      success: !!(data as { success?: boolean }).success,
      orders: unwrapList<Record<string, unknown>>(data, 'orders'),
    };
  },
};

// ─── Customers API ────────────────────────────────────────────────────────────
export const customersApi = {
  getAll: async (params?: { search?: string; page?: number; limit?: number }) => {
    const { data } = await apiClient.get('/customers', { params });
    return {
      success: !!(data as { success?: boolean }).success,
      data: unwrapData<{ customers: unknown[]; pagination?: unknown }>(data),
      customers: unwrapList<Record<string, unknown>>(data, 'customers'),
    };
  },
  getById: async (id: string) => {
    const { data } = await apiClient.get(`/customers/${id}`);
    return {
      success: !!(data as { success?: boolean }).success,
      data: unwrapData(data),
    };
  },
  create: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post('/customers', payload);
    return data;
  },
  update: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await apiClient.put(`/customers/${id}`, payload);
    return data;
  },
  getLedger: async (id: string, params?: { page?: number; limit?: number }) => {
    const { data } = await apiClient.get(`/customers/${id}/ledger`, { params });
    return {
      success: !!(data as { success?: boolean }).success,
      entries: unwrapList<Record<string, unknown>>(data, 'entries'),
      data: unwrapData(data),
    };
  },
  getSummary: async (id: string) => {
    const { data } = await apiClient.get(`/customers/${id}/summary`);
    return {
      success: !!(data as { success?: boolean }).success,
      data: unwrapData(data),
    };
  },
};

// ─── Inventory API ────────────────────────────────────────────────────────────
export const inventoryApi = {
  getAll: async () => {
    const { data } = await apiClient.get('/inventory');
    return {
      success: !!(data as { success?: boolean }).success,
      items: unwrapList<Record<string, unknown>>(data, 'items'),
      data: unwrapData(data),
    };
  },
  getLowStock: async () => {
    const { data } = await apiClient.get('/inventory/alerts/low-stock');
    return {
      success: !!(data as { success?: boolean }).success,
      items: unwrapList<Record<string, unknown>>(data, 'items'),
      data: unwrapData(data),
    };
  },
};

// ─── Reports / Dashboard API ──────────────────────────────────────────────────
export const reportsApi = {
  getDailySales: async (period: 'today' | 'week' | 'month' = 'today') => {
    const { data } = await apiClient.get('/dashboard/stats', { params: { period } });
    return {
      success: !!(data as { success?: boolean }).success,
      data: unwrapData(data),
    };
  },
  getWeeklySales: async () => reportsApi.getDailySales('week'),
  getMonthlySales: async () => reportsApi.getDailySales('month'),
  getTopProducts: async (limit = 10) => {
    const { data } = await apiClient.get('/dashboard/top-products', { params: { limit } });
    return {
      success: !!(data as { success?: boolean }).success,
      products: unwrapList<Record<string, unknown>>(data, 'products'),
      data: unwrapData(data),
    };
  },
  getDashboardStats: async (period: 'today' | 'week' | 'month' = 'today') => {
    const { data } = await apiClient.get('/dashboard/stats', { params: { period } });
    return {
      success: !!(data as { success?: boolean }).success,
      data: unwrapData(data),
    };
  },
  getRevenue: async () => {
    const { data } = await apiClient.get('/dashboard/revenue');
    return {
      success: !!(data as { success?: boolean }).success,
      data: unwrapData(data),
    };
  },
  getPurchaseReports: async (params?: Record<string, unknown>) => {
    const { data } = await apiClient.get('/reports/purchases', { params });
    return { success: !!(data as { success?: boolean }).success, data: unwrapData(data) };
  },
  getInventoryReport: async (params?: Record<string, unknown>) => {
    const { data } = await apiClient.get('/reports/inventory', { params });
    return { success: !!(data as { success?: boolean }).success, data: unwrapData(data) };
  },
};

// ─── Purchases API ────────────────────────────────────────────────────────────
export const purchasesApi = {
  getAll: async (params?: Record<string, unknown>) => {
    const { data } = await apiClient.get('/purchases', { params });
    return {
      success: !!(data as { success?: boolean }).success,
      purchases: unwrapList<Record<string, unknown>>(data, 'purchases'),
      data: unwrapData(data),
    };
  },
  getDaily: async (date?: string) => {
    const { data } = await apiClient.get('/purchases/daily', { params: { date } });
    return { success: !!(data as { success?: boolean }).success, data: unwrapData(data) };
  },
};

// ─── Tables API ───────────────────────────────────────────────────────────────
export const tablesApi = {
  getAll: async () => {
    const { data } = await apiClient.get('/tables');
    return {
      success: !!(data as { success?: boolean }).success,
      tables: unwrapList<Record<string, unknown>>(data, 'tables'),
      data: unwrapData(data),
    };
  },
  getAvailable: async () => {
    const { data } = await apiClient.get('/tables/available');
    return {
      success: !!(data as { success?: boolean }).success,
      tables: unwrapList<Record<string, unknown>>(data, 'tables'),
    };
  },
};

// ─── Users API ────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: async (params?: Record<string, unknown>) => {
    const { data } = await apiClient.get('/users', { params });
    return {
      success: !!(data as { success?: boolean }).success,
      users: unwrapList<Record<string, unknown>>(data, 'users'),
    };
  },
  createUser: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post('/users', payload);
    return data;
  },
  updateUser: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await apiClient.put(`/users/${id}`, payload);
    return data;
  },
  deleteUser: async (id: string) => {
    const { data } = await apiClient.delete(`/users/${id}`);
    return data;
  },
};

// ─── Employees API ────────────────────────────────────────────────────────────
export const employeesApi = {
  getAll: async (params?: Record<string, unknown>) => {
    const { data } = await apiClient.get('/employees', { params });
    return {
      success: !!(data as { success?: boolean }).success,
      employees: unwrapList<Record<string, unknown>>(data, 'employees'),
    };
  },
  getSummary: async () => {
    const { data } = await apiClient.get('/employees/summary');
    return { success: !!(data as { success?: boolean }).success, data: unwrapData(data) };
  },
  getAdvances: async () => {
    const { data } = await apiClient.get('/employees/advances');
    return {
      success: !!(data as { success?: boolean }).success,
      advances: unwrapList<Record<string, unknown>>(data, 'advances'),
    };
  },
};

// ─── Finance API ──────────────────────────────────────────────────────────────
export const financeApi = {
  getDashboard: async () => {
    const { data } = await apiClient.get('/finance/dashboard');
    return { success: !!(data as { success?: boolean }).success, data: unwrapData(data) };
  },
  getTransactions: async (params?: Record<string, unknown>) => {
    const { data } = await apiClient.get('/finance/transactions', { params });
    return {
      success: !!(data as { success?: boolean }).success,
      transactions: unwrapList<Record<string, unknown>>(data, 'transactions'),
    };
  },
};

// ─── Expenses API ─────────────────────────────────────────────────────────────
export const expensesApi = {
  getAll: async (params?: Record<string, unknown>) => {
    const { data } = await apiClient.get('/expenses', { params });
    return {
      success: !!(data as { success?: boolean }).success,
      expenses: unwrapList<Record<string, unknown>>(data, 'expenses'),
    };
  },
  create: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post('/expenses', payload);
    return data;
  },
  update: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await apiClient.put(`/expenses/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await apiClient.delete(`/expenses/${id}`);
    return data;
  },
};

// ─── QR API ───────────────────────────────────────────────────────────────────
export const qrApi = {
  getTablesWithQR: async () => {
    const { data } = await apiClient.get('/qr/tables');
    return {
      success: !!(data as { success?: boolean }).success,
      tables: unwrapList<Record<string, unknown>>(data, 'tables'),
      data: unwrapData(data),
    };
  },
  getAnalytics: async () => {
    const { data } = await apiClient.get('/qr/analytics');
    return { success: !!(data as { success?: boolean }).success, data: unwrapData(data) };
  },
  getWaiterRequests: async () => {
    const { data } = await apiClient.get('/qr/waiter-requests');
    return {
      success: !!(data as { success?: boolean }).success,
      requests: unwrapList<Record<string, unknown>>(data, 'requests'),
    };
  },
  generateQR: async (tableId: string) => {
    const { data } = await apiClient.post(`/qr/tables/${tableId}/generate`);
    return data;
  },
  toggleQR: async (tableId: string) => {
    const { data } = await apiClient.patch(`/qr/tables/${tableId}/toggle`);
    return data;
  },
};

// ─── Attendance API ───────────────────────────────────────────────────────────
export const attendanceApi = {
  getDashboardStats: async () => {
    const { data } = await apiClient.get('/attendance/dashboard-stats');
    return { success: !!(data as { success?: boolean }).success, data: unwrapData(data) };
  },
  getLogs: async (params?: Record<string, unknown>) => {
    const { data } = await apiClient.get('/attendance/logs', { params });
    return {
      success: !!(data as { success?: boolean }).success,
      logs: unwrapList<Record<string, unknown>>(data, 'logs'),
    };
  },
  getMonitor: async () => {
    const { data } = await apiClient.get('/attendance/monitor');
    return { success: !!(data as { success?: boolean }).success, data: unwrapData(data) };
  },
  getStations: async () => {
    const { data } = await apiClient.get('/attendance/stations');
    return {
      success: !!(data as { success?: boolean }).success,
      stations: unwrapList<Record<string, unknown>>(data, 'stations'),
    };
  },
};

// ─── Settings API ─────────────────────────────────────────────────────────────
export const settingsApi = {
  get: async () => {
    const { data } = await apiClient.get('/settings');
    return {
      success: !!(data as { success?: boolean }).success,
      data: unwrapData(data),
    };
  },
  update: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.put('/settings', payload);
    return data;
  },
};
