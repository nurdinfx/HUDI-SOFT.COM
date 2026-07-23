'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Building2, Users, Shield, Bell, CreditCard, Save, Loader2, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { ClinicUser } from '@/types'
import { formatDate, getInitials } from '@/lib/utils'

const TABS = [
  { id: 'clinic', label: 'Clinic Profile', icon: Building2 },
  { id: 'staff', label: 'Staff Management', icon: Users },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'account', label: 'My Account', icon: Shield },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('clinic')
  const [saving, setSaving] = useState(false)
  const [clinic, setClinic] = useState<any>(null)
  const [staff, setStaff] = useState<ClinicUser[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [staffForm, setStaffForm] = useState({ fullName:'', email:'', password:'', role:'receptionist', phone:'', specialization:'' })
  const [profileForm, setProfileForm] = useState({ fullName:'', phone:'', specialization:'', currentPassword:'', newPassword:'' })

  useEffect(() => {
    api.get('/clinic').then(r => setClinic(r.data)).catch(() => {})
    api.get('/clinic/subscription').then(r => setSubscription(r.data)).catch(() => {})
    if (['clinic_manager','super_admin'].includes(user?.role || '')) {
      api.get('/clinic/staff').then(r => setStaff(r.data)).catch(() => {})
    }
    setProfileForm(p => ({ ...p, fullName: user?.fullName || '', phone: '', specialization: user?.specialization || '' }))
  }, [user])

  const saveClinic = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.put('/clinic', clinic)
      setClinic(data)
      alert('Clinic settings saved!')
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await api.post('/clinic/staff', staffForm)
      setStaff(s => [...s, data])
      setShowStaffForm(false)
      setStaffForm({ fullName:'', email:'', password:'', role:'receptionist', phone:'', specialization:'' })
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
  }

  const toggleStaffActive = async (id: string, current: boolean) => {
    try {
      const { data } = await api.put(`/clinic/staff/${id}`, { isActive: !current })
      setStaff(s => s.map(u => u.id === id ? { ...u, isActive: !current } : u))
    } catch {}
  }

  const deleteStaff = async (id: string) => {
    if (!confirm('Remove this staff member?')) return
    try {
      await api.delete(`/clinic/staff/${id}`)
      setStaff(s => s.filter(u => u.id !== id))
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/auth/profile', profileForm)
      alert('Profile updated!')
    } catch (err: any) { alert(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const roleColors: Record<string, string> = {
    super_admin: 'badge-red', clinic_manager: 'badge-blue', doctor: 'badge-teal',
    receptionist: 'badge-gray', pharmacist: 'badge-yellow', lab_staff: 'badge-teal', accountant: 'badge-gray',
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage clinic configuration and preferences</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Tab nav */}
        <div className="lg:w-48 shrink-0">
          <div className="glass-card p-2 space-y-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <t.icon className="w-4 h-4 shrink-0" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {/* Clinic Profile */}
          {tab === 'clinic' && clinic && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">Clinic Profile</h2>
              <form onSubmit={saveClinic} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Clinic Name</label>
                    <input value={clinic.name || ''} onChange={e => setClinic({...clinic, name: e.target.value})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <input value={clinic.email || ''} disabled className="dcs-input opacity-60 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                    <input value={clinic.phone || ''} onChange={e => setClinic({...clinic, phone: e.target.value})} className="dcs-input" placeholder="+252…" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">City</label>
                    <input value={clinic.city || ''} onChange={e => setClinic({...clinic, city: e.target.value})} className="dcs-input" placeholder="Mogadishu" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Country</label>
                    <input value={clinic.country || ''} onChange={e => setClinic({...clinic, country: e.target.value})} className="dcs-input" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                    <input value={clinic.address || ''} onChange={e => setClinic({...clinic, address: e.target.value})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Currency</label>
                    <select value={clinic.currency || 'USD'} onChange={e => setClinic({...clinic, currency: e.target.value})} className="dcs-input">
                      {['USD','EUR','GBP','SAR','AED','KES','SOS'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Timezone</label>
                    <input value={clinic.timezone || ''} onChange={e => setClinic({...clinic, timezone: e.target.value})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Working Hours Start</label>
                    <input type="time" value={clinic.working_hours_start || '08:00'} onChange={e => setClinic({...clinic, working_hours_start: e.target.value})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Working Hours End</label>
                    <input type="time" value={clinic.working_hours_end || '17:00'} onChange={e => setClinic({...clinic, working_hours_end: e.target.value})} className="dcs-input" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Staff Management */}
          {tab === 'staff' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Staff Members</h2>
                <button onClick={() => setShowStaffForm(true)} className="btn-primary text-sm">
                  <Plus className="w-4 h-4" /> Add Staff
                </button>
              </div>

              <div className="space-y-3">
                {staff.map((u, i) => (
                  <motion.div key={u.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${u.isActive ? 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50' : 'border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 opacity-70'}`}>
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {getInitials(u.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{u.fullName}</p>
                      <p className="text-xs text-slate-500">{u.email}{u.specialization ? ` · ${u.specialization}` : ''}</p>
                    </div>
                    <span className={roleColors[u.role] || 'badge-gray'}>{u.role.replace('_',' ')}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleStaffActive(u.id, u.isActive)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium ${u.isActive ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      {u.id !== user?.id && (
                        <button onClick={() => deleteStaff(u.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Add Staff Form inline */}
              {showStaffForm && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-5 p-5 border-2 border-dashed border-primary/30 rounded-2xl">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Add New Staff Member</h3>
                  <form onSubmit={createStaff} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Full Name *</label>
                        <input required value={staffForm.fullName} onChange={e => setStaffForm({...staffForm, fullName: e.target.value})} className="dcs-input text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Email *</label>
                        <input required type="email" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} className="dcs-input text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Password *</label>
                        <div className="relative">
                          <input required type={showPw ? 'text' : 'password'} value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} className="dcs-input text-sm pr-10" />
                          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Role *</label>
                        <select required value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} className="dcs-input text-sm">
                          {['clinic_manager','doctor','receptionist','pharmacist','lab_staff','accountant'].map(r => (
                            <option key={r} value={r}>{r.replace('_',' ')}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Phone</label>
                        <input value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} className="dcs-input text-sm" placeholder="+252…" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Specialization</label>
                        <input value={staffForm.specialization} onChange={e => setStaffForm({...staffForm, specialization: e.target.value})} className="dcs-input text-sm" placeholder="General Medicine…" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => setShowStaffForm(false)} className="btn-secondary text-sm">Cancel</button>
                      <button type="submit" className="btn-primary text-sm">Add Staff Member</button>
                    </div>
                  </form>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Subscription */}
          {tab === 'subscription' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">Subscription Status</h2>
              {subscription ? (
                <div className="space-y-5">
                  <div className={`p-5 rounded-2xl border-2 ${subscription.subscriptionStatus === 'Active' || subscription.subscriptionStatus === 'Trial' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xl text-slate-900 dark:text-white">{subscription.subscriptionPlan} Plan</p>
                        <p className={`text-sm font-semibold mt-1 ${subscription.subscriptionStatus === 'Active' ? 'text-green-600' : subscription.subscriptionStatus === 'Trial' ? 'text-teal-600' : 'text-red-500'}`}>
                          {subscription.subscriptionStatus}
                        </p>
                      </div>
                      <div className={`text-4xl font-extrabold ${subscription.daysRemaining > 7 ? 'text-green-500' : 'text-red-500'}`}>
                        {subscription.daysRemaining}
                        <span className="text-sm font-normal text-slate-400 ml-1">days left</span>
                      </div>
                    </div>
                    {subscription.subscriptionExpiry && (
                      <p className="text-sm text-slate-500 mt-3">
                        Expires: <span className="font-semibold">{formatDate(subscription.subscriptionExpiry, 'long')}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {['Trial — 14 days', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Lifetime'].map(plan => (
                      <div key={plan} className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${subscription.subscriptionPlan === plan.split(' — ')[0] ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                        {plan}
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                      🏢 Subscription managed by HUDI SOFT Platform
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                      To renew, upgrade, or purchase a new plan, contact your HUDI SOFT account manager
                      or visit <a href="https://hudisoft.online" target="_blank" rel="noreferrer" className="underline font-semibold">hudisoft.online</a>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
                  <p>Loading subscription data…</p>
                </div>
              )}
            </motion.div>
          )}

          {/* My Account */}
          {tab === 'account' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">My Account</h2>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                    <input value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} className="dcs-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                    <input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="dcs-input" placeholder="+252…" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Specialization</label>
                    <input value={profileForm.specialization} onChange={e => setProfileForm({...profileForm, specialization: e.target.value})} className="dcs-input" placeholder="General Medicine…" />
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Change Password</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</label>
                      <input type="password" value={profileForm.currentPassword} onChange={e => setProfileForm({...profileForm, currentPassword: e.target.value})} className="dcs-input" placeholder="••••••••" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                      <input type="password" value={profileForm.newPassword} onChange={e => setProfileForm({...profileForm, newPassword: e.target.value})} className="dcs-input" placeholder="••••••••" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Profile</>}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
