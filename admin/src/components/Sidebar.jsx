import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    BarChart3,
    CreditCard,
    Key,
    LogOut,
    Settings,
    ShieldCheck,
    Users
} from 'lucide-react';

const Sidebar = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('adminInfo');
        navigate('/login');
    };

    const navItems = [
        { title: 'Overview', icon: BarChart3, path: '/' },
        { title: 'Leads', icon: Users, path: '/leads' },
        { title: 'Orders', icon: CreditCard, path: '/orders' },
        { title: 'Licenses', icon: Key, path: '/licenses' },
    ];

    return (
        <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col font-normal sticky top-0">
            <div className="p-8 flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                    <ShieldCheck className="text-white" size={24} />
                </div>
                <span className="text-xl font-black text-white tracking-tighter">ADMIN<span className="text-blue-500">PRO</span></span>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`
                        }
                    >
                        <item.icon size={20} />
                        <span className="font-bold">{item.title}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all font-bold"
                >
                    <LogOut size={20} />
                    <span>Exit Console</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
