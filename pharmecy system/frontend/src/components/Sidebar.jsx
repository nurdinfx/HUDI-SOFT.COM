import { NavLink } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { LayoutDashboard, Store, Package, ShoppingCart, DollarSign, Users, LogOut, Settings, CreditCard, Activity, Truck } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuthStore();

  const getNavItems = () => {
    const items = [
      { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5 mr-3" /> }
    ];

    if (user?.role === 'Super Admin') {
      items.push({ name: 'Admin Panel', path: '/admin/dashboard', icon: <Activity className="w-5 h-5 mr-3" /> });
    }

    if (['Super Admin', 'Owner'].includes(user?.role)) {
      items.push({ name: 'Branches', path: '/branches', icon: <Store className="w-5 h-5 mr-3" /> });
    }

    if (['Super Admin', 'Owner', 'Branch Manager', 'Pharmacist'].includes(user?.role)) {
      items.push({ name: 'Inventory', path: '/inventory', icon: <Package className="w-5 h-5 mr-3" /> });
    }

    if (['Super Admin', 'Owner', 'Branch Manager', 'Pharmacist', 'Cashier'].includes(user?.role)) {
      items.push({ name: 'POS', path: '/pos', icon: <ShoppingCart className="w-5 h-5 mr-3" /> });
    }

    if (['Super Admin', 'Owner', 'Accountant'].includes(user?.role)) {
      items.push({ name: 'Finance', path: '/finance', icon: <DollarSign className="w-5 h-5 mr-3" /> });
    }

    if (['Super Admin', 'Owner', 'Branch Manager'].includes(user?.role)) {
      items.push({ name: 'Staff', path: '/staff', icon: <Users className="w-5 h-5 mr-3" /> });
      items.push({ name: 'Suppliers', path: '/suppliers', icon: <Truck className="w-5 h-5 mr-3" /> });
      items.push({ name: 'Expenses', path: '/expenses', icon: <DollarSign className="w-5 h-5 mr-3" /> });
    }

    if (['Super Admin', 'Owner'].includes(user?.role)) {
      items.push({ name: 'Shareholders', path: '/shareholders', icon: <Users className="w-5 h-5 mr-3" /> });

      items.push({ name: 'Subscription', path: '/subscription', icon: <CreditCard className="w-5 h-5 mr-3" /> });
      items.push({ name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5 mr-3" /> });
    }

    return items;
  };

  return (
    <div className="flex flex-col w-64 min-h-screen text-slate-300 bg-slate-900 border-r border-slate-800 shadow-2xl">
      {/* Brand Header */}
      <div className="flex items-center px-6 h-20 border-b border-slate-800">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-primary/20">
          <ShoppingCart className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">PharmSaaS</h1>
      </div>

      {/* Tenant/User Profile */}
      <div className="p-6 bg-slate-950/50 border-b border-slate-800">
        <div className="flex flex-col space-y-1">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">{user?.businessName || 'Pharmacy Group'}</span>
          <span className="text-sm font-bold text-white truncate">{user?.name}</span>
          <span className="text-[10px] text-slate-500 font-medium px-2 py-0.5 bg-slate-800 rounded-full w-fit">{user?.role}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {getNavItems().map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <div className="transition-transform duration-200 group-hover:scale-110">
              {item.icon}
            </div>
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-3 text-sm font-bold text-red-400 transition-all rounded-xl hover:bg-red-500/10 hover:text-red-300 group"
        >
          <LogOut className="w-5 h-5 mr-3 transition-transform group-hover:-translate-x-1" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

