'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Calendar, Stethoscope, FlaskConical,
  Pill, Receipt, BarChart3, Settings, LogOut, Menu, X,
  ChevronRight, Bell, Sun, Moon, ClipboardList, UserCog, Clock,
  HeartPulse, FileText, Camera, Building2, Sparkles,
} from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useLanguage } from '@/context/LanguageContext'
import { cn, getInitials } from '@/lib/utils'

interface NavItemConfig {
  href: string
  icon: LucideIcon
  label: string
  labelKey?: string
  roles: string[]
}

const NAV: NavItemConfig[] = [
  { href: '/dashboard',       icon: LayoutDashboard, labelKey: 'dashboard',     label: 'Dashboard',           roles: ['*'] },
  { href: '/dental',          icon: HeartPulse,      labelKey: 'odontogram',    label: 'Dental Odontogram',   roles: ['*'] },
  { href: '/treatment-plans', icon: FileText,        labelKey: 'treatmentPlans',label: 'Treatment Plans',     roles: ['super_admin','clinic_manager','doctor'] },
  { href: '/dental-imaging',  icon: Camera,          labelKey: 'imaging',       label: 'Dental Imaging',      roles: ['super_admin','clinic_manager','doctor'] },
  { href: '/dental-lab',      icon: FlaskConical,    labelKey: 'dentalLab',     label: 'Dental Laboratory',   roles: ['super_admin','clinic_manager','doctor','lab_staff'] },
  { href: '/patients',        icon: Users,           labelKey: 'patients',      label: 'Patients',            roles: ['*'] },
  { href: '/appointments',    icon: Calendar,        labelKey: 'appointments',  label: 'Appointments',        roles: ['*'] },
  { href: '/consultations',   icon: Stethoscope,     labelKey: 'consultations', label: 'Consultations',       roles: ['super_admin','clinic_manager','doctor'] },
  { href: '/prescriptions',   icon: ClipboardList,   labelKey: 'prescriptions', label: 'Prescriptions',       roles: ['super_admin','clinic_manager','doctor'] },
  { href: '/pharmacy',        icon: Pill,            labelKey: 'pharmacy',      label: 'Pharmacy',            roles: ['super_admin','clinic_manager','pharmacist','doctor'] },
  { href: '/billing',         icon: Receipt,         labelKey: 'invoices',      label: 'Billing',             roles: ['super_admin','clinic_manager','accountant','receptionist'] },
  { href: '/branches',        icon: Building2,       labelKey: 'branches',      label: 'Clinic Branches',     roles: ['super_admin','clinic_manager'] },
  { href: '/ai-assistant',    icon: Sparkles,        labelKey: 'aiAssistant',   label: 'AI Dental Assistant', roles: ['*'] },
  { href: '/attendance',      icon: Clock,           labelKey: 'attendance',    label: 'Attendance',          roles: ['*'] },
  { href: '/employees',       icon: UserCog,         labelKey: 'employees',     label: 'Employees',           roles: ['super_admin','clinic_manager'] },
  { href: '/reports',         icon: BarChart3,       labelKey: 'reports',       label: 'Reports',             roles: ['super_admin','clinic_manager','accountant'] },
  { href: '/notifications',   icon: Bell,            labelKey: 'notifications', label: 'Notifications',       roles: ['*'] },
  { href: '/settings',        icon: Settings,        labelKey: 'settings',      label: 'Settings',            roles: ['super_admin','clinic_manager'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const filteredNav = NAV.filter(n =>
    n.roles.includes('*') || n.roles.includes(user?.role || '')
  )

  const NavItem = ({ item }: { item: NavItemConfig }) => {
    const active = pathname.startsWith(item.href)
    const Icon = item.icon
    const displayLabel = item.labelKey ? t(item.labelKey, item.label) : item.label
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn('nav-link', active && 'active')}
        title={collapsed ? displayLabel : undefined}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {!collapsed && <span className="truncate">{displayLabel}</span>}
        {!collapsed && active && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('p-4 border-b border-slate-100 dark:border-slate-800', collapsed ? 'px-3' : 'px-5')}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-black text-xs text-slate-900 dark:text-white leading-tight tracking-wide">{t('brandTitle')}</p>
              <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">{t('practiceSaas')}</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-slate-400 hover:text-slate-600 hidden lg:block"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => <NavItem key={item.href} item={item} />)}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
        <button onClick={toggleTheme} className="nav-link w-full">
          {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
          {!collapsed && <span>{theme === 'dark' ? t('lightMode', 'Light Mode') : t('darkMode', 'Dark Mode')}</span>}
        </button>
        <button onClick={logout} className="nav-link w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600">
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{t('signOut', 'Sign Out')}</span>}
        </button>

        {!collapsed && user && (
          <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
              {getInitials(user.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.fullName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden lg:flex flex-col h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 overflow-hidden z-30"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden glass-card p-2"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 z-50 lg:hidden border-r border-slate-100 dark:border-slate-800"
            >
              <button className="absolute top-4 right-4 text-slate-400" onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
