import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { realApi } from '../../api/realApi';
import { API_CONFIG } from '../../config/api.config';
import {
  LayoutDashboard,
  ChefHat,
  Package,
  Table,
  Archive,
  BookOpen,
  Banknote,
  ShoppingCart,
  Users,
  TrendingUp,
  Settings,
  CreditCard,
  LogOut,
  Shield,
  Store,
  ClipboardList,
  Briefcase,
  QrCode,
  Bell,
  CalendarCheck,
  Building2,
  Bed,
  CalendarDays,
  ConciergeBell,
  Brush,
  Database
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await realApi.getSettings();
        if (response.success) {
          setSettings(realApi.extractData(response));
        }
      } catch (err) {}
    };
    fetchSettings();
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager'] },
    { name: 'POS', href: '/pos', icon: CreditCard, roles: ['admin', 'manager', 'cashier', 'waiter'] },

    { name: 'Kitchen', href: '/kitchen', icon: ChefHat, roles: ['admin', 'chef'] },
    { name: 'Orders', href: '/orders', icon: Package, roles: ['admin', 'manager', 'cashier', 'waiter'] },
    { name: 'Sales History', href: '/sales', icon: ClipboardList, roles: ['admin', 'manager'] },
    { name: 'Tables', href: '/tables', icon: Table, roles: ['admin', 'manager', 'waiter'] }, 
    { name: 'QR Management', href: '/qr-management', icon: QrCode, roles: ['admin', 'manager'] },
    { name: 'Waiter Board', href: '/waiter', icon: Bell, roles: ['admin', 'manager', 'waiter'] },
    { name: 'Inventory', href: '/inventory', icon: Archive, roles: ['admin', 'manager'] },
    { name: 'Customer Ledger', href: '/customers/ledger', icon: BookOpen, roles: ['admin', 'manager', 'cashier'] },
    { name: 'Finance', href: '/finance', icon: Banknote, roles: ['admin', 'manager'] },
    { name: 'Purchase', href: '/purchase', icon: ShoppingCart, roles: ['admin', 'manager'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['admin', 'manager'] },
    { name: 'Employees', href: '/employees', icon: Briefcase, roles: ['admin', 'manager'] },
    { name: 'Attendance', href: '/attendance', icon: CalendarCheck, roles: ['admin', 'manager'] },
    { name: 'Reports', href: '/reports', icon: TrendingUp, roles: ['admin', 'manager'] },
    { name: 'Data Migration', href: '/migration', icon: Database, roles: ['admin', 'manager'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'manager'] },
    { name: 'License Mgmt', href: '/admin/licensing', icon: Shield, roles: ['admin'] },
  ];

  // Hotel management navigation items
  const hotelNavigation = [
    { name: 'Hotel Dashboard', href: '/hotel/dashboard', icon: Building2, roles: ['admin', 'manager'] },
    { name: 'Rooms & Types', href: '/hotel/rooms', icon: Bed, roles: ['admin', 'manager'] },
    { name: 'Reservations', href: '/hotel/reservations', icon: CalendarDays, roles: ['admin', 'manager', 'cashier'] },
    { name: 'Front Desk', href: '/hotel/frontdesk', icon: ConciergeBell, roles: ['admin', 'manager', 'cashier'] },
    { name: 'Housekeeping', href: '/hotel/housekeeping', icon: Brush, roles: ['admin', 'manager'] },
  ];

  const showHotel = settings?.businessType === 'both' || settings?.businessType === 'hotel';

  const filteredNavigation = navigation.filter((item) => {
    // Check role permissions first
    if (!item.roles.includes(user?.role)) return false;

    // In supermarket-only mode, hide restaurant modules
    if (settings?.businessType === 'supermarket') {
      const restaurantSpecific = ['Kitchen', 'Tables', 'QR Management', 'Waiter Board'];
      if (restaurantSpecific.includes(item.name)) {
        return false;
      }
    }
    return true;
  });

  const filteredHotelNav = hotelNavigation.filter(item => item.roles.includes(user?.role));

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      // ignore
    }
  };

  const handleItemClick = () => {
    // Close drawer after navigation so content uses full width
    setIsOpen(false);
  };

  const isCurrentPath = (href) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <div
      className={`bg-gradient-to-b from-[#1e4c82] to-[#163a63] text-white h-screen fixed left-0 top-0 w-64 overflow-y-auto z-50 border-r border-white/10 shadow-[5px_0_25px_rgba(0,0,0,0.3)] transition-all duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
    >
      <div className="p-4 flex justify-between items-center border-b border-white/10 bg-black/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white p-1.5 overflow-hidden flex items-center justify-center shadow-lg border border-white/20">
            <img 
              src={settings?.logoUrl ? (settings.logoUrl.startsWith('http') ? settings.logoUrl : `${API_CONFIG.BACKEND_URL}${settings.logoUrl}`) : "/logo.png"} 
              alt="Logo" 
              className="h-full w-full object-contain" 
              onerror="this.src='/logo.png'"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-white uppercase max-w-[160px] leading-tight mb-1 whitespace-normal break-words">
              {settings?.restaurantName || 'HUDI-SOFT'}
            </h1>
            <p className="text-[9px] text-blue-200 uppercase font-black tracking-tighter opacity-80 leading-none">
              {settings?.tagline || 'POS Online'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-blue-200 hover:text-white focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <nav className="mt-6">
        <ul className="space-y-1 px-3">
          {filteredNavigation.map((item) => {
            const active = isCurrentPath(item.href);
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  onClick={handleItemClick}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${active
                    ? 'bg-white text-blue-700 shadow-md translate-x-1'
                    : 'text-blue-100 hover:bg-blue-600 hover:text-white hover:translate-x-1'
                    }`}
                >
                  <span
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${active
                      ? 'bg-blue-100/50 text-blue-700'
                      : 'bg-blue-800/50 text-blue-200'
                      }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="truncate">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Hotel Management Section */}
        {showHotel && filteredHotelNav.length > 0 && (
          <div className="mt-4 px-3">
            <div className="flex items-center gap-2 px-3 mb-2">
              <Building2 size={13} className="text-amber-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">Hotel Management</span>
            </div>
            <ul className="space-y-1">
              {filteredHotelNav.map((item) => {
                const active = isCurrentPath(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={handleItemClick}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${active
                        ? 'bg-amber-400/20 text-amber-200 shadow-md translate-x-1 border border-amber-400/30'
                        : 'text-blue-100 hover:bg-amber-500/10 hover:text-amber-200 hover:translate-x-1'
                        }`}
                    >
                      <span
                        className={`h-8 w-8 rounded-lg flex items-center justify-center ${active
                          ? 'bg-amber-400/30 text-amber-300'
                          : 'bg-amber-700/20 text-amber-300'
                          }`}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Logout at bottom */}
      <div className="mt-6 px-3 pb-6 border-t border-blue-600/50 pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-100 hover:bg-red-500/20 transition-all"
        >
          <span className="h-8 w-8 rounded-lg flex items-center justify-center bg-red-500/20 text-red-200">
            <LogOut size={18} />
          </span>
          <span className="truncate">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;