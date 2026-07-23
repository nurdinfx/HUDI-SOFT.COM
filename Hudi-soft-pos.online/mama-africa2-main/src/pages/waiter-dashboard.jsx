// src/pages/waiter-dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { realApi, qrAPI } from '../api/realApi';
import { formatTime } from '../utils/date';
import { 
  Bell, 
  DollarSign, 
  MapPin, 
  Users, 
  Check, 
  Plus, 
  Coffee, 
  Search, 
  Layers, 
  GitMerge, 
  X, 
  RefreshCw, 
  AlertTriangle 
} from 'lucide-react';

const WaiterDashboard = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const branchId = user?.branch?._id || user?.branch?.id;

  // State
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [waiterRequests, setWaiterRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // UI states
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'requests'
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Add Items Pane states
  const [showAddItems, setShowAddItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]); // items to add
  
  // Merge Table states
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetTableId, setMergeTargetTableId] = useState('');
  
  // Split Table states
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitTargetTableId, setSplitTargetTableId] = useState('');
  const [itemsToSplit, setItemsToSplit] = useState({}); // orderItem._id -> quantity to move

  // Fetch initial dashboard data
  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setError('');
      // Load tables
      const tablesRes = await realApi.getTables();
      const loadedTables = realApi.extractData(tablesRes) || [];
      setTables(loadedTables);

      // Load active orders (pending, accepted, preparing, ready, served)
      const ordersRes = await realApi.getOrders({ status: 'active', limit: 100 });
      const ordersData = realApi.extractData(ordersRes);
      const loadedOrders = Array.isArray(ordersData) ? ordersData : 
                     (ordersData?.orders && Array.isArray(ordersData.orders) ? ordersData.orders : []);
      
      // Also get non-active orders that might still be dine-in pending payment
      const activeOrUnpaidOrders = loadedOrders.filter(o => 
        o.orderType === 'dine-in' && o.status !== 'completed' && o.status !== 'cancelled'
      );
      setActiveOrders(activeOrUnpaidOrders);

      // Load pending waiter requests
      const requestsRes = await qrAPI.getWaiterRequests({ status: 'pending' });
      setWaiterRequests(realApi.extractData(requestsRes) || []);

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Could not refresh waiter dashboard. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Fetch products and categories for item adding
  const loadMenuData = useCallback(async () => {
    try {
      const prodRes = await realApi.getProducts({ limit: 500 });
      const prodData = realApi.extractData(prodRes) || [];
      setProducts(prodData);

      const catRes = await realApi.getCategories();
      const catData = realApi.extractData(catRes) || [];
      setCategories(catData);
    } catch (err) {
      console.error('Failed to load menu data:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDashboardData();
    loadMenuData();
  }, [loadDashboardData, loadMenuData]);

  // Real-time socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join waiter room
    if (branchId) {
      socket.emit('join-waiter', branchId);
    }

    // Listen for new orders (any source, including QR)
    const handleNewOrder = (order) => {
      if (branchId && String(order.branch) !== String(branchId)) return;
      if (order.orderType === 'dine-in') {
        setActiveOrders(prev => {
          const exists = prev.some(o => o._id === order._id);
          if (exists) return prev.map(o => o._id === order._id ? order : o);
          return [order, ...prev];
        });
        
        // Refresh tables since table status might change
        loadDashboardData(true);
      }
    };

    // Listen for status updates
    const handleStatusUpdate = (data) => {
      const orderId = data._id || data.orderId;
      const status = data.status;
      setActiveOrders(prev => 
        prev.map(o => o._id === orderId ? { ...o, status } : o)
      );
      loadDashboardData(true);
    };

    // Listen for waiter calls
    const handleWaiterRequested = (request) => {
      if (branchId && String(request.branch) !== String(branchId)) return;
      setWaiterRequests(prev => {
        const exists = prev.some(r => r._id === request._id);
        if (exists) return prev.map(r => r._id === request._id ? request : o);
        return [request, ...prev];
      });
      // Play a sound
      try {
        const audio = new Audio('/new-notification.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    };

    socket.on('new-order', handleNewOrder);
    socket.on('order-status-update', handleStatusUpdate);
    socket.on('order-status-updated', handleStatusUpdate);
    socket.on('waiter-requested', handleWaiterRequested);
    socket.on('bill-requested', handleWaiterRequested);

    return () => {
      socket.off('new-order', handleNewOrder);
      socket.off('order-status-update', handleStatusUpdate);
      socket.off('order-status-updated', handleStatusUpdate);
      socket.off('waiter-requested', handleWaiterRequested);
      socket.off('bill-requested', handleWaiterRequested);
    };
  }, [socket, isConnected, branchId, loadDashboardData]);

  // Resolve Waiter Request
  const handleResolveRequest = async (requestId) => {
    try {
      const res = await qrAPI.resolveWaiterRequest(requestId, { status: 'resolved' });
      if (res.success) {
        setWaiterRequests(prev => prev.filter(r => r._id !== requestId));
      } else {
        alert('Failed to resolve request');
      }
    } catch (err) {
      console.error(err);
      alert('Error resolving request');
    }
  };

  // Change Table Status manually
  const handleChangeTableStatus = async (tableId, newStatus) => {
    try {
      const res = await realApi.updateTableStatus(tableId, { status: newStatus });
      if (res.success) {
        setTables(prev => 
          prev.map(t => t._id === tableId ? { ...t, status: newStatus } : t)
        );
        if (selectedTable && selectedTable._id === tableId) {
          setSelectedTable(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update table status');
    }
  };

  // Mark Order as Served
  const handleMarkServed = async (orderId) => {
    try {
      const res = await realApi.updateOrderStatus(orderId, { status: 'served', kitchenStatus: 'served' });
      if (res.success) {
        setActiveOrders(prev => 
          prev.map(o => o._id === orderId ? { ...o, status: 'served', kitchenStatus: 'served' } : o)
        );
        loadDashboardData(true);
        alert('Order marked as Served!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update order status');
    }
  };

  // Cart operations for adding items
  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(item => item.product === product._id);
      if (exists) {
        return prev.map(item => 
          item.product === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        notes: ''
      }];
    });
  };

  const updateCartQty = (productId, qty) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(item => item.product !== productId));
      return;
    }
    setCart(prev => prev.map(item => 
      item.product === productId ? { ...item, quantity: qty } : item
    ));
  };

  const updateCartNotes = (productId, notes) => {
    setCart(prev => prev.map(item => 
      item.product === productId ? { ...item, notes } : item
    ));
  };

  // Save/Add items to existing table order
  const handleAddItemsToOrder = async (order) => {
    if (cart.length === 0) return;
    
    try {
      // Merge current items and new items
      const existingItems = order.items.map(item => ({
        product: item.product?._id || item.product,
        name: item.name || item.productName || item.product_name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || item.specialInstructions || ''
      }));

      const newItemsFormatted = cart.map(item => ({
        product: item.product,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes
      }));

      // Combine matching products or append
      const mergedItems = [...existingItems];
      for (const newItem of newItemsFormatted) {
        const idx = mergedItems.findIndex(e => e.product === newItem.product && e.notes === newItem.notes);
        if (idx > -1) {
          mergedItems[idx].quantity += newItem.quantity;
        } else {
          mergedItems.push(newItem);
        }
      }

      // Calculate totals
      let subtotal = 0;
      mergedItems.forEach(item => {
        subtotal += item.price * item.quantity;
      });

      // Simple tax and service charge (matches orderController)
      const taxRate = user?.branch?.settings?.taxRate || 4;
      const serviceChargeRate = user?.branch?.settings?.serviceCharge || 5;
      
      const tax = (subtotal * (taxRate / 100));
      const serviceCharge = (subtotal * (serviceChargeRate / 100));
      const finalTotal = subtotal + tax + serviceCharge;

      const payload = {
        items: mergedItems,
        subtotal,
        tax,
        serviceCharge,
        finalTotal,
        notes: order.kitchenNotes
      };

      const res = await realApi.updateOrder(order._id, payload);
      if (res.success) {
        alert('Order updated and sent to kitchen!');
        setCart([]);
        setShowAddItems(false);
        loadDashboardData(true);
        // Refresh selected table details
        const updatedOrder = res.data;
        setSelectedTable(prev => ({
          ...prev,
          activeOrder: updatedOrder
        }));
      } else {
        alert(res.message || 'Failed to update order');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating order: ' + (err.message || 'unknown error'));
    }
  };

  // Merge Tables Action
  const handleMergeTables = async () => {
    if (!selectedTable?.activeOrder || !mergeTargetTableId) return;
    const targetTable = tables.find(t => t._id === mergeTargetTableId);
    if (!targetTable) return;

    try {
      const sourceOrder = selectedTable.activeOrder;
      
      // Look if target table has an active order
      const targetOrder = activeOrders.find(o => o.tableId === mergeTargetTableId);
      
      if (targetOrder) {
        // Merge order items into the target table's order
        const targetItems = targetOrder.items.map(item => ({
          product: item.product?._id || item.product,
          name: item.name || item.product_name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes || ''
        }));
        
        const sourceItems = sourceOrder.items.map(item => ({
          product: item.product?._id || item.product,
          name: item.name || item.product_name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes || ''
        }));
        
        // Merge items
        const mergedItems = [...targetItems];
        for (const item of sourceItems) {
          const idx = mergedItems.findIndex(e => e.product === item.product && e.notes === item.notes);
          if (idx > -1) {
            mergedItems[idx].quantity += item.quantity;
          } else {
            mergedItems.push(item);
          }
        }
        
        let subtotal = 0;
        mergedItems.forEach(i => subtotal += i.price * i.quantity);
        const taxRate = user?.branch?.settings?.taxRate || 4;
        const serviceChargeRate = user?.branch?.settings?.serviceCharge || 5;
        const tax = subtotal * (taxRate / 100);
        const serviceCharge = subtotal * (serviceChargeRate / 100);
        const finalTotal = subtotal + tax + serviceCharge;

        // 1. Update target order with merged items
        const updateRes = await realApi.updateOrder(targetOrder._id, {
          items: mergedItems,
          subtotal,
          tax,
          serviceCharge,
          finalTotal
        });

        if (!updateRes.success) throw new Error(updateRes.message || 'Failed to update target order');
        
        // 2. Cancel source order (refund stock since updateOrder will re-calculate, but here we delete/cancel it)
        const cancelRes = await realApi.updateOrderStatus(sourceOrder._id, { status: 'cancelled' });
        if (!cancelRes.success) throw new Error(cancelRes.message || 'Failed to cancel source order');

      } else {
        // Target table is free, just move this order to the target table
        const updateRes = await realApi.updateOrder(sourceOrder._id, {
          tableId: targetTable._id,
          tableNumber: targetTable.number || targetTable.tableNumber
        });
        
        if (!updateRes.success) throw new Error(updateRes.message || 'Failed to transfer order');
        
        // Free up current table status
        await realApi.updateTableStatus(selectedTable._id, { status: 'available' });
        // Set target table status to occupied
        await realApi.updateTableStatus(targetTable._id, { status: 'occupied' });
      }

      alert('Tables merged successfully!');
      setShowMergeModal(false);
      setMergeTargetTableId('');
      setSelectedTable(null);
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Error merging tables: ' + err.message);
    }
  };

  // Split Table Action
  const handleSplitTables = async () => {
    if (!selectedTable?.activeOrder || !splitTargetTableId) return;
    const targetTable = tables.find(t => t._id === splitTargetTableId);
    if (!targetTable) return;

    // Check if any items are selected
    const splitKeys = Object.keys(itemsToSplit).filter(k => itemsToSplit[k] > 0);
    if (splitKeys.length === 0) {
      alert('Please select at least one item to split.');
      return;
    }

    try {
      const order = selectedTable.activeOrder;
      const splitItems = [];
      const keptItems = [];

      order.items.forEach(item => {
        const qtyToMove = itemsToSplit[item._id] || 0;
        const qtyToKeep = item.quantity - qtyToMove;

        if (qtyToMove > 0) {
          splitItems.push({
            product: item.product?._id || item.product,
            name: item.name || item.product_name,
            price: item.price,
            quantity: qtyToMove,
            notes: item.notes || ''
          });
        }
        
        if (qtyToKeep > 0) {
          keptItems.push({
            product: item.product?._id || item.product,
            name: item.name || item.product_name,
            price: item.price,
            quantity: qtyToKeep,
            notes: item.notes || ''
          });
        }
      });

      // 1. Create a new order for the target table
      let splitSubtotal = 0;
      splitItems.forEach(i => splitSubtotal += i.price * i.quantity);
      const taxRate = user?.branch?.settings?.taxRate || 4;
      const serviceChargeRate = user?.branch?.settings?.serviceCharge || 5;
      const splitTax = splitSubtotal * (taxRate / 100);
      const splitServiceCharge = splitSubtotal * (serviceChargeRate / 100);
      const splitTotal = splitSubtotal + splitTax + splitServiceCharge;

      const newOrderPayload = {
        items: splitItems,
        orderType: 'dine-in',
        tableId: targetTable._id,
        tableNumber: targetTable.number || targetTable.tableNumber,
        subtotal: splitSubtotal,
        tax: splitTax,
        serviceCharge: splitServiceCharge,
        finalTotal: splitTotal,
        paymentMethod: 'cash',
        branch: branchId
      };

      const createRes = await realApi.createOrder(newOrderPayload);
      if (!createRes.success) throw new Error(createRes.message || 'Failed to create split order');

      // Set target table status to occupied
      await realApi.updateTableStatus(targetTable._id, { status: 'occupied' });

      // 2. Update current order (keep remaining items)
      if (keptItems.length > 0) {
        let keptSubtotal = 0;
        keptItems.forEach(i => keptSubtotal += i.price * i.quantity);
        const keptTax = keptSubtotal * (taxRate / 100);
        const keptServiceCharge = keptSubtotal * (serviceChargeRate / 100);
        const keptTotal = keptSubtotal + keptTax + keptServiceCharge;

        const updateRes = await realApi.updateOrder(order._id, {
          items: keptItems,
          subtotal: keptSubtotal,
          tax: keptTax,
          serviceCharge: keptServiceCharge,
          finalTotal: keptTotal
        });
        if (!updateRes.success) throw new Error(updateRes.message || 'Failed to update current order');
      } else {
        // If nothing is left in current order, cancel it
        const cancelRes = await realApi.updateOrderStatus(order._id, { status: 'cancelled' });
        if (!cancelRes.success) throw new Error(cancelRes.message || 'Failed to cancel source order');
        await realApi.updateTableStatus(selectedTable._id, { status: 'available' });
      }

      alert('Order split successfully!');
      setShowSplitModal(false);
      setItemsToSplit({});
      setSplitTargetTableId('');
      setSelectedTable(null);
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Error splitting tables: ' + err.message);
    }
  };

  // Filter Tables
  const getFilteredTables = () => {
    let filtered = [...tables];
    if (locationFilter !== 'all') {
      filtered = filtered.filter(t => t.location === locationFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    return filtered;
  };

  // Find table order details
  const getTableOrder = (tableId) => {
    return activeOrders.find(o => o.table === tableId || o.tableId === tableId);
  };

  // Render Table Status Pill
  const renderStatusPill = (status) => {
    const map = {
      available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      occupied: 'bg-red-50 text-red-700 border-red-200',
      reserved: 'bg-amber-50 text-amber-700 border-amber-200',
      cleaning: 'bg-blue-50 text-blue-700 border-blue-200'
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${map[status] || 'bg-slate-50 text-slate-700'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Render Order Status Badge
  const renderOrderBadge = (status) => {
    const map = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      accepted: 'bg-blue-100 text-blue-800 border-blue-200',
      preparing: 'bg-orange-100 text-orange-800 border-orange-200',
      ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      served: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return (
      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${map[status] || 'bg-slate-100 text-slate-800'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Helper: How long ago was the time?
  const timeAgo = (dateString) => {
    try {
      const diff = Date.now() - new Date(dateString).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'Just now';
      return `${minutes}m ago`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="page-content bg-slate-50 min-h-screen p-6 flex flex-col gap-6 text-slate-800">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            👨‍🍳 Waiter Control Board
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Real-time Table Map, QR Service Calls, and Order Operations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Socket Indicator */}
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors duration-300 ${
            isConnected 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
              : 'bg-red-50 text-red-700 border-red-100 animate-pulse'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {isConnected ? 'LIVE FEED ACTIVE' : 'CONNECTION RE-CONNECTING'}
          </span>

          <button 
            onClick={() => loadDashboardData()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            RELOAD
          </button>
        </div>
      </div>

      {/* Grid of Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Main Content Area: Table Map or Requests (Columns: 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Section Selector / Dashboard Navigation */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
                activeTab === 'tables' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              TABLE GRID ({tables.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 relative ${
                activeTab === 'requests' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              QR REQUESTS
              {waiterRequests.length > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black animate-bounce">
                  {waiterRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* TABLES VIEW */}
          {activeTab === 'tables' && (
            <div className="flex flex-col gap-6">
              
              {/* Filters */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Location Filter */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Location</label>
                    <select
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      className="text-xs bg-slate-100 border-0 rounded-lg p-2 font-bold outline-none cursor-pointer"
                    >
                      <option value="all">All Locations</option>
                      <option value="indoor">Indoor</option>
                      <option value="outdoor">Outdoor</option>
                      <option value="terrace">Terrace</option>
                      <option value="vip">VIP Room</option>
                    </select>
                  </div>
                  
                  {/* Status Filter */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs bg-slate-100 border-0 rounded-lg p-2 font-bold outline-none cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="reserved">Reserved</option>
                      <option value="cleaning">Cleaning</option>
                    </select>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Free</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Occupied</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Reserved</span>
                </div>
              </div>

              {/* Table Map Grid */}
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : getFilteredTables().length === 0 ? (
                <div className="bg-white py-16 text-center rounded-xl border border-slate-100 shadow-sm text-slate-400">
                  <p className="font-bold">No tables matched filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {getFilteredTables().map(table => {
                    const activeOrder = getTableOrder(table._id);
                    const isOccupied = table.status === 'occupied' || activeOrder;
                    const hasActiveWaiterCall = waiterRequests.some(r => 
                      r.tableId === table._id && r.type === 'waiter_call'
                    );
                    const hasActiveBillCall = waiterRequests.some(r => 
                      r.tableId === table._id && r.type === 'bill_request'
                    );

                    return (
                      <div
                        key={table._id}
                        onClick={() => setSelectedTable({ ...table, activeOrder })}
                        className={`bg-white rounded-xl border-2 p-4 cursor-pointer relative shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[140px] ${
                          selectedTable?._id === table._id
                            ? 'border-slate-900 ring-2 ring-slate-200'
                            : isOccupied 
                              ? 'border-red-100 hover:border-red-200' 
                              : 'border-slate-100 hover:border-slate-300'
                        } ${
                          hasActiveWaiterCall || hasActiveBillCall ? 'ring-2 ring-red-500 animate-pulse' : ''
                        }`}
                      >
                        {/* Table Header: Number & Location */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-lg font-black text-slate-800">
                              TBL {table.number || table.tableNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1 uppercase mt-0.5">
                              <MapPin className="w-3 h-3 inline" /> {table.location || 'Main'}
                            </span>
                          </div>
                          
                          {/* Alert Badges */}
                          <div className="flex gap-1">
                            {hasActiveWaiterCall && (
                              <span className="bg-red-500 text-white p-1 rounded-full text-xs font-black shadow animate-bounce" title="Waiter Called!">
                                <Bell className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {hasActiveBillCall && (
                              <span className="bg-amber-500 text-white p-1 rounded-full text-xs font-black shadow animate-bounce" title="Bill Requested!">
                                <DollarSign className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Order info summary */}
                        <div className="my-3">
                          {isOccupied && activeOrder ? (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-500">Order:</span>
                                <span className="font-black text-slate-900">${activeOrder.finalTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-black">
                                  {activeOrder.items?.length || 0} items
                                </span>
                                {activeOrder.orderSource === 'qr' && (
                                  <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-black">
                                    📱 QR Order
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-semibold">
                              <Users className="w-3.5 h-3.5" /> Max Cap: {table.capacity || 4}
                            </div>
                          )}
                        </div>

                        {/* Footer details: Status Pill */}
                        <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                          {renderStatusPill(isOccupied ? 'occupied' : table.status)}
                          {activeOrder && renderOrderBadge(activeOrder.status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* REQUESTS VIEW */}
          {activeTab === 'requests' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col gap-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                🔔 Pending QR Customer Calls
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                These requests are sent directly by customers from their mobile browsers. Action them immediately.
              </p>

              {waiterRequests.length === 0 ? (
                <div className="text-center py-16 text-slate-400 font-bold">
                  🎉 No pending customer requests! You are all caught up.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {waiterRequests.map(req => (
                    <div 
                      key={req._id}
                      className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                        req.type === 'bill_request' 
                          ? 'bg-amber-50/50 border-amber-200' 
                          : 'bg-red-50/30 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-lg text-white ${
                          req.type === 'bill_request' ? 'bg-amber-500' : 'bg-red-500'
                        }`}>
                          {req.type === 'bill_request' ? <DollarSign className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">
                            {req.type === 'bill_request' ? 'BILL REQUEST' : 'WAITER CALL'} — Table {req.tableNumber}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-semibold">
                            <span>Table ID: {req.tableId?.slice(-6)}</span>
                            <span>•</span>
                            <span>{timeAgo(req.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleResolveRequest(req._id)}
                        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-black shadow-sm transition-all"
                      >
                        <Check className="w-3.5 h-3.5" /> MARK RESOLVED
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Sidebar Info Section: Selected Table Details (Column: 4) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-6 min-h-[500px]">
          
          {selectedTable ? (
            <div className="flex flex-col gap-6">
              
              {/* Header Details */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Table {selectedTable.number || selectedTable.tableNumber}
                  </h3>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mt-0.5">
                    Location: {selectedTable.location || 'Main Area'}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedTable(null)}
                  className="p-1 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Status Adjust */}
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider">Quick Status Toggle</label>
                <div className="grid grid-cols-2 gap-2">
                  {['available', 'occupied', 'reserved', 'cleaning'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleChangeTableStatus(selectedTable._id, status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all text-center ${
                        selectedTable.status === status
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {status.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Merge / Split Actions */}
              {selectedTable.activeOrder && (
                <div className="border-t border-slate-100 pt-4">
                  <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider">Table Actions</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setShowMergeModal(true);
                        setMergeTargetTableId('');
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black transition-colors"
                    >
                      <GitMerge className="w-3.5 h-3.5" /> MERGE TABLE
                    </button>
                    <button
                      onClick={() => {
                        setShowSplitModal(true);
                        setItemsToSplit({});
                        setSplitTargetTableId('');
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-100 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-black transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" /> SPLIT TABLE
                    </button>
                  </div>
                </div>
              )}

              {/* Active Order details */}
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Order Info</span>
                  {selectedTable.activeOrder && renderOrderBadge(selectedTable.activeOrder.status)}
                </div>

                {selectedTable.activeOrder ? (
                  <div className="flex flex-col gap-4">
                    {/* Bill Info */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs text-slate-500 font-semibold">
                        <span>Order Number:</span>
                        <span className="font-bold text-slate-800">
                          #{selectedTable.activeOrder.orderNumber?.split('-').pop()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 font-semibold">
                        <span>Source:</span>
                        <span className="font-bold text-slate-800">
                          {selectedTable.activeOrder.orderSource === 'qr' ? '📱 QR Code' : '💻 Cashier POS'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200/60 pt-1.5 mt-0.5">
                        <span>Grand Total:</span>
                        <span>${selectedTable.activeOrder.finalTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Order items List */}
                    <div>
                      <span className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider">Order Items</span>
                      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {selectedTable.activeOrder.items?.map((item, idx) => (
                          <div key={idx} className="text-xs flex justify-between border-b border-slate-100 pb-2">
                            <div className="flex-1 pr-2">
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span className="bg-slate-100 px-1 py-0.5 rounded text-slate-900 font-black">
                                  {item.quantity}x
                                </span>
                                {item.name || item.product_name}
                              </div>
                              {item.notes && (
                                <span className="text-[10px] text-orange-600 italic block mt-0.5">
                                  "{item.notes}"
                                </span>
                              )}
                            </div>
                            <span className="font-black text-slate-700">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Order Operations */}
                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
                      {selectedTable.activeOrder.status !== 'served' && (
                        <button
                          onClick={() => handleMarkServed(selectedTable.activeOrder._id)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" /> MARK AS SERVED
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setCart([]);
                          setShowAddItems(true);
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black shadow transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> ADD MORE ITEMS
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-200 text-center py-10 rounded-lg text-slate-400 text-xs font-semibold flex flex-col items-center gap-1.5">
                    <Coffee className="w-8 h-8 text-slate-300" />
                    <span>No active order on this table.</span>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex flex-col justify-center items-center flex-1 text-slate-400 gap-2 text-center py-20">
              <Coffee className="w-12 h-12 text-slate-200" />
              <p className="font-bold text-sm">Select a table on the map to view details and perform operations.</p>
            </div>
          )}

        </div>

      </div>

      {/* RENDER ADD ITEMS MODAL/PANE */}
      {showAddItems && selectedTable?.activeOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg">Add Items to Table {selectedTable.number || selectedTable.tableNumber}</h3>
                <p className="text-[10px] text-slate-300 font-semibold uppercase mt-0.5">
                  Order Number: #{selectedTable.activeOrder.orderNumber?.split('-').pop()}
                </p>
              </div>
              <button 
                onClick={() => setShowAddItems(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Products (Left 7) and Cart (Right 5) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
              
              {/* Products Catalog (Left) */}
              <div className="md:col-span-7 p-4 flex flex-col gap-4 overflow-y-auto border-r border-slate-100">
                
                {/* Search & Category Selector */}
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search menu items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-sm font-semibold outline-none focus:border-slate-400"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1 rounded-full text-xs font-black whitespace-nowrap transition-colors ${
                        selectedCategory === 'all' 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ALL CATEGORIES
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat._id}
                        onClick={() => setSelectedCategory(cat.name || cat._id)}
                        className={`px-3 py-1 rounded-full text-xs font-black whitespace-nowrap transition-colors uppercase ${
                          selectedCategory === (cat.name || cat._id)
                            ? 'bg-slate-900 text-white' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {products
                    .filter(p => {
                      const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory || p.category?.name === selectedCategory;
                      return matchesSearch && matchesCat && p.isAvailable;
                    })
                    .map(product => (
                      <div 
                        key={product._id}
                        onClick={() => addToCart(product)}
                        className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg hover:border-slate-950 cursor-pointer flex flex-col justify-between h-[90px] transition-colors"
                      >
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 leading-tight line-clamp-2">{product.name}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{product.category}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2 border-t border-slate-200/40 pt-1">
                          <span className="font-black text-xs text-slate-900">${product.price.toFixed(2)}</span>
                          <span className="bg-slate-900 text-white p-1 rounded-full">
                            <Plus className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Cart Summary (Right) */}
              <div className="md:col-span-5 p-4 flex flex-col justify-between overflow-y-auto bg-slate-50/50">
                <div className="flex flex-col gap-4">
                  <h4 className="font-black text-sm text-slate-900 border-b border-slate-200 pb-2">Items to Add</h4>
                  
                  {cart.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 font-semibold text-xs">
                      Cart is empty. Click items on the left to add.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                      {cart.map(item => (
                        <div key={item.product} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <span className="font-black text-xs text-slate-900 leading-tight flex-1 pr-2">{item.name}</span>
                            <span className="font-black text-xs text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                            {/* Quantity Controls */}
                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-7 bg-white">
                              <button 
                                onClick={() => updateCartQty(item.product, item.quantity - 1)}
                                className="px-2 hover:bg-slate-100 font-black text-xs text-slate-500"
                              >
                                -
                              </button>
                              <span className="px-2 font-black text-xs text-slate-900 min-w-[20px] text-center">
                                {item.quantity}
                              </span>
                              <button 
                                onClick={() => updateCartQty(item.product, item.quantity + 1)}
                                className="px-2 hover:bg-slate-100 font-black text-xs text-slate-500"
                              >
                                +
                              </button>
                            </div>

                            {/* Item Notes input */}
                            <input
                              type="text"
                              placeholder="Notes (optional)..."
                              value={item.notes}
                              onChange={(e) => updateCartNotes(item.product, e.target.value)}
                              className="text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1 ml-3 font-semibold outline-none focus:border-slate-300"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Panel */}
                <div className="border-t border-slate-200 pt-4 mt-4 bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-xs text-slate-500">Subtotal for additions:</span>
                    <span className="font-black text-sm text-slate-900">
                      ${cart.reduce((total, i) => total + i.price * i.quantity, 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddItemsToOrder(selectedTable.activeOrder)}
                    disabled={cart.length === 0}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-xs font-black tracking-wider shadow-md transition-colors"
                  >
                    CONFIRM ADD TO ORDER
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* RENDER MERGE TABLES MODAL */}
      {showMergeModal && selectedTable?.activeOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-1.5"><GitMerge className="w-5 h-5" /> Merge Table {selectedTable.number || selectedTable.tableNumber}</h3>
              <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <p className="text-xs text-slate-500 font-semibold">
                This will move the active items of **Table {selectedTable.number || selectedTable.tableNumber}** to another table.
                If the destination table is occupied, the items will be combined into a single order. If it is available, the order will simply be transferred and this table will become available.
              </p>

              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Select Destination Table</label>
                <select
                  value={mergeTargetTableId}
                  onChange={(e) => setMergeTargetTableId(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-black text-xs outline-none"
                >
                  <option value="">-- Choose a table --</option>
                  {tables
                    .filter(t => t._id !== selectedTable._id)
                    .map(t => (
                      <option key={t._id} value={t._id}>
                        TBL {t.number || t.tableNumber} ({t.status.toUpperCase()} - {t.location})
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowMergeModal(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-black text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleMergeTables}
                  disabled={!mergeTargetTableId}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black transition-colors"
                >
                  MERGE ORDERS
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RENDER SPLIT TABLES MODAL */}
      {showSplitModal && selectedTable?.activeOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-1.5"><Layers className="w-5 h-5" /> Split Table {selectedTable.number || selectedTable.tableNumber}</h3>
              <button onClick={() => setShowSplitModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
              <p className="text-xs text-slate-500 font-semibold">
                Select the items and quantity to split and move to a free destination table. This will create a new order on that table.
              </p>

              {/* Items Selector */}
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider">Select Quantities to Move</label>
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 border border-slate-100 rounded-lg p-2 bg-slate-50">
                  {selectedTable.activeOrder.items?.map((item) => {
                    const maxQty = item.quantity;
                    const selectedQty = itemsToSplit[item._id] || 0;

                    return (
                      <div key={item._id} className="bg-white p-2 rounded border border-slate-200 flex justify-between items-center">
                        <span className="font-bold text-xs text-slate-800">{item.name || item.product_name} ({maxQty} max)</span>
                        <div className="flex items-center border border-slate-200 rounded overflow-hidden h-7 bg-white">
                          <button 
                            onClick={() => {
                              setItemsToSplit(prev => ({
                                ...prev,
                                [item._id]: Math.max(0, (prev[item._id] || 0) - 1)
                              }));
                            }}
                            className="px-2 hover:bg-slate-100 font-black text-xs text-slate-500"
                          >
                            -
                          </button>
                          <span className="px-2.5 font-black text-xs text-slate-900 min-w-[20px] text-center">
                            {selectedQty}
                          </span>
                          <button 
                            onClick={() => {
                              setItemsToSplit(prev => ({
                                ...prev,
                                [item._id]: Math.min(maxQty, (prev[item._id] || 0) + 1)
                              }));
                            }}
                            className="px-2 hover:bg-slate-100 font-black text-xs text-slate-500"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Destination Table Selection */}
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Select Target Free Table</label>
                <select
                  value={splitTargetTableId}
                  onChange={(e) => setSplitTargetTableId(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-black text-xs outline-none"
                >
                  <option value="">-- Choose a table --</option>
                  {tables
                    .filter(t => t._id !== selectedTable._id && t.status === 'available')
                    .map(t => (
                      <option key={t._id} value={t._id}>
                        TBL {t.number || t.tableNumber} ({t.location})
                      </option>
                    ))
                  }
                </select>
                <span className="text-[9px] text-slate-400 block mt-1 font-semibold uppercase">Destination table must be completely AVAILABLE.</span>
              </div>

              {/* Confirm Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowSplitModal(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-black text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSplitTables}
                  disabled={!splitTargetTableId || !Object.values(itemsToSplit).some(qty => qty > 0)}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black transition-colors"
                >
                  SPLIT ORDER
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default WaiterDashboard;
