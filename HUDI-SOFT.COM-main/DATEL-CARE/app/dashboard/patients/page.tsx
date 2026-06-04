"use client"

import { useState, useEffect } from "react"
import { db, Patient } from "@/lib/db-store"
import { Search, Plus, Filter, Heart, Edit2, Trash2, XCircle } from "lucide-react"

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)

  // Form Fields
  const [name, setName] = useState("")
  const [age, setAge] = useState<number>(30)
  const [gender, setGender] = useState("Male")
  const [phone, setPhone] = useState("")
  const [bloodType, setBloodType] = useState("O+")

  useEffect(() => {
    setPatients(db.getPatients())
  }, [])

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  )

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    let updated: Patient[] = []

    if (editingPatient) {
      updated = patients.map(p => 
        p.id === editingPatient.id 
          ? { ...p, name, age: Number(age), gender, phone, bloodType, lastVisit: new Date().toISOString().split('T')[0] } 
          : p
      )
    } else {
      const newPt: Patient = {
        id: `PT-${String(patients.length + 1).padStart(3, '0')}`,
        name,
        age: Number(age),
        gender,
        phone,
        bloodType,
        lastVisit: new Date().toISOString().split('T')[0]
      }
      updated = [...patients, newPt]
    }

    db.savePatients(updated)
    setPatients(updated)
    resetForm()
  }

  const handleEdit = (pt: Patient) => {
    setEditingPatient(pt)
    setName(pt.name)
    setAge(pt.age)
    setGender(pt.gender)
    setPhone(pt.phone)
    setBloodType(pt.bloodType)
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this patient profile?")) {
      const updated = patients.filter(p => p.id !== id)
      db.savePatients(updated)
      setPatients(updated)
    }
  }

  const resetForm = () => {
    setName("")
    setAge(30)
    setGender("Male")
    setPhone("")
    setBloodType("O+")
    setEditingPatient(null)
    setShowModal(false)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Patient Registry</h1>
          <p className="text-slate-500">Manage patient profiles and medical histories.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true) }}
          className="px-5 py-2.5 bg-clinical-600 text-white rounded-xl font-bold text-sm hover:bg-clinical-700 transition-colors shadow-md shadow-clinical-500/20 flex items-center gap-2"
        >
          <Plus size={18} /> Register Patient
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex-1 flex flex-col overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, ID, or phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 font-medium text-sm transition-all"
            />
          </div>
        </div>

        {/* Patient Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="p-4 pl-6">Patient ID</th>
                <th className="p-4">Name & Demographics</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Blood/Vitals</th>
                <th className="p-4">Last Visit</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="p-4 pl-6">
                    <span className="font-bold font-mono text-sm text-clinical-600 bg-clinical-50 dark:bg-clinical-500/10 px-2.5 py-1 rounded-lg">
                      {patient.id}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-slate-500">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{patient.name}</p>
                        <p className="text-xs text-slate-500">{patient.age} yrs • {patient.gender}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{patient.phone}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Heart size={14} className="text-rose-500" />
                      <span className="text-sm font-bold">{patient.bloodType}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-slate-500 font-medium">{patient.lastVisit}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(patient)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(patient.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">
              {editingPatient ? "Edit Patient Details" : "Register New Patient"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Full Name</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Age</label>
                  <input 
                    type="number" required value={age} onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Gender</label>
                  <select 
                    value={gender} onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Phone Number</label>
                <input 
                  type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Blood Type</label>
                <select 
                  value={bloodType} onChange={(e) => setBloodType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" onClick={resetForm}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-clinical-600 text-white rounded-xl font-bold text-sm hover:bg-clinical-700 shadow-md shadow-clinical-500/20"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
