import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { realApi } from '../api/realApi';
import { API_CONFIG } from '../config/api.config';
import { printToIframe } from '../utils/print';
import { printBluetooth, connectBluetoothPrinter, isBluetoothConnected } from '../utils/bluetoothPrint';
import { toast } from 'react-hot-toast';

const getCache = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) { return fallback; }
};

const setCache = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
};

import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  ShoppingCart,
  Printer,
  User,
  Table,
  Percent,
  Tag,
  Clock,
  Calendar,
} from 'lucide-react';
import Sidebar from '../components/Layout/Sidebar';
import Header from '../components/Layout/Header';
import OrderCart from '../components/POS/OrderCart';
import './pos.css';

const POS = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const updateOrderId = searchParams.get('updateOrderId');

  // Initialize state from cache for "Zero Wait" experience
  const [products, setProducts] = useState(() => getCache('pos_products', []));
  const [categories, setCategories] = useState(() => getCache('pos_categories', ['All']));
  const [tables, setTables] = useState(() => getCache('pos_tables', []));
  const [customers, setCustomers] = useState(() => getCache('pos_customers', []));
  const [users, setUsers] = useState(() => getCache('pos_users', []));
  const [settings, setSettings] = useState(() => getCache('pos_settings', null));

  const [selectedCategory, setSelectedCategory] = useState(() => getCache('pos_selectedCategory', 'All'));
  const [cart, setCart] = useState(() => getCache('pos_cart', []));
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState(() => getCache('pos_selectedTable', null));
  const [selectedCustomer, setSelectedCustomer] = useState(() => getCache('pos_selectedCustomer', null));
  const [orderType, setOrderType] = useState(() => getCache('pos_orderType', 'dine-in'));
  const [paymentMethod, setPaymentMethod] = useState(() => getCache('pos_paymentMethod', 'cash'));
  const [searchQuery, setSearchQuery] = useState(() => getCache('pos_searchQuery', ''));

  // Financial State
  const [discount, setDiscount] = useState(() => getCache('pos_discount', 0));
  const [vatPercentage, setVatPercentage] = useState(4);
  const [vatEnabled, setVatEnabled] = useState(() => getCache('pos_vatEnabled', true));
  const [tipAmount, setTipAmount] = useState(() => getCache('pos_tipAmount', 0));
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [originalItems, setOriginalItems] = useState([]); // Track items for delta printing
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isCartVisible, setIsCartVisible] = useState(true);
  const [cartWidth, setCartWidth] = useState(() => getCache('pos_cartWidth', 480));
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => setIsResizing(false);

  const resize = (e) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 350 && newWidth < 800) {
        setCartWidth(newWidth);
        setCache('pos_cartWidth', newWidth);
      }
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  const { user } = useAuth();

  // Real-time date and time
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadPOSData();
    loadSettings();
  }, []);

  // Persist state changes to localStorage
  useEffect(() => { setCache('pos_cart', cart); }, [cart]);
  useEffect(() => { setCache('pos_searchQuery', searchQuery); }, [searchQuery]);
  useEffect(() => { setCache('pos_selectedCategory', selectedCategory); }, [selectedCategory]);
  useEffect(() => { setCache('pos_selectedTable', selectedTable); }, [selectedTable]);
  useEffect(() => { setCache('pos_selectedCustomer', selectedCustomer); }, [selectedCustomer]);
  useEffect(() => { setCache('pos_orderType', orderType); }, [orderType]);
  useEffect(() => { setCache('pos_paymentMethod', paymentMethod); }, [paymentMethod]);
  useEffect(() => { setCache('pos_discount', discount); }, [discount]);
  useEffect(() => { setCache('pos_tipAmount', tipAmount); }, [tipAmount]);
  useEffect(() => { if (vatPercentage) setCache('pos_vatPercentage', vatPercentage); }, [vatPercentage]);
  useEffect(() => { setCache('pos_vatEnabled', vatEnabled); }, [vatEnabled]);

  const [hasFetchedOrder, setHasFetchedOrder] = useState(false);

  // Load existing order if in Update Mode
  useEffect(() => {
    if (updateOrderId && !hasFetchedOrder) {
      const fetchOrder = async () => {
        try {
          let response = await realApi.getOrder(updateOrderId);
          
          // FALLBACK: If GET /orders/:id is returning 404 because backend hasn't been deployed yet
          if (!response || !response.success) {
             console.warn("getOrder API failed or not found, using fallback getOrders...");
             const allOrdersRes = await realApi.getOrders({ limit: 1000 });
             if (allOrdersRes && allOrdersRes.success) {
                 const orders = realApi.extractData(allOrdersRes) || [];
                 const foundOrder = orders.find(o => String(o._id) === String(updateOrderId));
                 if (foundOrder) {
                     response = { success: true, data: foundOrder };
                 }
             }
          }

          if (response && response.success) {
            // Robust data extraction: ensure we have an object with an items array
            const rawData = response.data;
            const order = (rawData && rawData._id) ? rawData : (rawData?.data || rawData);
            
            if (!order) throw new Error("Order data is null");

            setUpdatingOrder(order);
            
            // Handle cases where order might be just the items array, or have an items array
            const itemsArray = order.items || (Array.isArray(order) ? order : []);
            
            // Map items to cart safely
            const mappedCart = itemsArray.map(item => ({
              _id: item.product?._id || item.product || item._id || `legacy_${Date.now()}_${Math.random()}`,
              name: item.product_name || item.productName || item.name || item.product?.name || 'Unknown Item',
              price: item.price || 0,
              quantity: item.quantity || 1,
              image: item.product?.image || ''
            }));
            
            setCart(mappedCart);
            setOriginalItems(JSON.parse(JSON.stringify(mappedCart))); // Save deep copy for delta calculation

            // Set metadata safely
            setOrderType(order.orderType || 'dine-in');
            setDiscount(order.discountPercentage || 0);
            
            // Properly handle VAT toggling state
            const isVatDisabled = order.taxAmount === 0 || order.tax === 0;
            setVatEnabled(!isVatDisabled);
            
            if (order.tableNumber || order.tableId || order.table) {
               const tableVal = order.tableNumber || order.tableId || order.table;
               const table = tables.find(t => String(t.number) === String(tableVal) || String(t._id) === String(tableVal));
               if (table) setSelectedTable(table);
            }
            if (order.customer || order.customerId) {
               const custVal = order.customer?._id || order.customer || order.customerId;
               const customer = customers.find(c => String(c._id) === String(custVal));
               if (customer) setSelectedCustomer(customer);
            }
          } else {
             console.error('Failed to load order:', response?.message);
          }
        } catch (err) { 
          console.error('Error loading order for update:', err); 
        } finally {
          // Always set to true to prevent infinite loading loops
          setHasFetchedOrder(true);
        }
      };
      fetchOrder();
    }
  }, [updateOrderId, hasFetchedOrder, tables, customers]);

  const loadPOSData = async () => {
    if (products.length === 0) setLoading(true);

    realApi.getProducts().then(response => {
      if (response.success) {
        const extracted = realApi.extractData(response) || [];
        // Handle both array and object with products key
        const data = Array.isArray(extracted) ? extracted : (extracted.products || []);
        setProducts(data);
        setCache('pos_products', data);
      }
    }).finally(() => setLoading(false));

    realApi.getCategories().then(response => {
      if (response.success) {
        const data = realApi.extractData(response) || [];
        const catArray = Array.isArray(data) ? data : [];
        // Use 'All' + backend categories (which now include real-world defaults)
        const cats = ['All', ...catArray.filter(c => c && c.trim())];
        setCategories([...new Set(cats)]);
        setCache('pos_categories', cats);
      }
    });

    realApi.getTables().then(response => {
      if (response.success) {
        const data = realApi.extractData(response) || [];
        setTables(data);
        setCache('pos_tables', data);
      }
    });

    realApi.getCustomers().then(response => {
      if (response.success) {
        const data = realApi.extractData(response) || [];
        setCustomers(data);
        setCache('pos_customers', data);
      }
    });

    realApi.getUsers().then(response => {
      if (response.success) {
        const data = realApi.extractData(response) || [];
        setUsers(data);
        setCache('pos_users', data);
      }
    });
  };

  const loadSettings = async () => {
    try {
      const response = await realApi.getSettings();
      if (response.success) {
        const data = realApi.extractData(response);
        if (data) {
          setSettings(data);
          setCache('pos_settings', data);
        }
      }
    } catch (e) {}
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, q) => {
    if (q < 1) return removeFromCart(id);
    setCart(prev => prev.map(item => item._id === id ? { ...item, quantity: q } : item));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item._id !== id));

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const currentVatRate = settings?.taxRate !== undefined ? settings.taxRate / 100 : (vatPercentage / 100);
    const vatAmount = vatEnabled ? subtotal * currentVatRate : 0;
    const total = subtotal + vatAmount - discount + tipAmount;
    return { subtotal, vatAmount, discountAmount: discount, tip: tipAmount, total };
  };

  const { subtotal, vatAmount, total } = calculateTotals();

  const handleSubmitOrder = async (orderDetails = {}) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setLoading(true);

    try {
      const orderPayload = {
        items: cart.map(item => ({
          product: item._id,
          quantity: item.quantity,
          price: item.price,
          product_name: item.name,
          total: item.price * item.quantity
        })),
        orderType,
        paymentMethod,
        tableId: selectedTable?._id,
        tableNumber: selectedTable?.number,
        customerId: selectedCustomer?._id,
        subtotal,
        taxAmount: vatAmount,
        tax: vatAmount,
        discount: discount,
        tip: tipAmount,
        finalTotal: total,
        status: updateOrderId ? (updatingOrder?.status ?? 'pending') : 'pending',
        paymentStatus: updateOrderId ? (updatingOrder?.paymentStatus ?? 'pending') : 'pending',
        servedBy: orderDetails.servedBy || user?._id
      };

      let response;
      if (updateOrderId) {
        response = await realApi.updateOrder(updateOrderId, orderPayload);
        
        // Calculate ONLY NEW items for kitchen receipt
        const newItems = cart.filter(item => {
          const original = originalItems.find(oi => String(oi._id) === String(item._id));
          if (!original) return true; // Truly new item
          return item.quantity > original.quantity; // Quantity increased
        }).map(item => {
          const original = originalItems.find(oi => String(oi._id) === String(item._id));
          const diffQuantity = original ? item.quantity - original.quantity : item.quantity;
          return { ...item, quantity: diffQuantity };
        });

        if (newItems.length > 0) {
          printKitchenReceipt(response.data || orderPayload, newItems);
        }
      } else {
        response = await realApi.createOrder(orderPayload);
        // For new orders, we print the regular customer receipt
        printReceipt(response.data || orderPayload, cart, { servedBy: orderPayload.servedBy, vatEnabled });
      }

      if (response.success) {
        clearCart();
        toast.success(updateOrderId ? 'Order Updated!' : 'Order Placed!');
        if (updateOrderId) navigate('/orders');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setSelectedTable(null);
    setSelectedCustomer(null);
    setDiscount(0);
    setTipAmount(0);
  };


  const printKitchenReceipt = (order, items) => {
    if (items.length === 0) return;

    let serverName = user?.name || 'System';
    const serverId = order.servedBy?._id || order.servedBy;
    if (serverId) {
        const servedByUser = users.find(u => String(u._id) === String(serverId));
        if (servedByUser) serverName = servedByUser.name;
    }

    const receiptWidth = settings?.receiptSize === 'A4' ? '210mm' : (settings?.receiptSize || '80mm');
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const content = `
      <html>
        <head>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Inter', 'Arial', sans-serif; 
              width: ${receiptWidth}; 
              margin: 0 auto;
              padding: 5mm;
              font-size: 14px;
              color: #000;
            }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
            .order-title { font-size: 18px; font-weight: bold; }
            .info-row { display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .items-table th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; }
            .items-table td { padding: 8px 0; border-bottom: 1px dashed #ccc; font-size: 16px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px solid #000; padding-top: 5px; }
            .cut-spacer { height: 120px; } /* Space for manual tearing */
          </style>
        </head>
        <body>
          <div class="header">
            <div class="order-title">KITCHEN ORDER (UPDATE)</div>
            <div style="font-size: 12px;">#${(order.orderNumber || 'New').split('-').pop()}</div>
          </div>

          <div class="info-row">
            <span>Table: ${order.tableNumber || order.tableId || 'N/A'}</span>
            <span>Type: ${order.orderType || 'Dine-in'}</span>
          </div>
          
          <div class="info-row">
            <span>Server: ${serverName}</span>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th style="text-align: right;">QTY</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td>${i.name}</td>
                  <td style="text-align: right;">${i.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            ${formattedDate} - POWERED BY HUDI-SOFT
          </div>
          <div class="cut-spacer"></div>
        </body>
      </html>
    `;
    // If Bluetooth is connected, we print DIRECTLY and SKIP the browser preview
    if (isBluetoothConnected()) {
      try {
        const kitchenText = `KITCHEN UPDATE\nTable: ${order.tableNumber || 'N/A'}\n` +
                            items.map(i => `${i.name} x${i.quantity}`).join('\n') + '\n\n\n\n';
        printBluetooth(kitchenText);
        return; // STOP HERE - No browser preview!
      } catch (e) {
        console.log('BT failed, falling back to browser');
      }
    }

    printToIframe(content);
  };


  const printReceipt = async (order, items, overrides) => {
    let serverName = user?.name || 'System';
    const serverId = overrides?.servedBy || order.servedBy?._id || order.servedBy;
    if (serverId) {
        const servedByUser = users.find(u => String(u._id) === String(serverId));
        if (servedByUser) serverName = servedByUser.name;
    }

    // Always fetch the latest settings so payment accounts are current
    let currentSettings = settings;
    try {
      const resp = await realApi.getSettings();
      if (resp && resp.success) {
        currentSettings = realApi.extractData(resp);
        setSettings(currentSettings);
      }
    } catch (e) {
      console.warn('Could not fetch latest settings for print:', e);
    }

    const receiptWidth = currentSettings?.receiptSize === 'A4' ? '210mm' : (currentSettings?.receiptSize || '80mm');
    
    // Fix breaking logo by using absolute URL
    let absoluteLogoUrl = currentSettings?.logoUrl || currentSettings?.logo || '';
    if (absoluteLogoUrl && !absoluteLogoUrl.startsWith('http')) {
      absoluteLogoUrl = `${API_CONFIG.BACKEND_URL}${absoluteLogoUrl.startsWith('/') ? '' : '/'}${absoluteLogoUrl}`;
    }
    
    const logoHtml = absoluteLogoUrl 
      ? `<img src="${absoluteLogoUrl}" style="max-width: 150px; max-height: 80px; margin-bottom: 10px;" onerror="this.style.display='none'" />` 
      : '';
    
    const zaad = currentSettings?.zaad || '';
    const sahal = currentSettings?.sahal || '';
    const edahab = currentSettings?.edahab || '';
    const myCash = currentSettings?.myCash || '';
    const paymentLines = [
      zaad ? `ZAAD: ${zaad}` : '',
      sahal ? `SAHAL: ${sahal}` : '',
      edahab ? `E-DAHAB: ${edahab}` : '',
      myCash ? `MyCash: ${myCash}` : ''
    ].filter(Boolean);
    const paymentRow1 = paymentLines.slice(0, 2).join(' - ');
    const paymentRow2 = paymentLines.slice(2).join(' - ');

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const content = `
      <html>
        <head>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Inter', 'Arial', sans-serif; 
              width: ${receiptWidth}; 
              margin: 0 auto;
              padding: 2mm;
              font-size: 13px;
              color: #000;
              line-height: 1.2;
            }
            .header { text-align: center; margin-bottom: 10px; }
            .restaurant-name { font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 5px 0; }
            .phones { font-size: 11px; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
            .receipt-info { margin-bottom: 10px; font-size: 12px; }
            .info-row { display: flex; justify-content: space-between; margin: 2px 0; }
            .dashed-line { border-top: 1px dashed #000; margin: 8px 0; }
            .items-table { width: 100%; border-collapse: collapse; }
            .items-table th { text-align: left; border-bottom: 1px solid #000; padding: 4px 0; font-size: 12px; }
            .items-table td { padding: 4px 0; vertical-align: top; }
            .totals { margin-top: 8px; }
            .total-row { display: flex; justify-content: space-between; margin: 2px 0; }
            .grand-total { font-size: 16px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
            .footer { text-align: center; margin-top: 15px; font-size: 11px; }
            .cut-spacer { height: 120px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoHtml}
            <div class="restaurant-name">${currentSettings?.restaurantName || 'Mama Africa Restaurant'}</div>
            <div style="font-size: 11px;">${currentSettings?.receiptHeader || ''}</div>
            <div style="font-size: 11px;">${currentSettings?.address || ''}</div>
            <div style="font-size: 11px;">Tel: ${currentSettings?.phone || ''}</div>
            ${(paymentRow1 || paymentRow2) ? `<div class="phones" style="margin-top: 5px;">${paymentRow1}${paymentRow1 && paymentRow2 ? '<br>' : ''}${paymentRow2}</div>` : ''}
          </div>

          <div class="receipt-info">
            <div class="info-row"><span>Receipt No:</span> <span>#${(order.orderNumber || 'New').split('-').pop()}</span></div>
            <div class="info-row"><span>Date:</span> <span>${formattedDate}</span></div>
            <div class="info-row"><span>Served By:</span> <span>${serverName}</span></div>
            ${order.tableNumber ? `<div class="info-row"><span>Table:</span> <span>${order.tableNumber}</span></div>` : ''}
          </div>

          <div class="dashed-line"></div>

          <table class="items-table">
            <thead>
              <tr>
                <th>PRODUCT NAME</th>
                <th style="text-align: center;">QTY</th>
                <th style="text-align: right;">PRICE</th>
                <th style="text-align: right;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => {
                const itemName = i.product_name || i.productName || i.name || i.itemName || (i.product && typeof i.product === 'object' ? i.product.name : '') || 'Item';
                return `
                  <tr>
                    <td>${itemName}</td>
                    <td style="text-align: center;">${i.quantity}</td>
                    <td style="text-align: right;">${(i.price || 0).toFixed(2)}</td>
                    <td style="text-align: right;">${((i.price || 0) * i.quantity).toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

            <div class="dashed-line"></div>
            <!-- Totals removed per user request -->

          <div class="footer">
            ${settings?.receiptFooter || 'Thank you for dining with us!'}
            <div style="margin-top: 10px; font-size: 9px; color: #666;">POWERED BY HUDI-SOFT</div>
          </div>
          <div class="cut-spacer"></div>
        </body>
      </html>
    `;
    // If Bluetooth is connected, we print DIRECTLY and SKIP the browser preview
    if (isBluetoothConnected()) {
      try {
        const btText = `${settings?.restaurantName || 'MAMA AFRICA'}\n` +
                     `Table: ${order.tableNumber || 'N/A'}\n` +
                     `Total: $${total.toFixed(2)}\n\n\n\n`;
        printBluetooth(btText);
        return; // STOP HERE - No browser preview!
      } catch (e) {
        console.log('BT failed, falling back to browser');
      }
    }

    printToIframe(content);
  };

  const formatTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="pos-page-wrapper h-[100dvh] overflow-hidden flex flex-col relative">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}>
        <div className="flex items-center justify-between w-full gap-4">
          <div className="hidden md:flex items-center gap-6 text-[11px] font-bold">
            <div className="flex items-center gap-1">
              <span className="text-blue-200">Vat :</span>
              <span>{vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-200">Total (Local Currency) :</span>
              <span>{(total * 12000).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-200">Sub-Total (USD) :</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-200">Total (USD) :</span>
              <span>{total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="md:hidden flex items-center gap-2 text-[12px] font-bold">
             <span className="text-blue-200">Total:</span>
             <span className="text-white">${total.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCartVisible(!isCartVisible)} 
              className="bg-[#2a62a3] hover:bg-[#3474bd] text-white px-3 py-1 rounded text-xs border border-[#4a85c5] font-bold shadow-sm transition-all flex items-center gap-1"
              title="Toggle Cart"
            >
              <ShoppingCart size={14} />
              <span className="hidden sm:inline">{isCartVisible ? 'Hide Cart' : 'Show Cart'}</span>
            </button>

            <button 
              onClick={() => navigate('/orders')} 
              className="bg-[#2a62a3] hover:bg-[#3474bd] text-white px-6 py-1 rounded text-xs border border-[#4a85c5] font-bold shadow-sm transition-all"
            >
              Orders
            </button>
            
            <button 
              onClick={async () => {
                try {
                  const device = await connectBluetoothPrinter();
                  toast.success(`Paired with ${device.name}`);
                } catch (e) {
                  toast.error('Bluetooth Pairing Failed');
                }
              }} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs border border-blue-400 font-bold shadow-sm transition-all flex items-center gap-1"
              title="Pair Bluetooth Printer"
            >
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse"></span>
                BT Pair
              </div>
            </button>

            <div className="relative group">
              <Search size={14} className="absolute left-2 top-1.5 text-blue-200 group-focus-within:text-white transition-colors" />
              <input 
                type="text" 
                placeholder="Barcode" 
                className="bg-[#163a63] border border-[#4a85c5] rounded pl-8 pr-2 py-1 text-xs w-40 outline-none focus:ring-1 focus:ring-blue-400 text-white placeholder-blue-300/50"
              />
            </div>
          </div>
        </div>
      </Header>

      {/* POS Search Area (Grey Bar) */}
      <div className="bg-[#e9ecef] border-b border-gray-300 px-4 py-2 shrink-0">
        <div className="relative flex items-center bg-white border border-gray-300 rounded shadow-sm">
          <Search size={16} className="absolute left-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by Name or Barcode" 
            className="w-full pl-10 pr-4 py-2 text-sm outline-none bg-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      {/* Categories Row */}
      <div className="pos-categories-image-style">
        {categories.map(c => (
          <button 
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`cat-btn-image-style ${selectedCategory === c ? 'active' : ''}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* View Tabs */}
      <div className="pos-view-tabs-image-style">
        <span className="text-blue-800 border-b-2 border-blue-800 pb-1">Thumbnail View</span>
        <span className="text-gray-500">List View</span>
      </div>

      {/* Main Grid */}
      <div className="pos-main-grid">
        <div className="product-section">
          <div className="product-grid-image-style no-scrollbar">
            {filteredProducts.map(p => (
              <div 
                key={p._id}
                onClick={() => addToCart(p)}
                className="product-card-image-style"
              >
                <div className="product-name-image-style">
                  {p.name} - {p.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Cart */}
        {isMobileCartOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileCartOpen(false)} 
          />
        )}
        
        {/* Resizer Handle */}
        {isCartVisible && (
          <div 
            className="hidden md:block w-1.5 hover:w-2 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-all shrink-0 active:bg-blue-600" 
            onMouseDown={startResizing}
          />
        )}

        <div 
          className={`cart-panel ${isMobileCartOpen ? 'mobile-open' : ''} ${!isCartVisible ? 'md:hidden' : ''}`}
          style={{ width: isCartVisible ? `${cartWidth}px` : '0px' }}
        >
          <OrderCart
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            totals={calculateTotals()}
            orderType={orderType}
            onOrderTypeChange={setOrderType}
            tableNumber={selectedTable}
            onTableNumberChange={setSelectedTable}
            onPlaceOrder={(details) => {
               handleSubmitOrder(details);
               setIsMobileCartOpen(false);
            }}
            onClearCart={() => {
               clearCart();
               setIsMobileCartOpen(false);
            }}
            vatEnabled={vatEnabled}
            setVatEnabled={setVatEnabled}
            users={users}
            customers={customers}
            tables={tables}
            onCustomerChange={(c) => setSelectedCustomer(c)}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            updatingOrderId={updateOrderId}
            settings={settings}
            onCloseMobileCart={() => setIsMobileCartOpen(false)}
          />
        </div>
      </div>

      {/* Floating Mobile Cart Button */}
      <button 
        className="md:hidden fixed bottom-14 right-4 bg-[#2a62a3] hover:bg-[#3474bd] text-white rounded-full p-4 shadow-[0_8px_30px_rgb(0,0,0,0.3)] z-30 flex items-center gap-2 border-2 border-white transition-transform active:scale-95"
        onClick={() => setIsMobileCartOpen(true)}
      >
        <ShoppingCart size={24} />
        {cart.length > 0 && (
           <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
             {cart.reduce((sum, item) => sum + item.quantity, 0)}
           </span>
        )}
      </button>

      {/* Status Bar */}
      <div className="pos-status-bar">
        <span>Database:Sqlite</span>
        <span>New SMS: 0</span>
        <span>SMS: 0</span>
      </div>
    </div>
  );
};



export default POS;