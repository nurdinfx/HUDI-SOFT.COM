import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { realApi } from '../../api/realApi';
import { API_CONFIG } from '../../config/api.config';
import { Menu, LogOut, Clock, Calendar, User as UserIcon } from 'lucide-react';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard Overview',
  '/pos': 'Point of Sale',
  '/kitchen': 'Kitchen Display',
  '/orders': 'Order Management',
  '/tables': 'Table Management',
  '/inventory': 'Inventory Control',
  '/customers/ledger': 'Customer Ledger',
  '/finance': 'Financial Reports',
  '/purchase': 'Purchase Management',
  '/users': 'User Management',
  '/reports': 'System Reports',
  '/settings': 'System Settings',
  '/admin/licensing': 'License Management',
  '/sales': 'Sales History',

};

const Header = ({ toggleSidebar, children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [now, setNow] = useState(new Date());
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await realApi.getSettings();
        if (response.success) {
          setSettings(realApi.extractData(response));
        }
      } catch (err) {
        console.error('Failed to fetch settings in Header:', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const formatDate = (date) =>
    date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });

  const getPageTitle = () => {
    const path = location.pathname;
    if (PAGE_TITLES[path]) return PAGE_TITLES[path];
    
    // Check for nested routes
    for (const [key, value] of Object.entries(PAGE_TITLES)) {
      if (path.startsWith(key) && key !== '/') return value;
    }
    
    return 'POS System';
  };

  const isPosPage = location.pathname === '/pos';

  return (
    <header className={`relative z-30 shadow-2xl overflow-hidden transition-all duration-500 ${isPosPage ? 'min-h-[60px]' : 'min-h-[160px]'} flex flex-col text-white`}>
      {/* Background Image with Overlay - Hide or minimize on POS */}
      {!isPosPage && (
        <>
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000"
            style={{ 
              backgroundImage: 'url(https://images.unsplash.com/photo-1556742044-3c52d6e88c62?q=80&w=2070&auto=format&fit=crop)',
              filter: 'brightness(0.4) contrast(1.1)'
            }}
          />
          <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#1e4c82]/90 via-[#1e4c82]/70 to-black/60 backdrop-blur-[1px]" />
        </>
      )}
      
      {/* POS Specific Solid Header */}
      {isPosPage && (
        <div className="absolute inset-0 z-0 bg-[#1e4c82]" />
      )}

      {/* Top Bar: Navigation Controls */}
      <div className={`relative z-10 flex items-center justify-between px-4 h-[55px] border-b border-white/10 ${isPosPage ? 'bg-transparent' : 'bg-black/10'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-95 shadow-lg border border-white/10"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#1e4c82] rounded-full"></span>
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black uppercase tracking-tighter drop-shadow-md">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Dynamic Center Content (POS Totals) */}
        <div className="flex-1 flex justify-center items-center h-full px-4 overflow-hidden">
          {children}
        </div>

        <div className="flex items-center gap-3">
          {/* User Info - Compact on POS */}
          <div className="hidden lg:flex items-center gap-2 px-2 py-1 bg-white/5 rounded-full border border-white/10">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center border border-white/20 shadow-md">
              <UserIcon size={12} className="text-white" />
            </div>
            <span className="text-[10px] font-bold leading-none mr-2">
              {user?.name || 'Staff'}
            </span>
          </div>

          {/* Clock/Date - Hidden on small POS screens or compact */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-black/20 rounded-lg border border-white/5">
             <span className="text-[10px] font-black tracking-tighter tabular-nums">{formatTime(now)}</span>
             <Clock size={12} className="text-blue-300 opacity-50" />
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center justify-center w-8 h-8 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-all active:scale-95 shadow-lg border border-red-400/30 group"
            title="Logout"
          >
            <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Hero Section: Dynamic Title & Children (Only for non-POS) */}
      {!isPosPage && (
        <div className="relative z-10 flex-1 flex items-center px-8 py-4 justify-start">
          <div className="flex flex-col">
             <div className="flex items-center gap-3 mb-1">
                <div className="h-1 w-8 bg-blue-400 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300/80">Current Page</span>
             </div>
             <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter drop-shadow-[0_4px_10_rgba(0,0,0,0.5)]">
               {getPageTitle()}
             </h1>
          </div>
        </div>
      )}
      
      {/* Aesthetic Bottom Border Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent z-20"></div>
    </header>
  );
};

export default Header;