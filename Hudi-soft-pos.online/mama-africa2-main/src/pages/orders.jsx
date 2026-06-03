// src/pages/Orders.jsx - Updated version

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { realApi } from '../api/realApi';
import { API_CONFIG } from '../config/api.config';
import { io } from 'socket.io-client';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ReceiptSettingsModal from '../components/Settings/ReceiptSettingsModal';
import { printToIframe } from '../utils/print';
import { printBluetooth, connectBluetoothPrinter, isBluetoothConnected } from '../utils/bluetoothPrint';

// --- Global Helpers (Moved outside component to fix ReferenceError and scoping issues) ---

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  } catch (e) {
    return String(dateString);
  }
};

const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-500 text-white',
    confirmed: 'bg-blue-500 text-white',
    preparing: 'bg-orange-500 text-white',
    ready: 'bg-green-500 text-white',
    completed: 'bg-gray-500 text-white',
    cancelled: 'bg-red-500 text-white'
  };
  return colors[status] || 'bg-gray-500 text-white';
};

const getKitchenStatusColor = (kitchenStatus) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    preparing: 'bg-orange-100 text-orange-800 border-orange-300',
    ready: 'bg-green-100 text-green-800 border-green-300',
    served: 'bg-blue-100 text-blue-800 border-blue-300'
  };
  return colors[kitchenStatus] || 'bg-gray-100 text-gray-800 border-gray-300';
};

