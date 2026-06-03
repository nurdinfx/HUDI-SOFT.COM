"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard, Users, Calendar, 
  FileText, Pill, TestTube, CreditCard, Video, 
  UserCircle, BarChart3, LogOut, Menu, Wallet
} from "lucide-react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const [currentUser, setCurrentUser] = useState({ name: "Dr. Sarah Jenkins", role: "Chief Medical Officer" })

  useEffect(() => {
    const isAuth = localStorage.getItem("dc_auth")
    if (!isAuth) {
      router.push("/login")
    }

    const storedUser = localStorage.getItem("dc_current_user")
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser))
    }
  }, [router])

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Patients", href: "/dashboard/patients", icon: Users },
    { name: "Appointments", href: "/dashboard/appointments", icon: Calendar },
    { name: "Electronic Health Records", href: "/dashboard/ehr", icon: FileText },
    { name: "Pharmacy", href: "/dashboard/pharmacy", icon: Pill },
    { name: "Laboratory", href: "/dashboard/laboratory", icon: TestTube },
    { name: "Billing & POS", href: "/dashboard/billing", icon: CreditCard },
    { name: "Customers & Loans", href: "/dashboard/customers", icon: Wallet },
    { name: "Telemedicine", href: "/dashboard/telemedicine", icon: Video },
    { name: "Users & Roles", href: "/dashboard/users", icon: UserCircle },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  ]

  const handleLogout = () => {
    localStorage.removeItem("dc_auth")
    localStorage.removeItem("dc_current_user")
    router.push("/login")
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className={`bg-clinical-950 text-white transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-72' : 'w-20 lg:w-72'} shadow-2xl relative z-20`}>
        <div className="h-20 flex items-center justify-between px-5 border-b border-white/10">
          <div className={`flex items-center gap-3 overflow-hidden ${isSidebarOpen ? 'w-auto' : 'hidden lg:flex'}`}>
            <Image
              src="/logo.png"
              alt="Hudi Datel Care"
              width={40}
              height={40}
              className="rounded-xl shrink-0 shadow-lg"
            />
            <span className="font-black tracking-tight whitespace-nowrap text-base leading-tight">
              Hudi Datel<br /><span className="text-clinical-300 text-xs font-bold">Care System</span>
            </span>
          </div>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden text-slate-300 hover:text-white">
            <Menu size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          <div className={`px-2 mb-4 text-xs font-black uppercase tracking-widest text-clinical-400/60 ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
            Clinical Workflows
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all ${
                  isActive 
                  ? 'bg-clinical-600 text-white shadow-lg shadow-clinical-900/50' 
                  : 'text-clinical-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span className={`font-bold text-sm whitespace-nowrap ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-3 w-full rounded-xl text-clinical-200 hover:bg-red-500/10 hover:text-red-400 transition-all ${isSidebarOpen ? 'justify-start' : 'justify-center lg:justify-start'}`}
          >
            <LogOut size={20} className="shrink-0" />
            <span className={`font-bold text-sm whitespace-nowrap ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
        <header className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 z-10 shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Detail Care Operations</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sandbox Environment</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{currentUser.name}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-clinical-600">{currentUser.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-clinical-100 flex items-center justify-center border-2 border-clinical-200">
              <UserCircle size={24} className="text-clinical-700" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
