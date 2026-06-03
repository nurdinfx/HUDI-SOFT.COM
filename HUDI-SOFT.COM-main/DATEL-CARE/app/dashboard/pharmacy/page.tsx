"use client"

import { useState, useEffect } from "react"
import { db, Medication } from "@/lib/db-store"
import { Pill, Search, Plus, AlertCircle, ShoppingCart, Trash2, Edit2 } from "lucide-react"

export default function PharmacyPage() {
  const [inventory, setInventory] = useState<Medication[]>([])
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingMed, setEditingMed] = useState<Medication | null>(null)

  // Form Fields
  const [name, setName] = useState("")
  const [category, setCategory] = useState("Antibiotics")
  const [stock, setStock] = useState<number>(100)
  const [minStock, setMinStock] = useState<number>(50)
  const [price, setPrice] = useState<number>(10)

  useEffect(() => {
    setInventory(db.getMedications())
  }, [])

  const filteredInv = inventory.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase()) ||
    item.id.toLowerCase().includes(search.toLowerCase())
  )

  const totalMedicines = inventory.length
  const lowStockCount = inventory.filter(item => item.stock <= item.minStock).length
  const totalStockValuation = inventory.reduce((acc, item) => acc + (item.stock * item.price), 0)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    let updated: Medication[] = []

    const computedStatus = stock === 0 ? "Out of Stock" : stock <= minStock ? "Low Stock" : "In Stock"

    if (editingMed) {
      updated = inventory.map(item => 
        item.id === editingMed.id 
          ? { ...item, name, category, stock: Number(stock), minStock: Number(minStock), price: Number(price), status: computedStatus } 
          : item
      )
    } else {
      const newMed: Medication = {
        id: `MED-${String(inventory.length + 1).padStart(3, '0')}`,
        name,
        category,
        stock: Number(stock),
        minStock: Number(minStock),
        price: Number(price),
        status: computedStatus
      }
      updated = [...inventory, newMed]
    }

    db.saveMedications(updated)
    setInventory(updated)
    resetForm()
  }

  const handleEdit = (med: Medication) => {
    setEditingMed(med)
    setName(med.name)
    setCategory(med.category)
    setStock(med.stock)
    setMinStock(med.minStock)
    setPrice(med.price)
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this medication from the inventory?")) {
      const updated = inventory.filter(item => item.id !== id)
      db.saveMedications(updated)
      setInventory(updated)
    }
  }

  const resetForm = () => {
    setName("")
    setCategory("Antibiotics")
    setStock(100)
    setMinStock(50)
    setPrice(10)
    setEditingMed(null)
    setShowModal(false)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Pill className="text-clinical-500" />
            Pharmacy & Inventory
          </h1>
          <p className="text-slate-500">Track medicine stock, e-prescriptions, and suppliers.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { resetForm(); setShowModal(true) }}
            className="px-5 py-2.5 bg-clinical-600 text-white rounded-xl font-bold text-sm hover:bg-clinical-700 transition-colors shadow-md shadow-clinical-500/20 flex items-center gap-2"
          >
            <Plus size={18} /> Add Medicine
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center"><Pill size={24} className="text-blue-500" /></div>
          <div><p className="text-sm font-bold text-slate-500">Unique Medicines</p><h3 className="text-2xl font-black">{totalMedicines}</h3></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-orange-200 dark:border-orange-950 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-orange-500" />
          <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center"><AlertCircle size={24} className="text-orange-500" /></div>
          <div><p className="text-sm font-bold text-slate-500">Low Stock Alerts</p><h3 className="text-2xl font-black">{lowStockCount} Items</h3></div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center"><ShoppingCart size={24} className="text-emerald-500" /></div>
          <div><p className="text-sm font-bold text-slate-500">Inventory Valuation</p><h3 className="text-2xl font-black">${totalStockValuation.toLocaleString()}</h3></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search medications..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 font-medium text-sm transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="p-4 pl-6">Code / Name</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Stock Level</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Unit Price</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredInv.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="p-4 pl-6">
                    <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-xs font-mono text-slate-500">{item.id}</p>
                  </td>
                  <td className="p-4"><span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.category}</span></td>
                  <td className="p-4 text-right">
                    <span className="font-bold text-lg">{item.stock}</span>
                    <p className="text-xs text-slate-400">Min: {item.minStock}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      item.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700' : 
                      item.status === 'Low Stock' ? 'bg-orange-100 text-orange-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-black text-slate-900 dark:text-white">${item.price.toFixed(2)}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
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
              {editingMed ? "Edit Medicine Details" : "Add New Stock Record"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Medication Name</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                  placeholder="e.g. Paracetamol 500mg"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Category</label>
                <select 
                  value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                >
                  <option value="Antibiotics">Antibiotics</option>
                  <option value="Painkillers">Painkillers</option>
                  <option value="Cardiovascular">Cardiovascular</option>
                  <option value="Antidiabetic">Antidiabetic</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Stock Level</label>
                  <input 
                    type="number" required value={stock} onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Min Threshold</label>
                  <input 
                    type="number" required value={minStock} onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Price per Unit ($)</label>
                <input 
                  type="number" step="0.01" required value={price} onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                />
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
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
