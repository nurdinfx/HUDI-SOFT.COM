import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { realApi } from '../api/realApi';
import { API_CONFIG } from '../config/api.config';
import { printToIframe, shouldAutoPrintAfterPayment } from '../utils/print';

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
  ShoppingCart,
} from 'lucide-react';
import Sidebar from '../components/Layout/Sidebar';
import Header from '../components/Layout/Header';
import OrderCart from '../components/POS/OrderCart';
import './pos.css'; // Reuse POS CSS for layout

const SalesMenu = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const updateOrderId = searchParams.get('updateOrderId');

  // Initialize state from cache for "Zero Wait" experience
  const [products, setProducts] = useState(() => getCache('sales_products', []));
  const [categories, setCategories] = useState(() => getCache('sales_categories', ['All']));
  const [tables, setTables] = useState(() => getCache('sales_tables', [])); // Maybe unused in retail but keeping for compatibility
  const [customers, setCustomers] = useState(() => getCache('sales_customers', []));
  const [users, setUsers] = useState(() => getCache('sales_users', []));
  const [settings, setSettings] = useState(() => getCache('sales_settings', null));

  const [selectedCategory, setSelectedCategory] = useState(() => getCache('sales_selectedCategory', 'All'));
  const [cart, setCart] = useState(() => getCache('sales_cart', []));
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState(() => getCache('sales_selectedTable', null));
  const [selectedCustomer, setSelectedCustomer] = useState(() => getCache('sales_selectedCustomer', null));
  // Default to sale instead of dine-in
  const [orderType, setOrderType] = useState(() => getCache('sales_orderType', 'sale'));
  const [paymentMethod, setPaymentMethod] = useState(() => getCache('sales_paymentMethod', 'cash'));
  const [searchQuery, setSearchQuery] = useState(() => getCache('sales_searchQuery', ''));

  // Financial State
  const [discount, setDiscount] = useState(() => getCache('sales_discount', 0));
  const [vatPercentage, setVatPercentage] = useState(4);
  const [vatEnabled, setVatEnabled] = useState(() => getCache('sales_vatEnabled', true));
  const [tipAmount, setTipAmount] = useState(() => getCache('sales_tipAmount', 0));
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [originalItems, setOriginalItems] = useState([]); // Track items for delta printing
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isCartVisible, setIsCartVisible] = useState(true);
  const [cartWidth, setCartWidth] = useState(() => getCache('sales_cartWidth', 480));
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
        setCache('sales_cartWidth', newWidth);
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
  useEffect(() => { setCache('sales_cart', cart); }, [cart]);
  useEffect(() => { setCache('sales_searchQuery', searchQuery); }, [searchQuery]);
  useEffect(() => { setCache('sales_selectedCategory', selectedCategory); }, [selectedCategory]);
  useEffect(() => { setCache('sales_selectedTable', selectedTable); }, [selectedTable]);
  useEffect(() => { setCache('sales_selectedCustomer', selectedCustomer); }, [selectedCustomer]);
  useEffect(() => { setCache('sales_orderType', orderType); }, [orderType]);
  useEffect(() => { setCache('sales_paymentMethod', paymentMethod); }, [paymentMethod]);
  useEffect(() => { setCache('sales_discount', discount); }, [discount]);
  useEffect(() => { setCache('sales_tipAmount', tipAmount); }, [tipAmount]);
  useEffect(() => { if (vatPercentage) setCache('sales_vatPercentage', vatPercentage); }, [vatPercentage]);
  useEffect(() => { setCache('sales_vatEnabled', vatEnabled); }, [vatEnabled]);

  const [hasFetchedOrder, setHasFetchedOrder] = useState(false);

  // Load existing order if in Update Mode
  useEffect(() => {
    if (updateOrderId && !hasFetchedOrder) {
      const fetchOrder = async () => {
        try {
          let response = await realApi.getOrder(updateOrderId);
          
          if (!response || !response.success) {
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
            const rawData = response.data;
            const order = (rawData && rawData._id) ? rawData : (rawData?.data || rawData);
            
            if (!order) throw new Error("Order data is null");

            setUpdatingOrder(order);
            
            const itemsArray = order.items || (Array.isArray(order) ? order : []);
            
            const mappedCart = itemsArray.map(item => ({
              _id: item.product?._id || item.product || item._id || `legacy_${Date.now()}_${Math.random()}`,
              name: item.product_name || item.productName || item.name || item.product?.name || 'Unknown Item',
              price: item.price || 0,
              quantity: item.quantity || 1,
              image: item.product?.image || ''
            }));
            
            setCart(mappedCart);
            setOriginalItems(JSON.parse(JSON.stringify(mappedCart)));

            setOrderType(order.orderType || 'sale');
            setDiscount(order.discountPercentage || 0);
            
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
          }
        } catch (err) { 
          console.error('Error loading order for update:', err); 
        } finally {
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
        setCache('sales_products', data);
      }
    }).finally(() => setLoading(false));

    realApi.getCategories().then(response => {
      if (response.success) {
        const data = realApi.extractData(response) || [];
        const catArray = Array.isArray(data) ? data : [];
        // Use 'All' + backend categories (which now include real-world defaults)
        const cats = ['All', ...catArray.filter(c => c && c.trim())];
        setCategories([...new Set(cats)]);
        setCache('sales_categories', cats);
      }
    });

    realApi.getTables().then(response => {
      if (response.success) {
        const data = realApi.extractData(response) || [];
        setTables(data);
        setCache('sales_tables', data);
      }
    });

    realApi.getCustomers().then(response => {
      if (response.success) {
        const data = realApi.extractData(response) || [];
        setCustomers(data);
        setCache('sales_customers', data);
      }
    });

    realApi.getUsers().then(response => {
      if (response.success) {
        const data = realApi.extractData(response) || [];
        setUsers(data);
        setCache('sales_users', data);
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
          setCache('sales_settings', data);
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
    if (cart.length === 0) return alert('Cart is empty');
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
        orderType: 'sale',
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
        status: updateOrderId ? (updatingOrder?.status ?? 'completed') : 'completed', // Auto-complete for sales
        paymentStatus: updateOrderId ? (updatingOrder?.paymentStatus ?? 'paid') : 'paid',
        cashier: orderDetails.servedBy || user?._id
      };

      let response;
      if (updateOrderId) {
        response = await realApi.updateOrder(updateOrderId, orderPayload);
        if (await shouldAutoPrintAfterPayment(settings?.printReceipt)) {
          printReceipt(response.data || orderPayload, cart, { servedBy: orderPayload.servedBy, vatEnabled });
        }
      } else {
        response = await realApi.createOrder(orderPayload);
        if (await shouldAutoPrintAfterPayment(settings?.printReceipt)) {
          printReceipt(response.data || orderPayload, cart, { servedBy: orderPayload.servedBy, vatEnabled });
        }
      }

      if (response.success) {
        clearCart();
        alert(updateOrderId ? 'Sale Updated!' : 'Sale Completed!');
        if (updateOrderId) navigate('/sales');
      }
    } catch (err) {
      alert('Error: ' + err.message);
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


  const printReceipt = async (order, items, overrides) => {
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

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const originalOrderDate = order.orderDate ? new Date(order.orderDate) : now;
    const originalFormattedDate = `${String(originalOrderDate.getDate()).padStart(2, '0')}/${String(originalOrderDate.getMonth() + 1).padStart(2, '0')}/${originalOrderDate.getFullYear()} ${String(originalOrderDate.getHours()).padStart(2, '0')}:${String(originalOrderDate.getMinutes()).padStart(2, '0')}`;

    const restaurantName = currentSettings?.restaurantName || 'HUDI-SOFT';
    const receiptNumber = (order.orderNumber || '').split('-').pop() || Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Find the actual user name for served by
    let serverName = order.cashier?.name || order.user?.name || 'System';
    const serverId = overrides?.servedBy || order.cashier?._id || order.cashier || order.servedBy?._id || order.servedBy;
    if (serverId) {
        const servedByUser = users.find(u => String(u._id) === String(serverId));
        if (servedByUser) serverName = servedByUser.name;
    }

    const vatRate = parseFloat(currentSettings?.taxRate ?? 10) / 100;
    const zaad = currentSettings?.zaad || '';
    const sahal = currentSettings?.sahal || '';
    const edahab = currentSettings?.edahab || '';
    const myCash = currentSettings?.myCash || '';
    const receiptFooter = currentSettings?.receiptFooter || 'Thank you for your purchase!';

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
    let itemsSubtotal = 0;
    if (items && items.length > 0) {
      itemsSubtotal = items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)), 0);
    }

    const isVatDisabled = overrides?.vatEnabled === false;
    const taxAmount = isVatDisabled ? 0 : itemsSubtotal * vatRate;
    const finalTotal = itemsSubtotal + taxAmount;
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
            
            .footer { text-align: center; font-size: 11px; margin-top: 10px; }
            .powered-by { font-size: 9px; color: #666; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoHtml}
            <div class="restaurant-name">${restaurantName}</div>
            <div style="font-size: 11px;">${settings?.receiptHeader || ''}</div>
            ${(paymentRow1 || paymentRow2) ? `<div class="phones">${paymentRow1}${paymentRow1 && paymentRow2 ? '<br>' : ''}${paymentRow2}</div>` : ''}
          </div>
          
          ${updateOrderId ? `<div style="text-align: center; font-weight: 700; color: #C2410C; margin: 5px 0; border: 1px dashed #C2410C; padding: 3px;">*** UPDATED SALE ***</div>` : ''}
          
          <div class="info-section">
            <div class="info-row"><span class="info-label">Receipt No:</span><span>#${receiptNumber}</span></div>
            <div class="info-row"><span class="info-label">Served By:</span><span>${serverName}</span></div>
            <div class="info-row"><span class="info-label">Customer:</span><span>${order.customer?.name || order.customerName || selectedCustomer?.name || 'Walking Customer'}</span></div>
            <div class="info-row"><span class="info-label">Date:</span><span>${updateOrderId ? originalFormattedDate : formattedDate}</span></div>
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
              ${items.map(item => {
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
              }).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row"><span class="info-label">Subtotal</span><span>$${itemsSubtotal.toFixed(2)}</span></div>
            <div class="total-row"><span class="info-label">VAT @ ${vatPercent}%</span><span>$${taxAmount.toFixed(2)}</span></div>
            <div class="total-row grand-total"><span>TOTAL</span><span>$${finalTotal.toFixed(2)}</span></div>
          </div>
          
          <div class="footer">
            <div>${receiptFooter}</div>
            <div class="powered-by">POWERED BY HUDI-SOFT</div>
            <div style="display: flex; justify-content: center; margin-top: 10px; margin-bottom: 5px;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`Order: ${order.orderNumber || order._id || ''}\nTotal: $${finalTotal.toFixed(2)}\nDate: ${updateOrderId ? originalFormattedDate : formattedDate}`)}" alt="QR Code" style="width: 100px; height: 100px;" />
            </div>
          </div>
          <div style="height: 120px;"></div>

        </body>
      </html>
    `;

    printToIframe(receiptContent, {
      jobType: 'customerReceipt',
      orderNumber: order.orderNumber,
      orderId: order._id,
      paperWidth: currentSettings?.receiptSize || '80mm',
    });
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
              onClick={() => navigate('/sales')} 
              className="bg-[#2a62a3] hover:bg-[#3474bd] text-white px-6 py-1 rounded text-xs border border-[#4a85c5] font-bold shadow-sm transition-all"
            >
              Sales History
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
        <span>Sales Module</span>
        <span>Sales Menu</span>
        <span>Ready</span>
      </div>
    </div>
  );
};

export default SalesMenu;
