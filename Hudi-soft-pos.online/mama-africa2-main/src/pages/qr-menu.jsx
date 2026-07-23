// src/pages/qr-menu.jsx
// Customer-facing mobile ordering page — no auth required
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { qrAPI } from '../api/realApi';
import { useTranslation } from '../hooks/useTranslation';
import { io } from 'socket.io-client';
import { API_CONFIG } from '../config/api.config';

// ─── Utility ──────────────────────────────────────────────────────────────────
const generateSessionId = () => {
  const key = 'qr_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem(key, id);
  }
  return id;
};

const formatPrice = (price, currency = 'USD') => {
  if (currency === 'USD') return `$${Number(price).toFixed(2)}`;
  return `${Number(price).toFixed(2)} ${currency}`;
};

// ─── Sound for notifications ──────────────────────────────────────────────────
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_STEPS = ['pending', 'accepted', 'preparing', 'ready', 'served', 'completed'];
const STATUS_ICONS = {
  pending: '🕐', accepted: '✅', preparing: '👨‍🍳', ready: '🔔', served: '🍽️', completed: '⭐', cancelled: '❌'
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const LanguageSwitcher = ({ lang, changeLang, t }) => (
  <div className="flex gap-1 bg-white/10 rounded-full p-1">
    {[['en', '🇺🇸'], ['so', '🇸🇴'], ['ar', '🇸🇦']].map(([code, flag]) => (
      <button
        key={code}
        onClick={() => changeLang(code)}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
          lang === code ? 'bg-white text-purple-700 shadow' : 'text-white/80 hover:text-white'
        }`}
      >
        {flag} {code.toUpperCase()}
      </button>
    ))}
  </div>
);

const ItemCard = ({ item, onAdd, currency, t }) => {
  const [qty, setQty] = useState(0);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleAdd = () => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);
    onAdd({ ...item, quantity: qty || 1, notes });
    setQty(0);
    setNotes('');
    setShowNotes(false);
  };

  const imageUrl = item.image
    ? (item.image.startsWith('http') ? item.image : `${API_CONFIG.BACKEND_URL}${item.image.startsWith('/') ? '' : '/'}${item.image}`)
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
      {imageUrl ? (
        <div className="h-44 overflow-hidden relative">
          <img
            src={imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.classList.add('hidden'); }}
          />
          {!item.isAvailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-sm bg-red-500 px-3 py-1 rounded-full">{t('unavailable')}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-28 bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-4xl">
          🍽️
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-base leading-tight">{item.name}</h3>
        {item.description && (
          <p className="text-gray-500 text-xs mt-1 leading-relaxed line-clamp-2">{item.description}</p>
        )}
        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-extrabold text-purple-700">{formatPrice(item.price, currency)}</span>
            {item.isAvailable && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">{t('available')}</span>
            )}
          </div>
          {item.isAvailable && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center border-2 border-purple-200 rounded-xl overflow-hidden">
                  <button onClick={() => setQty(q => Math.max(0, q - 1))} className="w-8 h-8 flex items-center justify-center text-purple-700 font-bold hover:bg-purple-50">−</button>
                  <span className="w-8 text-center font-bold text-gray-800">{qty || 1}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 flex items-center justify-center text-purple-700 font-bold hover:bg-purple-50">+</button>
                </div>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-xs text-purple-500 hover:text-purple-700 underline"
                >
                  {t('itemNotes')}
                </button>
              </div>
              {showNotes && (
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('itemNotes')}
                  className="w-full border border-purple-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:border-purple-400"
                />
              )}
              <button
                onClick={handleAdd}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  animating
                    ? 'bg-green-500 text-white scale-95'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 active:scale-95'
                }`}
              >
                {animating ? `✓ ${t('addedToCart')}` : `+ ${t('addToCart')}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const CartSheet = ({ cart, onRemove, onUpdateQty, onClose, onPlaceOrder, restaurant, t, isRTL }) => {
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pay_later');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = subtotal * ((restaurant?.taxRate || 0) / 100);
  const total = subtotal + tax;
  const currency = restaurant?.currency || 'USD';

  const mobileMethods = ['evc_plus', 'zaad', 'sahal'];

  const handlePlace = async () => {
    setLoading(true);
    await onPlaceOrder({ instructions, paymentMethod, mobileNumber });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mt-auto bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        <div className="px-5 pb-2 flex items-center justify-between border-b">
          <h2 className="text-xl font-bold text-gray-900">{t('yourCart')}</h2>
          <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
          {cart.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                {item.notes && <p className="text-xs text-gray-400 italic">{item.notes}</p>}
              </div>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => onUpdateQty(idx, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold">−</button>
                <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                <button onClick={() => onUpdateQty(idx, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold">+</button>
              </div>
              <span className="text-purple-700 font-bold text-sm w-16 text-right">{formatPrice(item.price * item.quantity, currency)}</span>
              <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600 text-lg">×</button>
            </div>
          ))}
          {/* Instructions */}
          <div className="mt-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('specialInstructions')}</label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder={t('specialInstructionsPlaceholder')}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-purple-400"
            />
          </div>
          {/* Payment */}
          <div className="mt-2">
            <label className="block text-xs font-semibold text-gray-600 mb-2">{t('paymentMethod')}</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['pay_later', t('payLater')],
                ['cash', t('payByCash')],
                ['card', t('payByCard')],
                ['evc_plus', t('payByEVC')],
                ['zaad', t('payByZaad')],
                ['sahal', t('payBySahal')],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setPaymentMethod(val)}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    paymentMethod === val
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-600 hover:border-purple-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {mobileMethods.includes(paymentMethod) && (
              <div className="mt-2 space-y-2">
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value)}
                  placeholder={t('mobileNumberPlaceholder')}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                />
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  📱 Staff will verify your payment and confirm your order.
                </p>
              </div>
            )}
          </div>
        </div>
        {/* Summary + Place Order */}
        <div className="px-5 py-4 border-t bg-gray-50 rounded-b-none space-y-2">
          <div className="flex justify-between text-sm text-gray-600"><span>{t('subtotal')}</span><span>{formatPrice(subtotal, currency)}</span></div>
          {tax > 0 && <div className="flex justify-between text-sm text-gray-600"><span>{t('tax')} ({restaurant?.taxRate}%)</span><span>{formatPrice(tax, currency)}</span></div>}
          <div className="flex justify-between font-extrabold text-gray-900 text-lg border-t pt-2"><span>{t('total')}</span><span className="text-purple-700">{formatPrice(total, currency)}</span></div>
          <button
            onClick={handlePlace}
            disabled={loading || cart.length === 0}
            className="w-full py-4 mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {loading ? '⏳ Placing Order...' : `🍽️ ${t('placeOrder')} · ${formatPrice(total, currency)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const OrderTracker = ({ orders, onWaiterCall, onBillRequest, t, isRTL, currency }) => {
  const latestOrder = orders[0];

  const getStatusIndex = (status) => STATUS_STEPS.indexOf(status);

  return (
    <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>
      {orders.map((order) => (
        <div key={order._id} className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-xs font-medium">{t('orderNumber')}{order.orderNumber}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl">{STATUS_ICONS[order.status] || '🕐'}</span>
                  <span className="text-white font-bold text-lg capitalize">
                    {t(`status${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`)}
                  </span>
                </div>
              </div>
              {order.estimatedPrepTime && order.status !== 'ready' && order.status !== 'served' && order.status !== 'completed' && (
                <div className="text-right">
                  <p className="text-purple-200 text-xs">{t('estimatedTime')}</p>
                  <p className="text-white font-bold text-2xl">{order.estimatedPrepTime}<span className="text-sm font-normal"> {t('minutes')}</span></p>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between relative">
              <div className="absolute inset-x-0 top-3 h-0.5 bg-gray-100" />
              <div
                className="absolute top-3 h-0.5 bg-purple-500 transition-all duration-700"
                style={{ width: `${(getStatusIndex(order.status) / (STATUS_STEPS.length - 1)) * 100}%` }}
              />
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="relative flex flex-col items-center z-10">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                    i <= getStatusIndex(order.status)
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i <= getStatusIndex(order.status) ? '✓' : i + 1}
                  </div>
                  <p className={`mt-1 text-xs font-medium ${i <= getStatusIndex(order.status) ? 'text-purple-600' : 'text-gray-400'}`} style={{ fontSize: '9px', whiteSpace: 'nowrap' }}>
                    {STATUS_ICONS[step]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="px-5 pb-4 border-t">
            <div className="mt-3 space-y-1">
              {order.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.quantity}× {item.productName || item.name}</span>
                  <span className="font-semibold text-gray-800">{formatPrice(item.total, currency)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between font-bold">
              <span>{t('total')}</span>
              <span className="text-purple-700">{formatPrice(order.finalTotal, currency)}</span>
            </div>
          </div>

          {/* Action buttons */}
          {(order.status === 'pending' || order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready') && (
            <div className="px-5 pb-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => onWaiterCall(order._id)}
                className="flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm active:scale-95 transition-all"
              >
                🙋 {t('callWaiter')}
              </button>
              <button
                onClick={() => onBillRequest(order._id)}
                className="flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm active:scale-95 transition-all"
              >
                🧾 {t('requestBill')}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const QRMenuPage = () => {
  const [searchParams] = useSearchParams();
  const tableToken = searchParams.get('table');
  const { t, lang, changeLang, isRTL } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuData, setMenuData] = useState(null); // { table, restaurant, categories }
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [view, setView] = useState('menu'); // 'menu' | 'orders'
  const [orders, setOrders] = useState([]);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [toast, setToast] = useState('');
  const sessionId = useRef(generateSessionId());
  const socketRef = useRef(null);

  // Load menu
  useEffect(() => {
    if (!tableToken) {
      setError('Invalid QR code. Please scan the QR code on your table.');
      setLoading(false);
      return;
    }
    loadMenu();
  }, [tableToken]);

  // Real-time: connect socket for order updates
  useEffect(() => {
    if (!tableToken) return;
    const socket = io(API_CONFIG.SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('order-status-update', ({ orderId, status }) => {
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
      playNotificationSound();
      showToast(`Order ${status === 'ready' ? '🔔 Ready!' : `updated: ${status}`}`);
    });

    return () => { socket.disconnect(); };
  }, [tableToken]);

  const loadMenu = async () => {
    try {
      setLoading(true);
      const res = await qrAPI.getMenu(tableToken);
      if (res.success !== false && res.data) {
        setMenuData(res.data);
        setActiveCategory(res.data.categories?.[0]?.name || '');
      } else {
        setError(res.message || t('errorLoadingMenu'));
      }
    } catch (e) {
      setError(t('errorLoadingMenu'));
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    if (!tableToken) return;
    try {
      const res = await qrAPI.trackOrder(sessionId.current, tableToken);
      if (res.success !== false && res.data) {
        setOrders(Array.isArray(res.data) ? res.data : [res.data]);
      }
    } catch {}
  };

  useEffect(() => {
    if (view === 'orders') loadOrders();
    const interval = view === 'orders' ? setInterval(loadOrders, 15000) : null;
    return () => { if (interval) clearInterval(interval); };
  }, [view]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.findIndex(i => i._id === item._id && i.notes === item.notes);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + (item.quantity || 1) };
        return updated;
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
    showToast(`✓ ${item.name} ${t('addedToCart')}`);
  }, [t]);

  const removeFromCart = (idx) => setCart(prev => prev.filter((_, i) => i !== idx));
  const updateQty = (idx, qty) => {
    if (qty <= 0) { removeFromCart(idx); return; }
    setCart(prev => prev.map((i, n) => n === idx ? { ...i, quantity: qty } : i));
  };

  const placeOrder = async ({ instructions, paymentMethod, mobileNumber }) => {
    if (cart.length === 0) { showToast(t('selectItems')); return; }
    try {
      const payload = {
        tableToken,
        sessionId: sessionId.current,
        items: cart.map(i => ({ productId: i._id, quantity: i.quantity, notes: i.notes })),
        specialInstructions: instructions,
        paymentMethod,
        customerPhone: mobileNumber || '',
      };
      const res = await qrAPI.placeOrder(payload);
      if (res.success !== false) {
        setOrderSuccess(res.data);
        setCart([]);
        setShowCart(false);
        setView('orders');
        loadOrders();
        showToast(`🎉 ${t('orderPlaced')}`);
      } else {
        showToast(res.message || t('errorPlacingOrder'));
      }
    } catch {
      showToast(t('errorPlacingOrder'));
    }
  };

  const callWaiter = async (orderId) => {
    try {
      await qrAPI.waiterRequest({ tableToken, type: 'waiter_call', orderId, sessionId: sessionId.current });
      showToast(`🙋 ${t('waiterCalled')}`);
    } catch { showToast(t('waiterCalled')); }
  };

  const requestBill = async (orderId) => {
    try {
      await qrAPI.waiterRequest({ tableToken, type: 'bill_request', orderId, sessionId: sessionId.current });
      showToast(`🧾 ${t('billRequested')}`);
    } catch { showToast(t('billRequested')); }
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const restaurant = menuData?.restaurant;
  const currency = restaurant?.currency || 'USD';

  const filteredItems = menuData?.categories
    ?.filter(cat => !activeCategory || cat.name === activeCategory)
    ?.flatMap(cat => cat.items)
    ?.filter(item => !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    || [];

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 to-indigo-800 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-6" />
        <p className="text-xl font-semibold animate-pulse">Loading menu...</p>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-rose-800 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-3">Oops!</h1>
        <p className="text-white/80 mb-6">{error}</p>
        <button onClick={loadMenu} className="bg-white text-red-600 font-bold py-3 px-8 rounded-2xl">Try Again</button>
      </div>
    );
  }

  const table = menuData?.table;

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl animate-bounce-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white sticky top-0 z-40 shadow-lg">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {restaurant?.logo && (
                <img src={restaurant.logo} alt="logo" className="w-10 h-10 rounded-xl object-cover bg-white/20" onError={(e) => e.target.style.display='none'} />
              )}
              <div>
                <h1 className="text-xl font-extrabold leading-tight">{restaurant?.name || 'Restaurant'}</h1>
                <p className="text-purple-200 text-xs">📍 {t('table')}: <span className="font-bold text-white">{table?.name || table?.number}</span></p>
              </div>
            </div>
            <LanguageSwitcher lang={lang} changeLang={changeLang} t={t} />
          </div>

          {/* View Tabs */}
          <div className="flex gap-1 mt-4 bg-white/10 rounded-2xl p-1">
            <button
              onClick={() => setView('menu')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${view === 'menu' ? 'bg-white text-purple-700 shadow' : 'text-white/80 hover:text-white'}`}
            >
              🍽️ {t('menu')}
            </button>
            <button
              onClick={() => { setView('orders'); loadOrders(); }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${view === 'orders' ? 'bg-white text-purple-700 shadow' : 'text-white/80 hover:text-white'}`}
            >
              📋 {t('orders')} {orders.length > 0 && `(${orders.length})`}
            </button>
          </div>
        </div>

        {/* Category bar (only on menu view) */}
        {view === 'menu' && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto mt-3 scrollbar-hide">
            <button
              onClick={() => setActiveCategory('')}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!activeCategory ? 'bg-white text-purple-700' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
              {t('allCategories')}
            </button>
            {menuData?.categories?.map(cat => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === cat.name ? 'bg-white text-purple-700' : 'bg-white/20 text-white hover:bg-white/30'}`}
              >
                {cat.name} <span className="opacity-70">({cat.items.length})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu View */}
      {view === 'menu' && (
        <div className="flex-1 p-4">
          {/* Search */}
          <div className="relative mb-5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>

          {/* Items grid */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">🍽️</div>
              <p className="font-semibold">{t('noItemsFound')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredItems.map(item => (
                <ItemCard key={item._id} item={item} onAdd={addToCart} currency={currency} t={t} />
              ))}
            </div>
          )}
          {/* Bottom padding for FAB */}
          <div className="h-24" />
        </div>
      )}

      {/* Orders View */}
      {view === 'orders' && (
        <div className="flex-1 p-4">
          {orderSuccess && (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 mb-5 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="font-bold text-green-800 text-lg">{t('orderPlaced')}</h3>
              <p className="text-green-600 text-sm mt-1">{t('orderPlacedDesc')}</p>
              {orderSuccess.estimatedPrepTime && (
                <div className="mt-3 bg-white rounded-xl p-3 inline-block">
                  <span className="text-gray-500 text-xs">{t('estimatedTime')}: </span>
                  <span className="font-extrabold text-purple-700 text-xl">{orderSuccess.estimatedPrepTime} <span className="text-sm font-normal">{t('minutes')}</span></span>
                </div>
              )}
            </div>
          )}
          {orders.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-semibold">No orders yet</p>
              <p className="text-sm mt-1">Your orders will appear here after you place them</p>
            </div>
          ) : (
            <OrderTracker
              orders={orders}
              onWaiterCall={callWaiter}
              onBillRequest={requestBill}
              t={t}
              isRTL={isRTL}
              currency={currency}
            />
          )}
        </div>
      )}

      {/* Floating Cart Button */}
      {view === 'menu' && cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 left-4 right-4 z-40 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-2xl shadow-2xl shadow-purple-500/40 flex items-center justify-between px-6 active:scale-[0.98] transition-all"
        >
          <span className="bg-white text-purple-700 text-xs font-extrabold w-7 h-7 rounded-full flex items-center justify-center">{cartCount}</span>
          <span className="font-bold text-lg">{t('cart')} · {formatPrice(cart.reduce((s, i) => s + i.price * i.quantity, 0), currency)}</span>
          <span className="text-2xl">→</span>
        </button>
      )}

      {/* Cart Sheet */}
      {showCart && (
        <CartSheet
          cart={cart}
          onRemove={removeFromCart}
          onUpdateQty={updateQty}
          onClose={() => setShowCart(false)}
          onPlaceOrder={placeOrder}
          restaurant={restaurant}
          t={t}
          isRTL={isRTL}
        />
      )}
    </div>
  );
};

export default QRMenuPage;
