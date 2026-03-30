import axios from 'axios';
import { API_CONFIG } from '../config/api.config';

console.log('🔗 Initializing Real API with URL:', API_CONFIG.API_URL);

// Create axios instance with proper configuration
const api = axios.create({
  baseURL: API_CONFIG.API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: false
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
      if (token.startsWith('demo-')) {
        config.headers.Authorization = token;
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    console.log(`📤 ${config.method.toUpperCase()} ${config.url}`, config.params || '');
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`📥 Response from ${response.config.url}:`, response.status);
    console.log('📦 Raw response data:', response.data);

    // Handle different response formats
    if (response.data && typeof response.data === 'object') {
      // Check if response has success field (some APIs return {success: true, data: {...}})
      if (response.data.success !== undefined) {
        return {
          success: response.data.success,
          status: response.status,
          data: response.data.data || response.data,
          message: response.data.message || 'Success',
          pagination: response.data.pagination,
          meta: response.data.meta
        };
      }

      // Check if data is directly an array (e.g., [{...}, {...}])
      if (Array.isArray(response.data)) {
        return {
          success: true,
          status: response.status,
          data: response.data,
          message: 'Success'
        };
      }

      // Check if data has nested data property
      if (response.data.data !== undefined) {
        return {
          success: true,
          status: response.status,
          data: response.data.data,
          message: response.data.message || 'Success',
          pagination: response.data.pagination,
          meta: response.data.meta
        };
      }

      // Return the object as-is (might be a single object response)
      return {
        success: true,
        status: response.status,
        data: response.data,
        message: response.data.message || 'Success',
        pagination: response.data.pagination,
        meta: response.data.meta
      };
    }

    return {
      success: true,
      status: response.status,
      data: response.data,
      message: 'Success'
    };
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });

    let errorMessage = 'Network error occurred';
    let errorCode = 'NETWORK_ERROR';

    if (error.response) {
      errorMessage = error.response.data?.message ||
        error.response.data?.error ||
        error.response.statusText;
      errorCode = `HTTP_${error.response.status}`;

      // Handle specific status codes
      if (error.response.status === 401) {
        // Clear tokens and notify app of logout instead of forcing a navigation here
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        try {
          window.dispatchEvent(new CustomEvent('auth.logout', { detail: { status: 401 } }));
        } catch (e) {
          console.warn('Failed to dispatch auth.logout event; manual logout may be required', e);
        }
      } else if (error.response.status === 402) {
        // License required
        window.location.href = '/activate';
      }
    } else if (error.request) {
      errorMessage = 'No response from server. Please check if backend is running.';
      errorCode = 'NO_RESPONSE';
    }

    return Promise.reject({
      success: false,
      message: errorMessage,
      code: errorCode,
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

// Helper functions
const buildUrl = (endpoint, params = {}) => {
  let url = endpoint;
  Object.keys(params).forEach(key => {
    url = url.replace(`{${key}}`, params[key]);
  });
  return url;
};

const handleApiError = (error, context) => {
  console.error(`❌ Error in ${context}:`, error);
  // Return a normalized error response instead of throwing to allow graceful fallbacks
  return {
    success: false,
    message: error?.message || 'Request failed',
    code: error?.code || (error?.response?.status ? `HTTP_${error.response.status}` : 'UNKNOWN_ERROR'),
    status: error?.response?.status,
    data: error?.response?.data
  };
};

// Consistent data extraction helper (used by pages)
const extractData = (response) => {
  if (!response) {
    console.warn('⚠️ extractData: No response provided');
    return null;
  }

  if (response.success === false) {
    console.warn('⚠️ extractData: Response indicates failure:', response.message);
    return null;
  }

  const data = response.data;

  console.log('🔍 extractData - Extracting from response:', {
    hasData: !!data,
    isArray: Array.isArray(data),
    isObject: data && typeof data === 'object',
    dataKeys: data && typeof data === 'object' ? Object.keys(data) : []
  });

  // If data is already an array, return it
  if (Array.isArray(data)) {
    console.log('✅ extractData: Returning array with', data.length, 'items');
    return data;
  }

  // If data is an object, check for common nested structures
  if (data && typeof data === 'object') {
    // Check for nested data property
    if (data.data !== undefined) {
      console.log('✅ extractData: Found nested data property');
      return Array.isArray(data.data) ? data.data : data.data;
    }

    // Check for common array properties
    if (data.items !== undefined && Array.isArray(data.items)) {
      console.log('✅ extractData: Found items array');
      return data.items;
    }
    if (data.results !== undefined && Array.isArray(data.results)) {
      console.log('✅ extractData: Found results array');
      return data.results;
    }
    if (data.users !== undefined && Array.isArray(data.users)) {
      console.log('✅ extractData: Found users array');
      return data.users;
    }
    if (data.products !== undefined && Array.isArray(data.products)) {
      console.log('✅ extractData: Found products array');
      return data.products;
    }
    if (data.orders !== undefined && Array.isArray(data.orders)) {
      console.log('✅ extractData: Found orders array');
      return data.orders;
    }
    if (data.customers !== undefined && Array.isArray(data.customers)) {
      console.log('✅ extractData: Found customers array');
      return data.customers;
    }
    if (data.tables !== undefined && Array.isArray(data.tables)) {
      console.log('✅ extractData: Found tables array');
      return data.tables;
    }
    if (data.expenses !== undefined && Array.isArray(data.expenses)) {
      console.log('✅ extractData: Found expenses array');
      return data.expenses;
    }

    // If it's an object but not an array, return it as-is (might be a single object)
    console.log('✅ extractData: Returning object as-is');
    return data;
  }

  console.log('✅ extractData: Returning data as-is');
  return data;
};

// ========== AUTHENTICATION API ==========
export const authAPI = {
  login: async (identifier, password) => {
    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      const payload = {
        password,
        [isEmail ? 'email' : 'username']: identifier
      };

      const response = await api.post('/auth/login', payload);

      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response;
    } catch (err) {
      return handleApiError(err, 'login');
    }
  },

  register: async (userData) => {
    try {
      return await api.post('/auth/register', userData);
    } catch (error) {
      return handleApiError(error, 'register');
    }
  },

  getMe: async () => {
    try {
      return await api.get('/auth/me');
    } catch (error) {
      return handleApiError(error, 'getMe');
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.clear();
      sessionStorage.clear();
    }
  },

  refreshToken: async () => {
    try {
      return await api.post('/auth/refresh');
    } catch (error) {
      return handleApiError(error, 'refreshToken');
    }
  }
};


// ========== PURCHASE API ==========
export const purchaseAPI = {
  getPurchases: (params = {}) => api.get('/purchases', { params }),
  getPurchase: (id) => api.get(`/purchases/${id}`),
  createPurchase: (data) => api.post('/purchases', data),
  updatePurchase: (id, data) => api.put(`/purchases/${id}`, data),
  deletePurchase: (id) => api.delete(`/purchases/${id}`),

  getDailyPurchases: async (date) => {
    try {
      return await api.get('/purchases/daily', {
        params: { date }
      });
    } catch (error) {
      return handleApiError(error, 'getDailyPurchases');
    }
  },

  getPurchaseStats: async () => {
    try {
      return await api.get('/purchases/stats');
    } catch (error) {
      return handleApiError(error, 'getPurchaseStats');
    }
  },

  getPurchaseDashboardStats: async () => {
    try {
      return await api.get('/purchases/dashboard-stats');
    } catch (error) {
      return handleApiError(error, 'getPurchaseDashboardStats');
    }
  },

  // Purchase Orders
  getPurchaseOrders: async (params = {}) => {
    try {
      return await api.get('/purchase-orders', { params });
    } catch (error) {
      return handleApiError(error, 'getPurchaseOrders');
    }
  },

  getPurchaseOrder: async (id) => {
    try {
      return await api.get(`/purchase-orders/${id}`);
    } catch (error) {
      return handleApiError(error, 'getPurchaseOrder');
    }
  },

  createPurchaseOrder: (data) => api.post('/purchase-orders', data),
  updatePurchaseOrder: (id, data) => api.put(`/purchase-orders/${id}`, data),
  deletePurchaseOrder: (id) => api.delete(`/purchase-orders/${id}`),
  approvePurchaseOrder: (id) => api.put(`/purchase-orders/${id}/approve`)
};

// ========== SUPPLIER API ==========
export const supplierAPI = {
  getSuppliers: (params = {}) => api.get('/suppliers', { params }),
  getSupplier: (id) => api.get(`/suppliers/${id}`),
  createSupplier: (data) => api.post('/suppliers', data),
  updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/suppliers/${id}`),
};

// ========== PRODUCT API ==========
export const productAPI = {
  getProducts: (params = {}) => api.get('/products', { params }),

  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getLowStockProducts: () => api.get('/products/low-stock'),
  updateStock: (id, stockData) => api.patch(`/products/${id}/stock`, stockData)
};

// ========== ORDER API ==========
export const orderAPI = {
  getOrders: (params = {}) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),

  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => api.put(`/orders/${id}`, data),
  deleteOrder: (id) => api.delete(`/orders/${id}`),
  getKitchenOrders: (params = {}) => api.get('/orders/kitchen', { params }),
  updateOrderStatus: (id, statusData) => api.put(`/orders/${id}/status`, statusData),
  processPayment: (id, paymentData) => api.post(`/orders/${id}/payment`, paymentData),
  getOrderStats: (period = 'today') => api.get('/orders/stats', { params: { period } })
};

// ========== CUSTOMER API ==========
export const customerAPI = {
  getCustomers: (params = {}) => api.get('/customers', { params }),
  getCustomer: (id) => api.get(`/customers/${id}`),
  createCustomer: (data) => api.post('/customers', data),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/customers/${id}`),

  getCustomerLedger: (id, params = {}) => api.get(`/customers/${id}/ledger`, { params }),
  getCustomerSummary: (id) => api.get(`/customers/${id}/summary`),
  addLedgerTransaction: (data) => api.post('/customers/ledger/transaction', data)
};

