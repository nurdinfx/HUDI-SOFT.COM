import axios from 'axios';
import { API_CONFIG } from '../config/api.config';

console.log('🔗 Initializing Real API with URL:', API_CONFIG.API_URL);

// Create axios instance
const api = axios.create({
  timeout: 60000, // 60 seconds timeout for Render cold starts
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // FORCE LATEST URL
    config.baseURL = API_CONFIG.API_URL;
    config.withCredentials = false; // Required for mobile/cross-origin
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
      if (token.startsWith('demo-')) {
        config.headers.Authorization = token;
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // MULTI-TENANCY: Send license key if available
    const licenseData = localStorage.getItem('pos_license_data');
    if (licenseData) {
      try {
        const parsed = JSON.parse(licenseData);
        if (parsed.key) {
          config.headers['X-License-Key'] = parsed.key;
        }
      } catch (e) {}
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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

// ========== EMPLOYEE API ==========
export const employeeAPI = {
  getEmployees: (params = {}) => api.get('/employees', { params }),
  getEmployee: (id) => api.get(`/employees/${id}`),
  createEmployee: (data) => api.post('/employees', data),
  updateEmployee: (id, data) => api.put(`/employees/${id}`, data),
  deleteEmployee: (id) => api.delete(`/employees/${id}`),
  getAdvances: (params = {}) => api.get('/employees/advances', { params }),
  createAdvance: (data) => api.post('/employees/advances', data),
  updateAdvanceStatus: (id, data) => api.put(`/employees/advances/${id}/status`, data),
  deleteAdvance: (id) => api.delete(`/employees/advances/${id}`),
  getEmployeeSummary: () => api.get('/employees/summary')
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

// ========== QR ORDERING API ==========
export const qrAPI = {
  // Public (customer phone — no auth)
  getMenu: (tableToken) => api.get(`/qr/menu/${tableToken}`),
  placeOrder: (data) => api.post('/qr/orders', data),
  trackOrder: (sessionId, tableToken) => api.get(`/qr/track/${sessionId}?tableToken=${tableToken}`),
  waiterRequest: (data) => api.post('/qr/waiter-request', data),

  // Admin
  getTablesWithQR: () => api.get('/qr/tables'),
  generateQR: (tableId) => api.post(`/qr/tables/${tableId}/generate`),
  toggleQR: (tableId) => api.patch(`/qr/tables/${tableId}/toggle`),
  getQRAnalytics: () => api.get('/qr/analytics'),

  // Staff
  getWaiterRequests: (params = {}) => api.get('/qr/waiter-requests', { params }),
  resolveWaiterRequest: (id, data) => api.patch(`/qr/waiter-requests/${id}`, data),
};

// ========== ATTENDANCE API ==========
export const attendanceAPI = {
  getDashboardStats: () => api.get('/attendance/dashboard-stats'),
  getMonitor: () => api.get('/attendance/monitor'),
  getLogs: (params = {}) => api.get('/attendance/logs', { params }),
  manualLog: (data) => api.post('/attendance/logs/manual', data),
  
  // Shifts
  getShifts: () => api.get('/attendance/shifts'),
  createShift: (data) => api.post('/attendance/shifts', data),
  updateShift: (id, data) => api.put(`/attendance/shifts/${id}`, data),
  deleteShift: (id) => api.delete(`/attendance/shifts/${id}`),
  assignShift: (data) => api.post('/attendance/shifts/assign', data),
  
  // Stations (QR)
  getStations: () => api.get('/attendance/stations'),
  createStation: (data) => api.post('/attendance/stations', data),
  regenerateStation: (id) => api.post(`/attendance/stations/${id}/regenerate`),
  deleteStation: (id) => api.delete(`/attendance/stations/${id}`),
  
  // Settings
  getSettings: () => api.get('/attendance/settings'),
  updateSettings: (data) => api.put('/attendance/settings', data),
  
  // Audit Logs
  getAuditLogs: () => api.get('/attendance/audit-logs'),

  // Public Scanned Scanner APIs
  getPublicStation: (token) => api.get(`/attendance/public/station/${token}`),
  identifyEmployee: (data) => api.post('/attendance/public/identify', data),
  registerOptions: (data) => api.post('/attendance/public/register-options', data),
  registerVerify: (data) => api.post('/attendance/public/register-verify', data),
  loginOptions: (data) => api.post('/attendance/public/login-options', data),
  loginVerify: (data) => api.post('/attendance/public/login-verify', data),
  pinFallback: (data) => api.post('/attendance/public/pin-fallback', data)
};

// ========== HOTEL API ==========
export const hotelAPI = {
  getRoomTypes: () => api.get('/hotel/room-types'),
  createRoomType: (data) => api.post('/hotel/room-types', data),
  updateRoomType: (id, data) => api.put(`/hotel/room-types/${id}`, data),
  deleteRoomType: (id) => api.delete(`/hotel/room-types/${id}`),

  getRooms: () => api.get('/hotel/rooms'),
  createRoom: (data) => api.post('/hotel/rooms', data),
  updateRoom: (id, data) => api.put(`/hotel/rooms/${id}`, data),
  deleteRoom: (id) => api.delete(`/hotel/rooms/${id}`),

  getReservations: () => api.get('/hotel/reservations'),
  getCheckedInGuests: () => api.get('/hotel/guests/checked-in'),
  createReservation: (data) => api.post('/hotel/reservations', data),
  checkIn: (id) => api.post(`/hotel/reservations/${id}/checkin`),
  checkOut: (id) => api.post(`/hotel/reservations/${id}/checkout`),
  addCharge: (id, data) => api.post(`/hotel/reservations/${id}/charges`, data),
  addPayment: (id, data) => api.post(`/hotel/reservations/${id}/payments`, data),

  getHousekeeping: () => api.get('/hotel/housekeeping'),
  createHousekeeping: (data) => api.post('/hotel/housekeeping', data),
  updateHousekeeping: (id, data) => api.put(`/hotel/housekeeping/${id}`, data),

  getMaintenance: () => api.get('/hotel/maintenance'),
  createMaintenance: (data) => api.post('/hotel/maintenance', data),
  updateMaintenance: (id, data) => api.put(`/hotel/maintenance/${id}`, data),

  getMetrics: () => api.get('/hotel/metrics')
};

// ========== MAIN EXPORT ==========
export const realApi = {
  // Core
  api,
  API_CONFIG,
  extractData,

  // APIs by category
  auth: authAPI,
  hotel: hotelAPI,
  purchases: purchaseAPI,
  suppliers: supplierAPI,
  products: productAPI,
  orders: orderAPI,
  tables: tableAPI,
  customers: customerAPI,
  employees: employeeAPI,
  dashboard: dashboardAPI,
  expenses: expenseAPI,
  transactions: transactionAPI,
  reports: reportAPI,
  settings: settingsAPI,
  users: userAPI,
  inventory: inventoryAPI,
  qr: qrAPI,
  attendance: attendanceAPI,

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

  // Employees
  getEmployees: employeeAPI.getEmployees,
  getEmployee: employeeAPI.getEmployee,
  createEmployee: employeeAPI.createEmployee,
  updateEmployee: employeeAPI.updateEmployee,
  deleteEmployee: employeeAPI.deleteEmployee,
  getAdvances: employeeAPI.getAdvances,
  createAdvance: employeeAPI.createAdvance,
  updateAdvanceStatus: employeeAPI.updateAdvanceStatus,
  deleteAdvance: employeeAPI.deleteAdvance,
  getEmployeeSummary: employeeAPI.getEmployeeSummary,

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
