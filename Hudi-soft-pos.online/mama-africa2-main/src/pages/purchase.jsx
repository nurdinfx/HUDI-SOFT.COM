// src/pages/Purchase.js - REAL BACKEND ONLY
import React, { useState, useEffect, useRef } from 'react';
import PurchaseProducts from '../components/purchase/PurchaseProducts';
import PurchaseOrders from '../components/purchase/PurchaseOrders';
import Suppliers from '../components/purchase/Suppliers';
import ProductReport from '../components/purchase/ProductReport';
import DailyTransactions from '../components/purchase/DailyTransactions';
import { realApi } from '../api/realApi';
import { useAuth } from '../contexts/AuthContext';
import { API_CONFIG } from '../config/api.config';
import { RefreshCw, DollarSign, Package, Building, AlertCircle } from 'lucide-react';

import { useOptimisticData } from '../hooks/useOptimisticData';

const Purchase = () => {
  const [activeView, setActiveView] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Use optimistic hook
  const {
    data: purchaseStats,
    loading: hookLoading, // Rename to avoid conflict if necessary
    error: hookError,
    refresh: refreshStats
  } = useOptimisticData('purchase_stats', async () => {
    console.log('📊 Loading purchase stats from backend...');

    const [purchasesRes, suppliersRes, poRes] = await Promise.all([
      realApi.getPurchases(),
      realApi.getSuppliers ? realApi.getSuppliers() : Promise.resolve({ success: false }),
      realApi.getPurchaseOrders ? realApi.getPurchaseOrders() : Promise.resolve({ success: false })
    ]);

    if (!purchasesRes.success) throw new Error(purchasesRes.message || 'Failed to load purchases');

    const purchases = realApi.extractData(purchasesRes) || [];
    const suppliers = suppliersRes.success ? (realApi.extractData(suppliersRes) || []) : [];
    const purchaseOrders = poRes.success ? (realApi.extractData(poRes) || []) : [];

    const today = new Date().toDateString();
    const todayPurchasesArr = Array.isArray(purchases)
      ? purchases.filter(p => new Date(p.createdAt || p.date || p.purchaseDate || p.updatedAt).toDateString() === today)
      : [];

    const totalAmount = Array.isArray(purchases)
      ? purchases.reduce((s, p) => s + (p.totalAmount || p.finalTotal || p.amount || 0), 0)
      : 0;
    const todayAmount = todayPurchasesArr.reduce((s, p) => s + (p.totalAmount || p.finalTotal || p.amount || 0), 0);
    const pendingOrders = Array.isArray(purchaseOrders)
      ? purchaseOrders.filter(po => (po.status || '').toLowerCase() === 'pending').length
      : 0;
    const activeSuppliers = Array.isArray(suppliers) ? suppliers.length : 0;

    return {
      totalPurchases: Array.isArray(purchases) ? purchases.length : 0,
      totalAmount,
      pendingOrders,
      activeSuppliers,
      todayPurchases: todayPurchasesArr.length,
      todayAmount
    };
  }, {
    totalPurchases: 0,
    totalAmount: 0,
    pendingOrders: 0,
    activeSuppliers: 0,
    todayPurchases: 0,
    todayAmount: 0
  });

  // Calculate generic loading/status
  const loading = hookLoading;
  const backendStatus = hookError ? 'error' : (loading ? 'checking' : 'connected');

  const timeIntervalRef = useRef(null);
  const { user, backendStatus: authBackendStatus } = useAuth();

  // Update current time every second
  useEffect(() => {
    timeIntervalRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, []);

  // Reload stats when returning to main view
  useEffect(() => {
    if (!activeView) {
      refreshStats();
    }
  }, [activeView, refreshStats]);

  // Removed old loadPurchaseStats function entirely as it's now in the hook


  // Format date/time
  const formatDateTime = (date) => {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const purchaseModules = [
    {
      id: 'products',
      title: 'Purchase Products',
      icon: '🛒',
      component: PurchaseProducts,
      description: 'Create new purchases and manage inventory'
    },
    {
      id: 'orders',
      title: 'Purchase Orders',
      icon: '📋',
      component: PurchaseOrders,
      description: 'Manage purchase orders and approvals'
    },
    {
      id: 'suppliers',
      title: 'Suppliers',
      icon: '🏢',
      component: Suppliers,
      description: 'Manage supplier information and contacts'
    },
    {
      id: 'report',
      title: 'Product Report',
      icon: '📊',
      component: ProductReport,
      description: 'View purchase analytics and reports'
    },
    {
      id: 'transactions',
      title: 'Daily Purchase Transactions',
      icon: '📄',
      component: DailyTransactions,
      description: 'View daily purchase history and transactions'
    }
  ];

  const ActiveComponent = activeView ? purchaseModules.find(m => m.id === activeView)?.component : null;

  const renderActiveComponent = () => {
    if (!ActiveComponent) return null;

    try {
      return React.createElement(ActiveComponent, {
        key: activeView
      });
    } catch (error) {
      console.error(`Error rendering ${activeView}:`, error);
      return (
        <div className="p-8 text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h3 className="font-bold text-lg mb-2">Component Error</h3>
            <p>Failed to load {purchaseModules.find(m => m.id === activeView)?.title}</p>
            <p className="text-sm mt-2">{error.message}</p>
            <button
              onClick={() => setActiveView(null)}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  };

  if (ActiveComponent) {
    return (
      <div className="page-content flex flex-col gap-6 h-full overflow-auto">
        <div className="card bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveView(null)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>←</span>
                <span>Back to Purchase</span>
              </button>
              <div>
                <h1 className="heading-1 text-white">
                  {purchaseModules.find(m => m.id === activeView)?.title}
                </h1>
                <div className="text-sm text-blue-100">
                  {formatDateTime(currentTime)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-blue-100">Live Time</div>
                <div className="font-semibold">
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })}
                </div>
              </div>
              <div className="text-2xl">
                {purchaseModules.find(m => m.id === activeView)?.icon}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {renderActiveComponent()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9] overflow-auto select-none">
      {/* Top Header Bar */}
      <div className="bg-[#2563EB] text-white py-4 px-6 shadow-md flex items-center">
        <h1 className="text-xl font-bold tracking-tight text-white">Purchase</h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-wrap justify-center gap-6 max-w-6xl w-full">
          {/* Card 1: Purchase Products */}
          <button
            onClick={() => setActiveView('products')}
            className="w-52 h-52 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded flex flex-col items-center justify-center p-4 transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-md focus:outline-none"
          >
            {/* Custom SVG Basket Icon */}
            <svg className="w-16 h-16 mb-4 text-white" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 28C16 19.163 23.163 12 32 12C40.837 12 48 19.163 48 28" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round"/>
              <path d="M10 28H54L48 50H16L10 28Z" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
              <circle cx="32" cy="39" r="3.5" fill="#2563EB"/>
            </svg>
            <span className="font-bold text-[17px] leading-tight tracking-wide">Purchase<br />Products</span>
          </button>

          {/* Card 2: purchase orders */}
          <button
            onClick={() => setActiveView('orders')}
            className="w-52 h-52 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded flex flex-col items-center justify-center p-4 transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-md focus:outline-none"
          >
            {/* Custom SVG List with Checkmark Icon */}
            <svg className="w-16 h-16 mb-4 text-white" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 20H32" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round"/>
              <path d="M12 31H24" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round"/>
              <path d="M12 42H28" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round"/>
              <path d="M34 35L42 43L54 27" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-bold text-[17px] leading-tight tracking-wide">purchase<br />orders</span>
          </button>

          {/* Card 3: Suppliers */}
          <button
            onClick={() => setActiveView('suppliers')}
            className="w-52 h-52 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded flex flex-col items-center justify-center p-4 transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-md focus:outline-none"
          >
            {/* Custom SVG Download Tray Icon */}
            <svg className="w-16 h-16 mb-4 text-white" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 14V42" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
              <path d="M22 32L32 42L42 32" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 40V48H52V40" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-bold text-[17px] leading-tight tracking-wide">Suppliers</span>
          </button>

          {/* Card 4: Product Report */}
          <button
            onClick={() => setActiveView('report')}
            className="w-52 h-52 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded flex flex-col items-center justify-center p-4 transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-md focus:outline-none"
          >
            {/* Custom SVG Cart with Plus Icon */}
            <svg className="w-16 h-16 mb-4 text-white" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 16H16L24 42H48L54 24H20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="26" cy="50" r="3" fill="currentColor" stroke="currentColor" strokeWidth="1"/>
              <circle cx="46" cy="50" r="3" fill="currentColor" stroke="currentColor" strokeWidth="1"/>
              <path d="M37 18V30" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round"/>
              <path d="M31 24H43" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round"/>
            </svg>
            <span className="font-bold text-[17px] leading-tight tracking-wide">Product<br />Report</span>
          </button>

          {/* Card 5: Daily Purchase Transactions */}
          <button
            onClick={() => setActiveView('transactions')}
            className="w-52 h-52 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded flex flex-col items-center justify-center p-4 transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-md focus:outline-none"
          >
            {/* Custom SVG Credit Card Icon */}
            <svg className="w-16 h-16 mb-4 text-white" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="20" width="44" height="24" rx="4" stroke="currentColor" strokeWidth="4.5" />
              <line x1="10" y1="28" x2="54" y2="28" stroke="currentColor" strokeWidth="4.5" />
            </svg>
            <span className="font-bold text-[17px] leading-tight tracking-wide">Daily<br />Purchase<br />Transactions</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Purchase;