// ========== DASHBOARD API ==========
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRevenueData: (period = 'week') => api.get('/dashboard/revenue', { params: { period } }),
  getDailySales: (period = 'today') => api.get('/dashboard/revenue', { params: { period } }),
  getTopProducts: (limit = 5, period = 'month') => api.get('/dashboard/top-products', { params: { limit, period } }),
  getRecentActivity: (limit = 10) => api.get('/dashboard/recent-activity', { params: { limit } })
};

// ========== INVENTORY API ==========
export const inventoryAPI = {
  getInventory: (params = {}) => api.get('/inventory', { params }),
  updateInventory: (id, data) => api.put(`/inventory/${id}`, data),
  getInventoryReport: (params = {}) => api.get('/inventory/report', { params })
};

// ========== TABLES API ==========
export const tableAPI = {
  getTables: (params = {}) => api.get('/tables', { params }),

  getTable: (id) => api.get(`/tables/${id}`),
  createTable: (data) => api.post('/tables', data),
  updateTable: (id, data) => api.put(`/tables/${id}`, data),
  deleteTable: (id) => api.delete(`/tables/${id}`),
  updateTableStatus: (id, statusData) => api.patch(`/tables/${id}/status`, statusData),
  getAvailableTables: () => api.get('/tables/available')
};