// Helper to calculate totals based on order items or fallback fields
// Now respects original tax status (if taxAmount is explicitly 0, VAT is disabled)
const calculateOrderTotals = (order, configuredTaxRate = 10) => {
  let subtotal = 0;

  // 1. Try to calculate from items first (most accurate)
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    subtotal = order.items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity) || 1;
      return sum + (price * qty);
    }, 0);
  }
  // 2. Fallback to stored subtotal
  else if (order.subtotal) {
    subtotal = parseFloat(order.subtotal);
  }
  // 3. Fallback to totalAmount (assuming it might be subtotal)
  else if (order.totalAmount) {
    subtotal = parseFloat(order.totalAmount);
  }

  // VAT logic: If taxAmount or tax is explicitly 0, it means VAT was disabled in POS
  const isVatDisabled = order.taxAmount === 0 || order.tax === 0;

  const taxRate = isVatDisabled ? 0 : (configuredTaxRate / 100);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return { subtotal, tax, total };
};

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [updateOrderItems, setUpdateOrderItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [restaurantSettings, setRestaurantSettings] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    customer: '',
    table: '',
    servedBy: '',
    room: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [error, setError] = useState('');
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [summary, setSummary] = useState({
    vat: 0,
    pending: 0,
    totalAmount: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [showKitchenModal, setShowKitchenModal] = useState(false);
  const [kitchenStatusFilter, setKitchenStatusFilter] = useState('all');
  const [showReceiptSettings, setShowReceiptSettings] = useState(false);
  // Number of orders per page in the Orders table (affects only UI pagination, not backend limit)
  const itemsPerPage = 100;

  const { user } = useAuth();


  // New state for dropdown data
  const [users, setUsers] = useState([]);
  const [tables, setTables] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [rooms, setRooms] = useState(['Main Hall', 'VIP', 'Garden']); // Example rooms

  useEffect(() => {
    loadOrders();
    loadRestaurantSettings();
    setupSocketConnection();

    // Fetch dropdown data
    const loadDropdownData = async () => {
      try {
        const [usersRes, tablesRes, customersRes] = await Promise.all([
          realApi.getUsers(),
          realApi.getTables(),
          realApi.getCustomers()
        ]);

        if (usersRes?.success) setUsers(realApi.extractData(usersRes) || []);
        if (tablesRes?.success) setTables(realApi.extractData(tablesRes) || []);
        if (customersRes?.success) setCustomers(realApi.extractData(customersRes) || []);
      } catch (err) {
        console.error('Error loading dropdown data', err);
      }
    };
    loadDropdownData();

    const interval = setInterval(loadOrders, 15000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const setupSocketConnection = () => {
    const SOCKET_URL = API_CONFIG.SOCKET_URL;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    const branchId = user?.branch?._id;

    if (branchId) {
      socket.emit('join-branch', branchId);
    }

    // Listen for new orders from POS
    socket.on('new-order', (order) => {
      if (!order || (branchId && String(order.branch) !== String(branchId))) return;
      console.log('New order received from POS:', order);

      setOrders(prev => {
        const exists = prev.some(o => o._id === order._id);
        const updated = exists ? prev.map(o => o._id === order._id ? order : o) : [order, ...prev];
        return updated;
      });

      // Also update kitchen orders if applicable
      if (order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing') {
        setKitchenOrders(prev => {
          const exists = prev.some(o => o._id === order._id);
          return exists ? prev.map(o => o._id === order._id ? order : o) : [order, ...prev];
        });
      }

      // Show notification for new order
      showNotification(`New order #${order.orderNumber} received from POS`);
    });

    // Listen for order status updates from kitchen
    socket.on('order-status-updated', (order) => {
      if (!order || (branchId && String(order.branch) !== String(branchId))) return;
      console.log('Order status updated from kitchen:', order);

      setOrders(prev => prev.map(o => o._id === order._id ? order : o));

      // Update kitchen orders
      setKitchenOrders(prev => prev.map(o => o._id === order._id ? order : o));

      showNotification(`Order #${order.orderNumber} status updated to ${order.status}`);
    });

    // Listen for order completion
    socket.on('order-completed', (order) => {
      if (!order || (branchId && String(order.branch) !== String(branchId))) return;
      console.log('Order completed:', order);

      setOrders(prev => prev.map(o => o._id === order._id ? order : o));
      showNotification(`Order #${order.orderNumber} completed`);
    });

    // Listen for POS order updates
    socket.on('pos-order-updated', (order) => {
      if (!order || (branchId && String(order.branch) !== String(branchId))) return;
      console.log('POS order updated:', order);

      setOrders(prev => prev.map(o => o._id === order._id ? order : o));
      showNotification(`Order #${order.orderNumber} updated from POS`);
    });

    return () => {
      socket.disconnect();
    };
  };

  const showNotification = (message) => {
    // 1. Browser Notification API
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          const notification = new Notification("HUDI-SOFT POS", {
            body: message,
            icon: "/logo.png",
            badge: "/logo.png",
            tag: 'order-update',
            renotify: true
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (e) {
          console.error('Error showing notification:', e);
        }
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }

    // 2. Fallback to toast (already using react-hot-toast in some places)
    toast.success(message, {
      duration: 5000,
      position: 'top-right',
    });
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          toast.success("Notifications enabled!");
        }
      });
    }
  };

  useEffect(() => {
    filterOrders();
    updatePendingCount();
    calculateSummary();
    updateKitchenOrders();
  }, [orders, filters]);

  const loadRestaurantSettings = async () => {
    try {
      const response = await realApi.getSettings();
      if (response.success) {
        setRestaurantSettings(realApi.extractData(response));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setError('');
      const response = await realApi.getOrders({ limit: 1000000 });
      if (response.success) {
        const orders = realApi.extractData(response) || [];
        orders.sort((a, b) => new Date(b.createdAt || b.orderDate || 0) - new Date(a.createdAt || a.orderDate || 0));
        setOrders(orders);
      }
    } catch (error) {
      console.error('❌ Failed to load orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableProducts = async () => {
    try {
      // Try to load products from real API
      try {
        const response = await realApi.getProducts();
        if (response.success) {
          setAvailableProducts(realApi.extractData(response) || []);
        }
      } catch (error) {
        // Fallback to demo products
        const demoProducts = [
          { _id: '1', name: 'Pizza Margherita', price: 12.99, category: 'Italian' },
          { _id: '2', name: 'Burger', price: 9.99, category: 'American' },
          { _id: '3', name: 'Pasta Carbonara', price: 14.99, category: 'Italian' },
          { _id: '4', name: 'Salad', price: 7.99, category: 'Healthy' },
          { _id: '5', name: 'Soda', price: 2.99, category: 'Drinks' },
          { _id: '6', name: 'Coffee', price: 3.49, category: 'Drinks' },
          { _id: '7', name: 'Dessert', price: 5.99, category: 'Desserts' },
          { _id: '8', name: 'Soup', price: 6.49, category: 'Appetizers' }
        ];
        setAvailableProducts(demoProducts);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  // Generate real order IDs from the image
  const generateRealOrderId = (index) => {
    const realIds = [
      '1.14, 2055',
      '2.11, 3399999999999',
      '2.2',
      '5.46',
      '4.83',
      '1.47'
    ];
    return realIds[index] || `ORD-${Date.now()}-${index}`;
  };

  // Generate demo orders with real IDs from image
  const generateDemoOrdersWithRealIds = () => {
    const currentDate = new Date();
    const realOrderIds = [
      '1.14, 2055',
      '2.11, 3399999999999',
      '2.2',
      '5.46',
      '4.83',
      '1.47'
    ];

    return realOrderIds.map((orderId, index) => ({
      _id: `order_${orderId.replace(/[.,]/g, '_')}`,
      orderNumber: orderId,
      customerName: index === 0 ? 'Table 3' : 'Dynamic SMS',
      tableNumber: index === 0 ? '3' : `FM 1.${21 + index}`,
      totalAmount: 25.50 + (index * 8),
      finalTotal: 28.25 + (index * 8),
      status: ['preparing', 'ready', 'completed', 'pending', 'confirmed', 'preparing'][index],
      paymentStatus: index === 1 || index === 2 ? 'paid' : 'pending',
      orderType: 'dine-in',
      orderDate: new Date(currentDate.getTime() - (index * 10 * 60000)).toISOString(),
      cashier: { name: index === 0 ? 'VBT' : 'System' },
      items: [
        { product: { name: 'Item 1' }, quantity: 2, price: 8.99, _id: `item_${index}_1` },
        { product: { name: 'Item 2' }, quantity: 1, price: 6.99, _id: `item_${index}_2` }
      ],
      taxAmount: 2.75,
      kitchenStatus: index === 0 ? 'preparing' : index === 1 ? 'ready' : 'pending',
      notes: index === 0 ? 'Extra cheese please' : '',
      station: ['grill', 'pizza', 'salad', 'grill', 'pizza', 'salad'][index]
    }));
  };

  const filterOrders = () => {
    let filtered = Array.isArray(orders) ? orders : [];

    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    } else {
      // Hide cancelled orders by default when no specific status filter is active
      filtered = filtered.filter(order => order.status !== 'cancelled');
    }

    if (filters.customer) {
      filtered = filtered.filter(order =>
        order.customer?.name?.toLowerCase().includes(filters.customer.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(filters.customer.toLowerCase())
      );
    }

    if (filters.table) {
      const tableFilter = String(filters.table).toLowerCase();
      filtered = filtered.filter(order => {
        const tableVal = order.tableNumber || order.tableNo || order.table || order.table_id;
        return tableVal && String(tableVal).toLowerCase().includes(tableFilter);
      });
    }

    if (filters.servedBy) {
      filtered = filtered.filter(order =>
        order.cashier?.name?.toLowerCase().includes(filters.servedBy.toLowerCase())
      );
    }

    if (filters.room) {
      filtered = filtered.filter(order =>
        order.room?.toLowerCase().includes(filters.room.toLowerCase())
      );
    }

    if (filters.search) {
      const query = filters.search.toLowerCase().replace(/^order-/, '');
      filtered = filtered.filter(order =>
        order.orderNumber?.toLowerCase().includes(query) ||
        order._id?.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query) ||
        order.tableNumber?.toLowerCase().includes(query)
      );
    }

    // Date range filtering
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt || order.orderDate || 0);
        return orderDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt || order.orderDate || 0);
        return orderDate <= toDate;
      });
    }

    setFilteredOrders(filtered);
  };

  const updateKitchenOrders = () => {
    const kitchenOrders = orders.filter(order =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
    );
    setKitchenOrders(kitchenOrders);
  };

  const updatePendingCount = () => {
    const pending = orders.filter(order =>
      ['pending', 'confirmed', 'preparing'].includes(order.status)
    ).length;
    setPendingOrdersCount(pending);
  };

  const calculateSummary = () => {
    const filtered = Array.isArray(filteredOrders) ? filteredOrders : [];

    let totalVat = 0;
    let totalPending = 0;
    let grandTotal = 0;

    filtered.forEach(order => {
      const { tax, total } = calculateOrderTotals(order, restaurantSettings?.taxRate || 10);

      totalVat += tax;
      grandTotal += total;

      if (order.paymentStatus !== 'paid' && order.status !== 'cancelled') {
        totalPending += total;
      }
    });

    setSummary({ vat: totalVat, pending: totalPending, totalAmount: grandTotal });
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await realApi.updateOrderStatus(orderId, { status: newStatus });

      if (response.success) {
        setOrders(prev =>
          prev.map(order =>
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
        showNotification(`Order status updated to ${newStatus}`);
      } else {
        throw new Error(response.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert(error.message || 'Failed to update order status');
    }
  };

  const updateKitchenOrderStatus = async (orderId, kitchenStatus) => {
    try {
      const response = await realApi.updateOrderStatus(orderId, { kitchenStatus });

      if (response.success) {
        const updated = response.data || { _id: orderId, kitchenStatus };
        setOrders(prev =>
          prev.map(order =>
            order._id === orderId ? { ...order, status: updated.status || order.status, kitchenStatus: updated.kitchenStatus || kitchenStatus, updatedAt: updated.updatedAt || new Date().toISOString() } : order
          )
        );
        setKitchenOrders(prev =>
          prev.map(order =>
            order._id === orderId ? { ...order, status: updated.status || order.status, kitchenStatus: updated.kitchenStatus || kitchenStatus, updatedAt: updated.updatedAt || new Date().toISOString() } : order
          )
        );
        showNotification(`Kitchen status updated to ${updated.kitchenStatus || kitchenStatus}`);
      } else {
        throw new Error(response.message || 'Failed to update kitchen status');
      }
    } catch (error) {
      console.error('Failed to update kitchen status:', error);
      alert(error.message || 'Failed to update kitchen status');
    }
  };

  const processPayment = async (orderId, paymentData) => {
    try {
      const response = await realApi.processPayment(orderId, paymentData);

      if (response.success) {
        setOrders(prev =>
          prev.map(order =>
            order._id === orderId ? {
              ...order,
              paymentStatus: 'paid',
              status: 'completed',
              paymentMethod: paymentData.paymentMethod,
              paidAt: new Date().toISOString()
            } : order
          )
        );
        setShowPaymentModal(false);
        setPaymentOrder(null);
        setPaymentAmount('');
        showNotification('Payment processed successfully!');
      } else {
        throw new Error(response.message || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Failed to process payment:', error);
      alert(error.message || 'Failed to process payment');
    }
  };

  const handleCancelOrder = async (order) => {
    if (window.confirm(`Are you sure you want to cancel order #${(order.orderNumber || '').split('-').pop()}?`)) {
      try {
        const response = await realApi.updateOrderStatus(order._id, { status: 'cancelled' });
        if (response.success) {
          setOrders(prev =>
            prev.filter(o => String(o._id) !== String(order._id))
          );
          showNotification(`Order #${(order.orderNumber || '').split('-').pop()} cancelled successfully`);
        } else {
          throw new Error(response.message || 'Failed to cancel order');
        }
      } catch (error) {
        console.error('Failed to cancel order:', error);
        alert(error.message || 'Failed to cancel order');
      }
    }
  };

  const handleTableInvoice = () => {
    if (!filters.table) {
      alert('Please select a table from the dropdown first');
      return;
    }

    const tableOrders = filteredOrders.filter(o =>
      o.tableNumber === filters.table && o.paymentStatus !== 'paid' && o.status !== 'cancelled'
    );

    if (tableOrders.length === 0) {
      alert(`No pending orders found for Table ${filters.table}`);
      return;
    }

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const subtotal = tableOrders.reduce((sum, o) => sum + calculateOrderTotals(o, restaurantSettings?.taxRate || 10).subtotal, 0);
    const taxRate = (restaurantSettings?.taxRate || 10) / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Table Invoice</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 2mm; width: 80mm; font-size: 13px; }
            .header { text-align: center; margin-bottom: 10px; }
            .restaurant-name { font-size: 18px; font-weight: 700; }
            .dashed-line { border-top: 1px dashed #000; margin: 5px 0; }
            .info-row { display: flex; justify-content: space-between; font-size: 13px; margin: 2px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
            .items-table th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; }
            .items-table td { padding: 5px 0; }
            .totals { margin-top: 10px; font-weight: 700; border-top: 1px dashed #000; padding-top: 5px; }
            .cut-spacer { height: 120px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="restaurant-name">${restaurantSettings?.restaurantName || 'Mama Africa'} - Table Invoice</div>
            <div>Table: ${filters.table}</div>
            <div>Date: ${formattedDate}</div>
          </div>
          <div class="dashed-line"></div>
          <table class="items-table">
            <thead>
              <tr><th>Order #</th><th style="text-align: right;">Amount</th></tr>
            </thead>
            <tbody>
              ${tableOrders.map(o => `
                <tr>
                  <td>#${(o.orderNumber || '').split('-').pop()}</td>
                  <td style="text-align: right;">$${(o.finalTotal || o.totalAmount || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="info-row"><span>SUBTOTAL:</span><span>$${subtotal.toFixed(2)}</span></div>
            <div class="info-row"><span>VAT (${restaurantSettings?.taxRate || 10}%):</span><span>$${tax.toFixed(2)}</span></div>
            <div class="info-row" style="font-size: 16px;"><span>TOTAL:</span><span>$${total.toFixed(2)}</span></div>
          </div>
          <div class="cut-spacer"></div>
        </body>
      </html>
    `;

    // Bluetooth Priority (Bypasses Chrome Preview)
    if (isBluetoothConnected()) {
      try {
        const btText = `TABLE INVOICE\nTable: ${filters.table}\nDate: ${formattedDate}\n` +
                     `--------------------------------\n` +
                     tableOrders.map(o => `Order #${(o.orderNumber || '').split('-').pop()} $${(o.finalTotal || o.totalAmount || 0).toFixed(2)}`).join('\n') +
                     `\n--------------------------------\n` +
                     `TOTAL: $${total.toFixed(2)}\n\n\n\n`;
        printBluetooth(btText);
        return;
      } catch (e) {}
    }

    printToIframe(receiptContent);
  };

  // Print all currently filtered orders
  const handlePrintAllOrders = () => {
    if (!filteredOrders.length) {
      alert('No orders to print');
      return;
    }

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const rows = filteredOrders.map(o => {
      const totals = calculateOrderTotals(o, restaurantSettings?.taxRate || 10);
      const orderNo = (o.orderNumber || '').split('-').pop();
      return `
        <tr>
          <td>#${orderNo || ''}</td>
          <td>${o.tableNumber || '-'}</td>
          <td>${o.customerName || o.customer?.name || '-'}</td>
          <td style="text-align:right;">$${(totals.total || 0).toFixed(2)}</td>
          <td style="text-align:right;">${o.status || '-'}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Orders</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 5mm; font-size: 13px; }
            h2 { margin: 0 0 8px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { padding: 6px 4px; border-bottom: 1px solid #ddd; text-align: left; }
            th { background: #f4f6f8; }
            .cut-spacer { height: 120px; }
          </style>
        </head>
        <body>
          <h2>Orders (${filteredOrders.length})</h2>
          <div style="font-size:12px; margin-bottom:8px;">Printed: ${formattedDate}</div>
          <table>
            <thead>
              <tr><th>#</th><th>Table</th><th>Customer</th><th style="text-align:right;">Total</th><th style="text-align:right;">Status</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="cut-spacer"></div>
        </body>
      </html>
    `;

    // Bluetooth Priority (Bypasses Chrome Preview)
    if (isBluetoothConnected()) {
      try {
        const btText = `ORDERS REPORT (${filteredOrders.length})\nDate: ${formattedDate}\n` +
                     `--------------------------------\n` +
                     filteredOrders.slice(0, 10).map(o => `#${(o.orderNumber || '').split('-').pop()} - $${(o.finalTotal || 0).toFixed(2)}`).join('\n') +
                     (filteredOrders.length > 10 ? '\n...and more' : '') +
                     `\n\n\n\n`;
        printBluetooth(btText);
        return;
      } catch (e) {}
    }

    printToIframe(html);
  };

  const handleTablePayment = () => {
    if (!filters.table) {
      alert('Please select a table from the dropdown first');
      return;
    }

    const tableOrders = filteredOrders.filter(o =>
      o.tableNumber === filters.table && o.paymentStatus !== 'paid' && o.status !== 'cancelled'
    );

    if (tableOrders.length === 0) {
      alert(`No unpaid orders found for Table ${filters.table}`);
      return;
    }

    if (window.confirm(`Mark all ${tableOrders.length} orders for Table ${filters.table} as PAID?`)) {
      tableOrders.forEach(async (order) => {
        await processPayment(order._id, { paymentMethod: 'cash', amount: order.finalTotal || order.totalAmount });
      });
      showNotification(`All orders for Table ${filters.table} marked as paid`);
    }
  };

  const handleUpdateOrder = (order) => {
    // Redirect to POS with the updateOrderId parameter
    navigate(`/pos?updateOrderId=${order._id}`);
  };

  const addItemToUpdate = (product) => {
    const existingItemIndex = updateOrderItems.findIndex(
      item => item.product?._id === product._id || item.product === product._id
    );

    if (existingItemIndex > -1) {
      // Update quantity if item already exists
      const updatedItems = [...updateOrderItems];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].price * updatedItems[existingItemIndex].quantity;
      setUpdateOrderItems(updatedItems);
    } else {
      // Add new item
      const newItem = {
        _id: `item_new_${Date.now()}_${updateOrderItems.length}`,
        product: product,
        quantity: 1,
        price: product.price,
        name: product.name,
        total: product.price
      };
      setUpdateOrderItems([...updateOrderItems, newItem]);
    }
  };

  const removeItemFromUpdate = (index) => {
    const updatedItems = [...updateOrderItems];
    updatedItems.splice(index, 1);
    setUpdateOrderItems(updatedItems);
  };

  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity < 1) {
      removeItemFromUpdate(index);
      return;
    }

    const updatedItems = [...updateOrderItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].total = updatedItems[index].price * newQuantity;
    setUpdateOrderItems(updatedItems);
  };

  const calculateUpdatedTotals = () => {
    const subtotal = updateOrderItems.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0);
    // Respect original order's VAT preference (if tax was 0, it stays 0)
    const isVatDisabled = selectedOrder?.taxAmount === 0 || selectedOrder?.tax === 0;
    const taxRate = isVatDisabled ? 0 : (restaurantSettings?.taxRate || 10) / 100;
    const tax = subtotal * taxRate;
    const finalTotal = subtotal + tax;

    return { subtotal, tax, finalTotal };
  };

  const submitOrderUpdate = async () => {
    try {
      if (!selectedOrder) {
        alert('No order selected');
        return;
      }

      // Calculate new totals
      const { subtotal, tax, finalTotal } = calculateUpdatedTotals();

      // Prepare update data
      const updateData = {
        items: updateOrderItems.map(item => {
          // Extract product ID properly (handle both populated object and string ID)
          let productId = null;
          if (item.product && typeof item.product === 'object') {
            productId = item.product._id;
          } else if (typeof item.product === 'string') {
            productId = item.product;
          }

          // Only send if it looks like a valid MongoDB ObjectId (24 hex chars)
          const isValidObjectId = productId && /^[0-9a-fA-F]{24}$/.test(productId);

          if (!isValidObjectId) {
            console.warn('Item missing valid product ID, attempt to find by name:', item);
            // Try to find matching product by name from available products if ID is invalid
            const itemName = item.product?.name || item.name;
            const matchedProduct = availableProducts.find(p => p.name === itemName);
            if (matchedProduct) {
              productId = matchedProduct._id;
              console.log('✅ Matched product by name:', itemName, 'ID:', productId);
            }
          }

          return {
            product: productId,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes,
            product_name: item.product_name || item.productName || item.product?.name || item.name || 'Item'
          };
        }),
        subtotal,
        tax,
        finalTotal,
        updatedAt: new Date().toISOString()
      };

      let response;

      // Update order with real API
      response = await realApi.updateOrder(selectedOrder._id, updateData);

      if (response.success) {
        // Update local state
        setOrders(prev =>
          prev.map(order =>
            order._id === selectedOrder._id ? {
              ...order,
              items: updateOrderItems,
              subtotal,
              tax,
              finalTotal,
              taxAmount: tax,
              totalAmount: subtotal,
              updatedAt: new Date().toISOString()
            } : order
          )
        );

        setShowUpdateModal(false);
        setSelectedOrder(null);
        setUpdateOrderItems([]);

        // Print updated receipt with POS format
        printReceipt({
          ...selectedOrder,
          items: updateOrderItems,
          subtotal,
          tax,
          finalTotal,
          taxAmount: tax,
          totalAmount: subtotal,
          updatedAt: new Date().toISOString()
        }, true);

        showNotification('Order updated successfully! New items added and receipt printed.');
      } else {
        throw new Error(response.message || 'Failed to update order');
      }
    } catch (error) {
      console.error('Failed to update order:', error);
      alert(error.message || 'Failed to update order');
    }
  };

  const printReceipt = async (order, isUpdated = false) => {
    let currentSettings = restaurantSettings;
    try {
      const response = await realApi.getSettings();
      if (response && response.success) {
        currentSettings = realApi.extractData(response);
        setRestaurantSettings(currentSettings);
      }
    } catch (e) {
      console.warn('Could not fetch latest settings for print', e);
    }

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const originalOrderDate = order.orderDate ? new Date(order.orderDate) : now;
    const originalFormattedDate = `${String(originalOrderDate.getDate()).padStart(2, '0')}/${String(originalOrderDate.getMonth() + 1).padStart(2, '0')}/${originalOrderDate.getFullYear()} ${String(originalOrderDate.getHours()).padStart(2, '0')}:${String(originalOrderDate.getMinutes()).padStart(2, '0')}`;
    const restaurantName = currentSettings?.restaurantName || 'Mamma Africa Restaurant';
    const receiptNumber = (order.orderNumber || '').split('-').pop() || Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    let serverName = order.cashier?.name || order.user?.name || 'System';
    const serverId = order.servedBy?._id || order.servedBy || order.user?._id || order.user || order.cashier?._id || order.cashier;
    if (serverId) {
        // Use already-loaded users list; if empty, fetch on demand so Served By is never "System"
        let usersList = users;
        if (!usersList.length) {
          try {
            const usersRes = await realApi.getUsers();
            if (usersRes?.success) {
              usersList = realApi.extractData(usersRes) || [];
              setUsers(usersList);
            }
          } catch (e) {}
        }
        const servedByUser = usersList.find(u => String(u._id) === String(serverId));
        if (servedByUser) serverName = servedByUser.name;
    }

    // Bluetooth Priority (Bypasses Browser Preview)
    if (isBluetoothConnected()) {
      try {
        const btText = `${isUpdated ? '*** UPDATED ORDER ***\n' : ''}` +
                     `${restaurantName}\n` +
                     `Receipt: #${receiptNumber}\n` +
                     `Served By: ${serverName}\n` +
                     `Date: ${formattedDate}\n` +
                     `--------------------------------\n` +
                     (Array.isArray(order.items) ? order.items.map(item => {
                       const name = item.product_name || item.name || 'Item';
                       return `${item.quantity}x ${name.substring(0, 20)} $${(item.price || 0).toFixed(2)}`;
                     }).join('\n') : '') +
                     `\n--------------------------------\n` +
                     `TOTAL: $${(order.finalTotal || 0).toFixed(2)}\n\n\n\n`;
        printBluetooth(btText);
        return;
      } catch (e) {
        console.error('Bluetooth print failed, falling back to iframe:', e);
      }
    }

    // Dynamic settings from POS settings
    const logoUrl = currentSettings?.logoUrl || currentSettings?.logo || '';
    const vatRate = parseFloat(currentSettings?.taxRate ?? 10) / 100;
    const zaad = currentSettings?.zaad || '';
    const sahal = currentSettings?.sahal || '';
    const edahab = currentSettings?.edahab || '';
    const myCash = currentSettings?.myCash || '';
    const receiptFooter = currentSettings?.receiptFooter || 'Thank you for visiting us!';

    // Build mobile payment line dynamically
    const paymentLines = [
      zaad ? `ZAAD: ${zaad}` : '',
      sahal ? `SAHAL: ${sahal}` : '',
      edahab ? `E-DAHAB: ${edahab}` : '',
      myCash ? `MyCash: ${myCash}` : ''
    ].filter(Boolean);
    const paymentRow1 = paymentLines.slice(0, 2).join(' - ');
    const paymentRow2 = paymentLines.slice(2).join(' - ');

    // Calculate totals using dynamic VAT rate
    let subtotal = 0;
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      subtotal = order.items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)), 0);
    } else if (order.subtotal) {
      subtotal = parseFloat(order.subtotal);
    } else if (order.totalAmount) {
      subtotal = parseFloat(order.totalAmount);
    }
    
    const isVatDisabled = order.taxAmount === 0 || order.tax === 0;
    const taxAmount = isVatDisabled ? 0 : subtotal * vatRate;
    const finalTotal = subtotal + taxAmount;
    const vatPercent = isVatDisabled ? 0 : Math.round(vatRate * 100);
    const receiptWidth = currentSettings?.receiptSize === 'A4' ? '210mm' : (currentSettings?.receiptSize || '80mm');
    
    // Fix breaking logo by using absolute URL
    let absoluteLogoUrl = currentSettings?.logoUrl || currentSettings?.logo || '';
    if (absoluteLogoUrl && !absoluteLogoUrl.startsWith('http')) {
      absoluteLogoUrl = `${API_CONFIG.BACKEND_URL}${absoluteLogoUrl.startsWith('/') ? '' : '/'}${absoluteLogoUrl}`;
    }
    const logoHtml = absoluteLogoUrl ? `<div class="logo-container"><img src="${absoluteLogoUrl}" alt="Logo" class="logo-img" onerror="this.style.display='none'" /></div>` : '';

    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page { 
              size: ${receiptWidth} auto; 
              margin: 0mm; 
            }
            
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0 auto;
              padding: 5mm;
              color: #000;
              font-size: 13px;
              width: ${receiptWidth};
              line-height: 1.4;
              -webkit-font-smoothing: antialiased;
            }
            
            .header { text-align: center; margin-bottom: 15px; }
            .restaurant-name { font-size: 18px; font-weight: 700; text-transform: uppercase; margin: 5px 0; }
            .phones { font-size: 11px; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
            .logo-container { display: flex; justify-content: center; margin-bottom: 8px; }
            .logo-img { max-width: 150px; max-height: 80px; object-fit: contain; }
            
            .info-section { margin-bottom: 10px; font-size: 12px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .info-label { font-weight: 600; }
            
            .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .items-table th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; font-size: 11px; text-transform: uppercase; }
            .items-table td { padding: 5px 0; vertical-align: top; font-size: 12px; border-bottom: 0.5px solid #eee; }
            
            .col-item { width: 50%; }
            .col-no { width: 10%; text-align: center; }
            .col-price { width: 20%; text-align: right; }
            .col-total { width: 20%; text-align: right; font-weight: 600; }
            
            .totals { margin-top: 10px; padding-top: 5px; border-top: 1px dashed #000; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 13px; }
            .grand-total { font-weight: 700; font-size: 18px; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
            
            .qr-container { display: flex; flex-direction: column; align-items: center; margin: 15px 0; }
            .footer { text-align: center; font-size: 11px; margin-top: 10px; }
            .powered-by { font-size: 9px; color: #666; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoHtml}
            <div class="restaurant-name">${restaurantName}</div>
            <div style="font-size: 11px;">${restaurantSettings?.receiptHeader || ''}</div>
            ${(paymentRow1 || paymentRow2) ? `<div class="phones">${paymentRow1}${paymentRow1 && paymentRow2 ? '<br>' : ''}${paymentRow2}</div>` : ''}
          </div>
          
          ${isUpdated ? `<div style="text-align: center; font-weight: 700; color: #C2410C; margin: 5px 0; border: 1px dashed #C2410C; padding: 3px;">*** UPDATED ORDER ***</div>` : ''}
          
          <div class="info-section">
            <div class="info-row"><span class="info-label">Receipt No:</span><span>#${receiptNumber}</span></div>
            <div class="info-row"><span class="info-label">Served By:</span><span>${serverName}</span></div>
            <div class="info-row"><span class="info-label">Customer:</span><span>${order.customer?.name || order.customerName || 'Walking Customer'}</span></div>
            <div class="info-row"><span class="info-label">Date:</span><span>${isUpdated ? originalFormattedDate : formattedDate}</span></div>
            ${order.tableNumber ? `<div class="info-row"><span class="info-label">Table:</span><span>${order.tableNumber}</span></div>` : ''}
          </div>
 
          <table class="items-table">
            <thead>
              <tr>
                <th class="col-item">PRODUCT NAME</th>
                <th class="col-no">QTY</th>
                <th class="col-price">PRICE</th>
                <th class="col-total">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${Array.isArray(order.items) ? order.items.map(item => {
                const itemName = item.product_name || item.productName || item.name || item.itemName || (item.product && typeof item.product === 'object' ? item.product.name : '') || 'Item';
                const itemPrice = item.price || item.product?.price || 0;
                const itemQuantity = item.quantity || 1;
                return `
                  <tr>
                    <td class="col-item">${itemName}</td>
                    <td class="col-no">${itemQuantity}</td>
                    <td class="col-price">${(itemPrice || 0).toFixed(2)}</td>
                    <td class="col-total">${((itemPrice || 0) * itemQuantity).toFixed(2)}</td>
                  </tr>
                `;
              }).join('') : ''}
            </tbody>
          </table>
 
          <div class="totals">
            <div class="total-row"><span class="info-label">Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
            <div class="total-row"><span class="info-label">VAT @ ${vatPercent}%</span><span>$${taxAmount.toFixed(2)}</span></div>
            <div class="total-row grand-total"><span>TOTAL</span><span>$${finalTotal.toFixed(2)}</span></div>
          </div>
          
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <div class="qr-container" style="min-height: 120px; display: flex; justify-content: center; align-items: center;">
            <div id="qrcode"></div>
          </div>
          <script>
            var qrInterval = setInterval(function() {
              if (typeof QRCode !== 'undefined') {
                clearInterval(qrInterval);
                new QRCode(document.getElementById("qrcode"), {
                  text: "ORDER-${receiptNumber}",
                  width: 100, height: 100, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H
                });
              }
            }, 50);
          </script>
 
          <div class="footer">
            <div>${receiptFooter}</div>
            <div class="powered-by">POWERED BY HUDI-SOFT</div>
          </div>
        </body>
      </html>
    `;

    printToIframe(receiptContent);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500 text-white',
      confirmed: 'bg-blue-500 text-white',
      preparing: 'bg-orange-500 text-white',
      ready: 'bg-green-500 text-white',
      completed: 'bg-gray-500 text-white',
      cancelled: 'bg-red-500 text-white'
    };
    return colors[status] || 'bg-gray-500 text-white';
  };

  const getKitchenStatusColor = (kitchenStatus) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      preparing: 'bg-orange-100 text-orange-800 border-orange-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      served: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[kitchenStatus] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusName = (status) => {
    const names = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready: 'Ready',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return names[status] || status;
  };


  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handlePayNow = (order) => {
    setPaymentOrder(order);
    setPaymentAmount(order.finalTotal || order.totalAmount || 0);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = () => {
    if (paymentOrder && paymentAmount) {
      processPayment(paymentOrder._id, {
        paymentMethod: 'cash',
        amount: parseFloat(paymentAmount)
      });
    }
  };

  const handleShowKitchenOrders = () => {
    updateKitchenOrders();
    setShowKitchenModal(true);
  };

  const getFilteredKitchenOrders = () => {
    if (kitchenStatusFilter === 'all') return kitchenOrders;
    return kitchenOrders.filter(order => order.kitchenStatus === kitchenStatusFilter);
  };

  const getTimeElapsed = (createdAt) => {
    if (!createdAt) return '0m';
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Update logic to match exact columns
  const getOrderInfo = (order) => {
    const date = new Date(order.orderDate || order.createdAt);
    return (
      <div className="flex flex-col text-xs">
        <span className="font-bold text-blue-900">#{(order.orderNumber || '').split('-').pop()}</span>
        <span className="text-gray-500">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span className={`font-semibold ${order.status === 'pending' ? 'text-red-500' : 'text-green-600'}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>
    );
  };

  return (
    <div className="pos-fullscreen-container bg-[#f0f2f5] flex flex-col h-screen overflow-hidden text-sm font-sans">

      {/* 1. TOP HEADER (Blue Bar) */}
      <div className="bg-[#1e4c82] text-white flex items-center justify-between px-2 py-2 min-h-[50px] md:h-[50px] shrink-0 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full">
          <div className="bg-[#163a63] p-1 rounded px-3 shrink-0 self-start md:self-auto">
            <h1 className="text-base md:text-lg font-bold">Orders</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap flex-1 w-full overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1">
              <button className="bg-[#2a62a3] hover:bg-[#3474bd] px-2 py-1 rounded text-[10px] md:text-xs border border-[#4a85c5] whitespace-nowrap">Other Printer</button>
              <button className="bg-[#2a62a3] hover:bg-[#3474bd] px-2 py-1 rounded text-[10px] md:text-xs border border-[#4a85c5] whitespace-nowrap">
                Pending: {pendingOrdersCount}
              </button>
            </div>
            
            <div className="flex items-center gap-3 border-l border-[#4a85c5] pl-3 py-1">
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[10px] text-blue-200 uppercase font-bold leading-tight">Total</span>
                <span className="text-xs md:text-sm font-bold whitespace-nowrap">${summary.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex flex-col hidden sm:flex">
                <span className="text-[8px] md:text-[10px] text-blue-200 uppercase font-bold leading-tight">VAT</span>
                <span className="text-xs md:text-sm font-bold whitespace-nowrap">${summary.vat.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[10px] text-blue-200 uppercase font-bold leading-tight">Pending</span>
                <span className="text-xs md:text-sm font-bold whitespace-nowrap text-yellow-300">${summary.pending.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <button 
                onClick={async () => {
                  try {
                    const device = await connectBluetoothPrinter();
                    toast.success(`Paired with ${device.name}`);
                  } catch (e) {
                    toast.error('Bluetooth Pairing Failed');
                  }
                }} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px] md:text-xs border border-blue-400 font-bold"
                title="Pair Bluetooth Printer"
              >
                BT Pair
              </button>
              <button onClick={requestNotificationPermission} className="bg-[#2a62a3] hover:bg-[#3474bd] px-2 py-1 rounded text-[10px] md:text-xs border border-[#4a85c5]" title="Enable Notifications">🔔</button>
              <button onClick={handleTableInvoice} className="bg-[#2a62a3] hover:bg-[#3474bd] px-2 py-1 rounded text-[10px] md:text-xs border border-[#4a85c5]">Inv</button>
              <button onClick={handleTablePayment} className="bg-[#2a62a3] hover:bg-[#3474bd] px-2 py-1 rounded text-[10px] md:text-xs border border-[#4a85c5]">Pay</button>
              <button onClick={handlePrintAllOrders} className="bg-[#2a62a3] hover:bg-[#3474bd] px-2 py-1 rounded text-[10px] md:text-xs border border-[#4a85c5]">Print</button>
              <Link to="/pos" className="bg-[#4caf50] hover:bg-[#43a047] text-white px-3 py-1 rounded text-[10px] md:text-xs border border-green-600 font-bold flex items-center gap-1 ml-1">
                <span className="text-sm">+</span> Add
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTERS BAR */}
      <div className="bg-[#e9ecef] border-b border-gray-300 p-2 shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-2 items-end">

          {/* Date Range */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex items-center gap-1 bg-white border border-gray-300 rounded p-1 shadow-sm h-[34px]">
            <div className="flex flex-col w-1/2">
              <label className="text-[8px] text-gray-500 font-bold pl-1 leading-none">From</label>
              <input
                type="date"
                className="w-full text-[10px] outline-none bg-transparent"
                value={filters.dateFrom}
                onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="w-px h-5 bg-gray-200"></div>
            <div className="flex flex-col w-1/2">
              <label className="text-[8px] text-gray-500 font-bold pl-1 leading-none">To</label>
              <input
                type="date"
                className="w-full text-[10px] outline-none bg-transparent"
                value={filters.dateTo}
                onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>

          {/* Dropdowns */}
          <div className="col-span-1 lg:col-span-1">
            <select className="w-full h-[34px] border border-gray-300 rounded px-1 text-[10px] md:text-xs bg-white focus:border-blue-500 outline-none shadow-sm"
              value={filters.servedBy} onChange={e => setFilters({ ...filters, servedBy: e.target.value })}>
              <option value="">Served</option>
              {users.map(u => <option key={u._id} value={u.name}>{u.name}</option>)}
            </select>
          </div>

          <div className="col-span-1 lg:col-span-2">
            <select className="w-full h-[34px] border border-gray-300 rounded px-1 text-[10px] md:text-xs bg-white focus:border-blue-500 outline-none shadow-sm"
              value={filters.customer} onChange={e => setFilters({ ...filters, customer: e.target.value })}>
              <option value="">Customer</option>
              {customers.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div className="col-span-1 lg:col-span-1">
            <select className="w-full h-[34px] border border-gray-300 rounded px-1 text-[10px] md:text-xs bg-white focus:border-blue-500 outline-none shadow-sm"
              value={filters.room} onChange={e => setFilters({ ...filters, room: e.target.value })}>
              <option value="">Rooms</option>
              {rooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="col-span-1 lg:col-span-1">
            <select className="w-full h-[34px] border border-gray-300 rounded px-1 text-[10px] md:text-xs bg-white focus:border-blue-500 outline-none shadow-sm"
              value={filters.table} onChange={e => setFilters({ ...filters, table: e.target.value })}>
              <option value="">Tables</option>
              {tables.map(t => {
                const value = t.tableNumber || t.tableNo || t.name || t.number || '';
                const label = t.tableNumber || t.tableNo || t.name || t.number || 'Unknown';
                return <option key={t._id || value} value={value}>{label}</option>;
              })}
            </select>
          </div>

          <div className="col-span-1 lg:col-span-1">
            <select className="w-full h-[34px] border border-gray-300 rounded px-1 text-[10px] md:text-xs bg-white focus:border-blue-500 outline-none shadow-sm"
              value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Search */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 relative">
            <input
              type="text"
              placeholder="Order #..."
              className="w-full h-[34px] border border-gray-300 rounded pl-7 pr-2 text-[10px] md:text-xs bg-white focus:border-blue-500 outline-none shadow-sm"
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
            />
            <span className="absolute left-2 top-2.5 text-gray-400 text-xs">🔍</span>
          </div>

          {/* Reset/Action */}
          <div className="col-span-1 lg:col-span-1">
            <button onClick={() => setFilters({ status: '', customer: '', table: '', servedBy: '', room: '', search: '' })}
              className="w-full h-[34px] bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded text-[10px] md:text-xs font-medium transition-colors">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* 3. ORDER TABLE */}
      <div className="flex-1 overflow-hidden bg-[#f0f2f5] p-2 flex flex-col">
        <div className="bg-white border border-gray-300 rounded shadow-sm flex-1 overflow-auto no-scrollbar">
          <table className="w-full border-collapse">
            <thead className="bg-[#f8f9fa] border-b border-gray-300 text-[10px] md:text-xs text-gray-600 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left min-w-[90px]">Order Info</th>
                <th className="p-2 text-left hidden lg:table-cell">Served by</th>
                <th className="p-2 text-left">Table</th>
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-center hidden xl:table-cell">Room</th>
                <th className="p-2 text-center hidden md:table-cell">Payment</th>
                <th className="p-2 text-right hidden lg:table-cell">Paid</th>
                <th className="p-2 text-right min-w-[70px]">Amount</th>
                <th className="p-2 text-left hidden 2xl:table-cell">Remarks</th>
                <th className="p-2 text-center min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-gray-400 italic">No orders found</td>
                </tr>
              ) : (
                currentItems.map((order, idx) => (
                  <tr key={order._id || idx} className="hover:bg-blue-50 transition-colors">
                    <td className="p-2 align-top border-r border-gray-100">
                      {getOrderInfo(order)}
                    </td>
                    <td className="p-2 align-top text-[10px] md:text-xs font-medium text-gray-700 hidden lg:table-cell">
                      {order.cashier?.name || order.user?.name || 'A'}
                    </td>
                    <td className="p-2 align-top text-[10px] md:text-xs text-gray-700">
                      {order.tableNumber || order.tableNo || '-'}
                    </td>
                    <td className="p-2 align-top text-[10px] md:text-xs text-gray-600">
                      <div className="max-w-[100px] truncate" title={order.customer?.name || order.customerName}>
                        {order.customer?.name || order.customerName || 'Walking'}
                      </div>
                    </td>
                    <td className="p-2 align-top text-center text-[10px] md:text-xs text-gray-500 hidden xl:table-cell">
                      {order.room || '-'}
                    </td>
                    <td className="p-2 align-top text-center text-[10px] md:text-xs hidden md:table-cell">
                      <span className={`px-1.5 py-0.5 rounded-full border text-[9px] ${order.paymentStatus === 'paid' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                        {order.paymentMethod || 'Cash'}
                      </span>
                    </td>
                    <td className="p-2 align-top text-right text-[10px] md:text-xs font-medium text-green-600 hidden lg:table-cell">
                      {order.paymentStatus === 'paid' ? calculateOrderTotals(order, restaurantSettings?.taxRate || 10).total.toFixed(2) : '0.00'}
                    </td>
                    <td className="p-2 align-top text-right border-r border-gray-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] md:text-xs font-bold text-gray-800">{calculateOrderTotals(order, restaurantSettings?.taxRate || 10).total.toFixed(2)}</span>
                        <span className="text-[8px] md:text-[9px] text-gray-400">V: {calculateOrderTotals(order, restaurantSettings?.taxRate || 10).tax.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="p-2 align-top text-[10px] md:text-xs text-gray-500 italic max-w-xs truncate hidden 2xl:table-cell">
                      {order.notes || '-'}
                    </td>
                    <td className="p-2 align-top text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap max-w-[150px] mx-auto">
                        <button onClick={() => printReceipt(order)} className="bg-[#4a85c5] hover:bg-[#3474bd] text-white px-1.5 py-0.5 rounded text-[9px]">Print</button>
                        <button onClick={() => { setSelectedOrder(order); setShowModal(true); }} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-1.5 py-0.5 rounded text-[9px]">View</button>
                        {order.paymentStatus !== 'paid' && (
                          <>
                            {['admin', 'manager'].includes(user?.role) && (
                              <button onClick={() => handleUpdateOrder(order)} className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-1.5 py-0.5 rounded text-[9px]">Edit</button>
                            )}
                            <button onClick={() => handlePayNow(order)} className="bg-[#27ae60] hover:bg-[#219150] text-white px-1.5 py-0.5 rounded text-[9px]">Pay</button>
                          </>
                        )}
                        <button onClick={() => handleCancelOrder(order)} className="text-red-400 hover:text-red-600 p-0.5"><span className="text-[10px]">❌</span></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. FOOTER */}
      <div className="bg-[#e9ecef] border-t border-gray-300 p-2 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="bg-[#4a85c5] text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-[#3474bd]">Read SMS</button>
          <button onClick={loadOrders} className="bg-[#17a2b8] text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-[#138496]">Refresh</button>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600 font-medium bg-white border border-gray-300 rounded px-2 py-1">
          <span className="mr-2">Total Records {filteredOrders.length}</span>
          <button disabled={currentPage <= 1} onClick={() => setCurrentPage(1)} className="px-2 py-0.5 hover:bg-gray-100 rounded disabled:opacity-50 text-blue-600">First</button>
          <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="px-2 py-0.5 hover:bg-gray-100 rounded disabled:opacity-50 text-blue-600">Prev</button>
          <span className="mx-1 border border-gray-300 px-2 rounded bg-gray-50">{currentPage} of {totalPages || 1}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-2 py-0.5 hover:bg-gray-100 rounded disabled:opacity-50 text-blue-600">Next</button>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)} className="px-2 py-0.5 hover:bg-gray-100 rounded disabled:opacity-50 text-blue-600">Last</button>
        </div>
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <OrderModal
          order={selectedOrder}
          restaurantSettings={restaurantSettings}
          onClose={() => {
            setShowModal(false);
            setSelectedOrder(null);
          }}
          onPrint={printReceipt}
          onPayNow={handlePayNow}
          onUpdateOrder={handleUpdateOrder}
          onUpdateKitchenStatus={updateKitchenOrderStatus}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Payment</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order: {(paymentOrder.orderNumber || '').split('-').pop()}
                  </label>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer: {paymentOrder.customer?.name || paymentOrder.customerName || 'Walk-in Customer'}
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentOrder(null);
                      setPaymentAmount('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePaymentSubmit}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Process Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE ORDER MODAL */}
      {showUpdateModal && selectedOrder && (
        <UpdateOrderModal
          order={selectedOrder}
          orderItems={updateOrderItems}
          restaurantSettings={restaurantSettings}
          availableProducts={availableProducts}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedOrder(null);
            setUpdateOrderItems([]);
          }}
          onAddItem={addItemToUpdate}
          onRemoveItem={removeItemFromUpdate}
          onUpdateQuantity={updateItemQuantity}
          onSubmit={submitOrderUpdate}
        />
      )}

      {/* KITCHEN ORDERS MODAL */}
      {showKitchenModal && (
        <KitchenOrdersModal
          orders={getFilteredKitchenOrders()}
          statusFilter={kitchenStatusFilter}
          onStatusFilterChange={setKitchenStatusFilter}
          onClose={() => setShowKitchenModal(false)}
          onUpdateStatus={updateKitchenOrderStatus}
          getTimeElapsed={getTimeElapsed}
        />
      )}

      <ReceiptSettingsModal
        isOpen={showReceiptSettings}
        onClose={() => setShowReceiptSettings(false)}
        onSaveSuccess={(newSettings) => {
          setRestaurantSettings(prev => ({ ...prev, ...newSettings }));
          loadOrders(); // Refresh to ensure everything is synced
        }}
      />
    </div>
  );
};

const OrderModal = ({ order, restaurantSettings, onClose, onPrint, onPayNow, onUpdateOrder, onUpdateKitchenStatus }) => {

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Order Details - {(order.orderNumber || '').split('-').pop()}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Order Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Customer</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {order.customer?.name || order.customerName || 'Walk-in Customer'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Order Type</h3>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {order.orderType || 'dine-in'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Kitchen Status</h3>
                <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded border ${getKitchenStatusColor(order.kitchenStatus)}`}>
                  {order.kitchenStatus || 'pending'}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Date & Time</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(order.orderDate || order.createdAt)}
                </p>
              </div>
              {order.tableNumber && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Table</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {order.tableNumber}
                  </p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Payment Status</h3>
                <p className={`mt-1 text-sm font-medium ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                  {order.paymentStatus || 'pending'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Payment Method</h3>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {order.paymentMethod || 'cash'}
                </p>
              </div>
            </div>

            {/* Kitchen Actions */}
            {order.kitchenStatus && order.kitchenStatus !== 'ready' && order.status !== 'completed' && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Kitchen Actions</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdateKitchenStatus(order._id, 'preparing')}
                    className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600"
                  >
                    Start Preparing
                  </button>
                  <button
                    onClick={() => onUpdateKitchenStatus(order._id, 'ready')}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                  >
                    Mark as Ready
                  </button>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Order Items</h3>
              <div className="space-y-3">
                {Array.isArray(order.items) && order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.quantity}x {item.product?.name || item.name || `Item ${index + 1}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(item.price || 0)} each
                      </p>
                      {item.notes && (
                        <p className="text-xs text-yellow-600 mt-1">Note: {item.notes}</p>
                      )}
                    </div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency((item.price || 0) * (item.quantity || 1))}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateOrderTotals(order, restaurantSettings?.taxRate || 10).subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT ({restaurantSettings?.taxRate || 10}%):</span>
                <span>{formatCurrency(calculateOrderTotals(order, restaurantSettings?.taxRate || 10).tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total Amount:</span>
                <span>{formatCurrency(calculateOrderTotals(order, restaurantSettings?.taxRate || 10).total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => onPrint(order)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Print Receipt
              </button>
              {/* UPDATE ORDER BUTTON */}
              {order.status !== 'completed' && order.status !== 'cancelled' && (
                <button
                  onClick={() => {
                    onUpdateOrder(order);
                    onClose();
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Update Order
                </button>
              )}
              {order.paymentStatus !== 'paid' && order.status !== 'completed' && (
                <button
                  onClick={() => onPayNow(order)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Pay Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// UPDATE ORDER MODAL COMPONENT
const UpdateOrderModal = ({ order, orderItems, restaurantSettings, availableProducts, onClose, onAddItem, onRemoveItem, onUpdateQuantity, onSubmit }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0);
    const taxRate = (restaurantSettings?.taxRate || 10) / 100; // Dynamic tax to match POS
    const tax = subtotal * taxRate;
    const finalTotal = subtotal + tax;

    return { subtotal, tax, finalTotal };
  };

  const filteredProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totals = calculateTotals();
  const previousTotal = order.finalTotal || order.totalAmount || 0;
  const additionalAmount = totals.finalTotal - previousTotal;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Update Order - {order.orderNumber}
              </h2>
              <p className="text-sm text-gray-500">
                Customer: {order.customer?.name || order.customerName || 'Walking Customer'}
              </p>
              <p className="text-sm text-gray-500">
                Original Date: {new Date(order.orderDate || order.createdAt).toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Current Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Current Order Items</h3>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto p-2 border rounded">
                {orderItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No items in order</p>
                ) : (
                  orderItems.map((item, index) => (
                    <div key={item._id || index} className="flex justify-between items-center border-b pb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {item.quantity}x {item.product_name || item.productName || (item.product && typeof item.product === 'object' ? item.product.name : '') || item.name || 'Item'}
                          </span>
                          <span className="text-sm text-gray-500">
                            @ ${(item.price || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-medium w-20 text-right">
                          ${((item.price || 0) * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => onRemoveItem(index)}
                          className="text-red-500 hover:text-red-700"
                          title="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Summary */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Previous Total:</span>
                  <span className="font-medium">${previousTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Additional Items:</span>
                  <span className={`font-medium ${additionalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${additionalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>New Total:</span>
                  <span className="text-blue-600">${totals.finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Add Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Add Items to Order</h3>

              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* Product Categories */}
              <div className="mb-4">
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    All
                  </button>
                  <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    Drinks
                  </button>
                  <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    Food
                  </button>
                  <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    Desserts
                  </button>
                </div>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-h-60 overflow-y-auto p-2 border rounded">
                {filteredProducts.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => onAddItem(product)}
                    className="border border-gray-200 rounded-lg p-3 text-left hover:bg-gray-50 transition-colors flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {product.name}
                      </span>
                      <span className="text-green-600 font-medium text-sm whitespace-nowrap">
                        ${product.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {product.category || 'Uncategorized'}
                    </div>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmit}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                  </svg>
                  Update Order & Print
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// KITCHEN ORDERS MODAL COMPONENT
const KitchenOrdersModal = ({ orders, statusFilter, onStatusFilterChange, onClose, onUpdateStatus, getTimeElapsed }) => {
  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(order => order.kitchenStatus === statusFilter);

  const getKitchenStatusColor = (kitchenStatus) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      preparing: 'bg-orange-100 text-orange-800 border-orange-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      served: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[kitchenStatus] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Kitchen Orders View</h2>
              <p className="text-sm text-gray-500">Real-time kitchen order tracking</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="served">Served</option>
              </select>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => o.kitchenStatus === 'pending').length}
              </div>
              <div className="text-sm font-medium text-yellow-700">Pending</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {orders.filter(o => o.kitchenStatus === 'preparing').length}
              </div>
              <div className="text-sm font-medium text-orange-700">Preparing</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {orders.filter(o => o.kitchenStatus === 'ready').length}
              </div>
              <div className="text-sm font-medium text-green-700">Ready</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
              <div className="text-sm font-medium text-blue-700">Total</div>
            </div>
          </div>

          {/* Orders Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Orders */}
            <div>
              <h3 className="text-lg font-bold text-yellow-700 mb-3 flex items-center">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                Pending Orders ({orders.filter(o => o.kitchenStatus === 'pending').length})
              </h3>
              <div className="space-y-3">
                {orders
                  .filter(order => order.kitchenStatus === 'pending')
                  .map(order => (
                    <div key={order._id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-gray-900">#{order.orderNumber}</span>
                          <span className="ml-2 text-sm text-gray-600">
                            {order.tableNumber ? `Table ${order.tableNumber}` : order.orderType}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">{getTimeElapsed(order.createdAt)} ago</span>
                      </div>
                      <p className="text-sm font-medium mb-2">{order.customerName || 'Walk-in Customer'}</p>
                      <div className="space-y-1 mb-3">
                        {Array.isArray(order.items) && order.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.product?.name || item.name}</span>
                            <span className="text-gray-600">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => onUpdateStatus(order._id, 'preparing')}
                          className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600"
                        >
                          Start Preparing
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Preparing & Ready Orders */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-orange-700 mb-3 flex items-center">
                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                  Preparing ({orders.filter(o => o.kitchenStatus === 'preparing').length})
                </h3>
                <div className="space-y-3">
                  {orders
                    .filter(order => order.kitchenStatus === 'preparing')
                    .map(order => (
                      <div key={order._id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-bold text-gray-900">#{(order.orderNumber || '').split('-').pop()}</span>
                            <span className="ml-2 text-sm text-gray-600">
                              {order.tableNumber ? `Table ${order.tableNumber}` : order.orderType}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-gray-500">{getTimeElapsed(order.createdAt)} ago</span>
                            <div className="text-xs text-orange-600">Cooking: {getTimeElapsed(order.updatedAt || order.createdAt)}</div>
                          </div>
                        </div>
                        <p className="text-sm font-medium mb-2">{order.customerName || 'Walk-in Customer'}</p>
                        <div className="flex justify-end">
                          <button
                            onClick={() => onUpdateStatus(order._id, 'ready')}
                            className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                          >
                            Mark as Ready
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Ready for Pickup ({orders.filter(o => o.kitchenStatus === 'ready').length})
                </h3>
                <div className="space-y-3">
                  {orders
                    .filter(order => order.kitchenStatus === 'ready')
                    .map(order => (
                      <div key={order._id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-bold text-gray-900">#{(order.orderNumber || '').split('-').pop()}</span>
                            <span className="ml-2 text-sm text-gray-600">
                              {order.tableNumber ? `Table ${order.tableNumber}` : order.orderType}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-gray-500">{getTimeElapsed(order.createdAt)} ago</span>
                            <div className="text-xs text-green-600">Ready for {getTimeElapsed(order.updatedAt || order.createdAt)}</div>
                          </div>
                        </div>
                        <p className="text-sm font-medium mb-2">{order.customerName || 'Walk-in Customer'}</p>
                        <div className="flex justify-end">
                          <span className="px-3 py-1 bg-green-600 text-white text-sm rounded animate-pulse">
                            READY FOR SERVING
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
