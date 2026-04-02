import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { realApi } from '../api/realApi';
import { API_CONFIG } from '../config/api.config';

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
import OrderCart from '../components/POS/OrderCart';

const POS = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const updateOrderId = searchParams.get('updateOrderId');

  // Initialize state from cache for "Zero Wait" experience
  const [products, setProducts] = useState(() => getCache('pos_products', []));
  const [categories, setCategories] = useState(() => getCache('pos_categories', ['BREAKFAST & SNACKS', 'LUNCH', 'DINNER', 'DRINKS', 'OTHERS']));
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

  // Load existing order if in Update Mode
  useEffect(() => {
    if (updateOrderId && tables.length > 0) {
      const fetchOrder = async () => {
        try {
          const response = await realApi.getOrder(updateOrderId);
          if (response.success) {
            const order = realApi.extractData(response);
            setUpdatingOrder(order);
            
            // Map items to cart
            const mappedCart = order.items.map(item => ({
              _id: item.product?._id || item.product || `legacy_${Date.now()}`,
              name: item.name || item.product?.name || 'Item',
              price: item.price,
              quantity: item.quantity,
              image: item.product?.image || ''
            }));
            setCart(mappedCart);

            // Set metadata
            setOrderType(order.orderType || 'dine-in');
            setDiscount(order.discountPercentage || 0);
            setVatEnabled(order.taxAmount > 0);
            
            if (order.tableNumber) {
               const table = tables.find(t => t.number === order.tableNumber);
               if (table) setSelectedTable(table);
            }
            if (order.customer) {
               const customer = customers.find(c => c._id === (order.customer._id || order.customer));
               if (customer) setSelectedCustomer(customer);
            }
          }
        } catch (err) { console.error('Error loading order for update:', err); }
      };
      fetchOrder();
    }
  }, [updateOrderId, tables.length, customers.length]);

  const loadPOSData = async () => {
    if (products.length === 0) setLoading(true);

    realApi.getProducts().then(response => {
      if (response.success) {
        const data = realApi.extractData(response) || [];
        setProducts(data);
        setCache('pos_products', data);
      }
    }).finally(() => setLoading(false));

    realApi.getCategories().then(response => {
      if (response.success) {
        const data = realApi.extractData(response) || [];
        const cats = ['All', 'BREAKFAST & SNACKS', 'LUNCH', 'DINNER', 'DRINKS', 'OTHERS', ...data];
        setCategories(cats);
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
    const vatAmount = vatEnabled ? subtotal * 0.04 : 0;
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
          name: item.name
        })),
        orderType,
        paymentMethod,
        tableId: selectedTable?._id,
        tableNumber: selectedTable?.number,
        customerId: selectedCustomer?._id,
        subtotal,
        taxAmount: vatAmount,
        discount: discount,
        tip: tipAmount,
        finalTotal: total,
        status: updateOrderId ? updatingOrder.status : 'pending',
        paymentStatus: updateOrderId ? updatingOrder.paymentStatus : 'pending',
        servedBy: orderDetails.servedBy || user?._id
      };

      let response;
      if (updateOrderId) {
        response = await realApi.updateOrder(updateOrderId, orderPayload);
      } else {
        response = await realApi.createOrder(orderPayload);
      }

      if (response.success) {
        printReceipt(response.data || orderPayload, cart, { servedBy: orderPayload.servedBy, vatEnabled });
        clearCart();
        alert(updateOrderId ? 'Order Updated!' : 'Order Placed!');
        if (updateOrderId) navigate('/orders');
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

  const printReceipt = (order, items, overrides) => {
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) return;
    
    // Minimal receipt logic for speed - can be expanded as needed
    const content = `
      <html>
        <body style="font-family: monospace; width: 80mm; padding: 10px;">
          <h2 style="text-align:center">Mamma Africa</h2>
          <hr/>
          <p>Order: ${(order.orderNumber || 'New').split('-').pop()}</p>
          <p>Table: ${order.tableNumber || 'N/A'}</p>
          <hr/>
          ${items.map(i => `<div style="display:flex; justify-content:between"><span>${i.quantity}x ${i.name}</span> <span>$${(i.price * i.quantity).toFixed(2)}</span></div>`).join('')}
          <hr/>
          <p><b>Total: $${(order.finalTotal || order.totalAmount || 0).toFixed(2)}</b></p>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const formatTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="pos-fullscreen-container flex flex-col h-screen bg-gray-50 overflow-hidden">
      {updateOrderId && (
        <div className="bg-blue-600 text-white py-1.5 px-4 text-center text-xs font-bold flex justify-between items-center shadow-md z-[100]">
          <div className="flex items-center gap-2">
            <Clock size={14} className="animate-pulse" />
            <span>EDITING ORDER: {updatingOrder?.orderNumber || 'Loading...'}</span>
          </div>
          <button onClick={() => navigate('/orders')} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md transition-colors border border-white/20">Cancel Edit</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 text-white px-3 py-1 rounded-lg font-bold">POS</div>
          <div className="flex gap-4">
             <button onClick={() => navigate('/orders')} className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors">Orders</button>
             <button onClick={() => navigate('/inventory')} className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors">Inventory</button>
          </div>
        </div>
        
        <div className="flex-1 max-w-md mx-8 relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
           <input 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder="Search items..."
             className="w-full bg-gray-100 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
           />
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500">
           <div className="flex items-center gap-2">
              <User size={16} />
              <span>{user?.name || 'Staff'}</span>
           </div>
           <div className="font-mono">{formatDate(currentDateTime)} {formatTime(currentDateTime)}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Categories & Products */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="flex gap-2 p-4 overflow-x-auto border-b border-gray-100 no-scrollbar">
            {categories.map(c => (
              <button 
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === c ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 content-start bg-gray-50/30">
            {filteredProducts.map(p => (
              <div 
                key={p._id}
                onClick={() => addToCart(p)}
                className="bg-white rounded-xl border border-gray-200 p-2 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all group flex flex-col h-48"
              >
                <div className="aspect-square rounded-lg bg-gray-100 mb-2 overflow-hidden flex-shrink-0 h-28">
                   <img 
                      src={p.image ? (p.image.startsWith('http') ? p.image : `${API_CONFIG.BACKEND_URL}${p.image}`) : ''} 
                      onError={e => e.target.style.display = 'none'}
                      alt="" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                   />
                </div>
                <div className="font-bold text-xs text-gray-800 line-clamp-2 leading-tight mb-1">{p.name}</div>
                <div className="mt-auto text-blue-600 font-black text-sm">${p.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col shadow-xl z-10">
          <OrderCart
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            totals={calculateTotals()}
            orderType={orderType}
            onOrderTypeChange={setOrderType}
            tableNumber={selectedTable}
            onTableNumberChange={setSelectedTable}
            onPlaceOrder={handleSubmitOrder}
            onClearCart={clearCart}
            vatEnabled={vatEnabled}
            setVatEnabled={setVatEnabled}
            users={users}
            customers={customers}
            tables={tables}
            onCustomerChange={(c) => setSelectedCustomer(c)}
            updatingOrderId={updateOrderId}
          />
        </div>
      </div>
    </div>
  );
};

export default POS;