// ========== EXPENSE API ==========
export const expenseAPI = {
  getExpenses: (params = {}) => api.get('/expenses', { params }),
  getExpense: (id) => api.get(`/expenses/${id}`),
  createExpense: (data) => api.post('/expenses', data),
  updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
};

// ========== TRANSACTION API (for financial data) ==========
export const transactionAPI = {
  getTransactions: (params = {}) => api.get('/finance/transactions', { params }),
  getTransaction: (id) => api.get(`/finance/transactions/${id}`),
  createTransaction: (data) => api.post('/finance/transactions', data),
  getFinanceDashboard: () => api.get('/finance/dashboard')
};

// ========== REPORTS API ==========
export const reportAPI = {
  getPurchaseReports: (params = {}) => api.get('/reports/purchases', { params }),
  getInventoryReport: (params = {}) => api.get('/reports/inventory', { params }),
  generateFinancialReport: (data) => api.post('/finance/reports/generate', data)
};

// ========== SETTINGS API ==========
export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  getBranchSettings: (branchId) => api.get(`/settings/branch/${branchId}`),
  updateBranchSettings: (branchId, data) => api.put(`/settings/branch/${branchId}`, data),
  uploadBranchLogo: (branchId, formData) => api.post(`/settings/branch/${branchId}/logo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getSystemSettings: () => api.get('/settings/system')
};

// ========== USER API ==========
export const userAPI = {
  getUsers: (params = {}) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`)
};

// ========== MAIN EXPORT ==========
export const realApi = {
  // Core
  api,
  API_CONFIG,
  extractData,

  // APIs by category
  auth: authAPI,
  purchases: purchaseAPI,
  suppliers: supplierAPI,
  products: productAPI,
  orders: orderAPI,
  tables: tableAPI,
  customers: customerAPI,
  dashboard: dashboardAPI,
  expenses: expenseAPI,
  transactions: transactionAPI,
  reports: reportAPI,
  settings: settingsAPI,
  users: userAPI,
  inventory: inventoryAPI,

  // Flatten commonly used methods for backwards compatibility
  // Auth
  login: authAPI.login,
  register: authAPI.register,
  getMe: authAPI.getMe,
  logout: authAPI.logout,
  refreshToken: authAPI.refreshToken,

  // Products
  getProducts: productAPI.getProducts,
  getProduct: productAPI.getProduct,
  createProduct: productAPI.createProduct,
  updateProduct: productAPI.updateProduct,
  deleteProduct: productAPI.deleteProduct,
  getCategories: productAPI.getCategories,
  getLowStockProducts: productAPI.getLowStockProducts,
  updateStock: productAPI.updateStock,

  // Orders
  getOrders: orderAPI.getOrders,
  getOrder: orderAPI.getOrder,
  createOrder: orderAPI.createOrder,
  updateOrder: orderAPI.updateOrder,
  deleteOrder: orderAPI.deleteOrder,
  getKitchenOrders: orderAPI.getKitchenOrders,
  updateOrderStatus: orderAPI.updateOrderStatus,
  processPayment: orderAPI.processPayment,
  getOrderStats: orderAPI.getOrderStats,

  // Tables
  getTables: tableAPI.getTables,
  getTable: tableAPI.getTable,
  createTable: tableAPI.createTable,
  updateTable: tableAPI.updateTable,
  deleteTable: tableAPI.deleteTable,
  updateTableStatus: tableAPI.updateTableStatus,
  getAvailableTables: tableAPI.getAvailableTables,

  // Customers
  getCustomers: customerAPI.getCustomers,
  getCustomer: customerAPI.getCustomer,
  createCustomer: customerAPI.createCustomer,
  updateCustomer: customerAPI.updateCustomer,
  deleteCustomer: customerAPI.deleteCustomer,
  getCustomerLedger: customerAPI.getCustomerLedger,
  getCustomerSummary: customerAPI.getCustomerSummary,
  addLedgerTransaction: customerAPI.addLedgerTransaction,

  // Purchases
  getPurchases: purchaseAPI.getPurchases,
  getPurchase: purchaseAPI.getPurchase,
  createPurchase: purchaseAPI.createPurchase,
  updatePurchase: purchaseAPI.updatePurchase,
  deletePurchase: purchaseAPI.deletePurchase,
  getDailyPurchases: purchaseAPI.getDailyPurchases,
  getPurchaseStats: purchaseAPI.getPurchaseStats,
  getPurchaseDashboardStats: purchaseAPI.getPurchaseDashboardStats,
  getPurchaseOrders: purchaseAPI.getPurchaseOrders,
  getPurchaseOrder: purchaseAPI.getPurchaseOrder,
  createPurchaseOrder: purchaseAPI.createPurchaseOrder,
  updatePurchaseOrder: purchaseAPI.updatePurchaseOrder,
  deletePurchaseOrder: purchaseAPI.deletePurchaseOrder,
  approvePurchaseOrder: purchaseAPI.approvePurchaseOrder,

  // Settings
  getSettings: settingsAPI.getSettings,
  updateSettings: settingsAPI.updateSettings,
  getBranchSettings: settingsAPI.getBranchSettings,
  updateBranchSettings: settingsAPI.updateBranchSettings,
  uploadBranchLogo: settingsAPI.uploadBranchLogo,
  getSystemSettings: settingsAPI.getSystemSettings,

  // Users
  getUsers: userAPI.getUsers,
  getUser: userAPI.getUser,
  createUser: userAPI.createUser,
  updateUser: userAPI.updateUser,
  deleteUser: userAPI.deleteUser,

  // Expenses
  getExpenses: expenseAPI.getExpenses,
  getExpense: expenseAPI.getExpense,
  createExpense: expenseAPI.createExpense,
  updateExpense: expenseAPI.updateExpense,
  deleteExpense: expenseAPI.deleteExpense,

  // Finance/Transactions
  getTransactions: transactionAPI.getTransactions,
  getTransaction: transactionAPI.getTransaction,
  createTransaction: transactionAPI.createTransaction,
  getFinanceDashboard: transactionAPI.getFinanceDashboard,

  // Reports
  getPurchaseReports: reportAPI.getPurchaseReports,
  generateFinancialReport: reportAPI.generateFinancialReport,

  // Dashboard
  getStats: dashboardAPI.getStats,
  getRevenueData: dashboardAPI.getRevenueData,
  getDailySales: dashboardAPI.getDailySales,
  getTopProducts: dashboardAPI.getTopProducts,
  getRecentActivity: dashboardAPI.getRecentActivity,

  // Inventory
  getInventory: inventoryAPI.getInventory,
  updateInventory: inventoryAPI.updateInventory,

  // Suppliers
  getSuppliers: supplierAPI.getSuppliers,
  getSupplier: supplierAPI.getSupplier,
  createSupplier: supplierAPI.createSupplier,
  updateSupplier: supplierAPI.updateSupplier,
  deleteSupplier: supplierAPI.deleteSupplier,

  // Helper methods
  testConnection: async () => {
    try {
      const response = await api.get('/health');
      return {
        success: true,
        message: 'Backend is connected and healthy',
        data: response.data
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        message: error.message || 'Cannot connect to backend',
        error: error.code
      };
    }
  },

  // Optional audit logs API (falls back if not available)
  getAuditLogs: async (params = {}) => {
    try {
      const res = await api.get('/audit/logs', { params });
      return res;
    } catch (error) {
      return { success: false, message: 'Audit API not available' };
    }
  },

  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
  }
};

// For compatibility
export const demoLocalAPI = {
  simulateDelay: () => new Promise(resolve => setTimeout(resolve, 0)),
  getDemoPurchases: async () => ({
    success: false,
    message: 'Real API is required. Backend might be down.'
  }),
  // Add other demo methods that return error messages
};

export const shouldUseDemoData = () => false;

// Default export is axios instance for compatibility with services/api.js
export default api;
