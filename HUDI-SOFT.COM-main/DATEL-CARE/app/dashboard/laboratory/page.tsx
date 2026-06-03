"use client"

import { useState, useEffect } from "react"
import { db, LabTest } from "@/lib/db-store"
import { TestTube, Search, FileText, CheckCircle, Clock, Plus, Trash2, Edit2 } from "lucide-react"

export default function LaboratoryPage() {
  const [tests, setTests] = useState<LabTest[]>([])
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingTest, setEditingTest] = useState<LabTest | null>(null)

  // Form Fields
  const [patientName, setPatientName] = useState("")
  const [testName, setTestName] = useState("")
  const [status, setStatus] = useState<"Pending" | "Processing" | "Completed">("Pending")

  useEffect(() => {
    setTests(db.getLabs())
  }, [])

  const filteredTests = tests.filter(test =>
    test.patientName.toLowerCase().includes(search.toLowerCase()) ||
    test.testName.toLowerCase().includes(search.toLowerCase()) ||
    test.id.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    let updated: LabTest[] = []

    if (editingTest) {
      updated = tests.map(t => 
        t.id === editingTest.id 
          ? { ...t, patientName, testName, status, date: new Date().toISOString().split('T')[0] } 
          : t
      )
    } else {
      const newTest: LabTest = {
        id: `LAB-${String(tests.length + 1042).padStart(4, '0')}`,
        patientName,
        testName,
        status,
        date: new Date().toISOString().split('T')[0]
      }
      updated = [...tests, newTest]
    }

    db.saveLabs(updated)
    setTests(updated)
    resetForm()
  }

  const handleEdit = (test: LabTest) => {
    setEditingTest(test)
    setPatientName(test.patientName)
    setTestName(test.testName)
    setStatus(test.status)
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this lab test request?")) {
      const updated = tests.filter(t => t.id !== id)
      db.saveLabs(updated)
      setTests(updated)
    }
  }

  const resetForm = () => {
    setPatientName("")
    setTestName("")
    setStatus("Pending")
    setEditingTest(null)
    setShowModal(false)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <TestTube className="text-purple-500" />
            Laboratory
          </h1>
          <p className="text-slate-500">Track test requests, process samples, and upload results.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true) }}
          className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors shadow-md shadow-purple-500/20 flex items-center gap-2"
        >
          <Plus size={18} /> Request Lab Test
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by patient, test name, or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="p-4 pl-6">Test ID</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Test Requested</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Result Document</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="p-4 pl-6 font-mono text-sm font-bold text-purple-600">{test.id}</td>
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{test.patientName}</td>
                  <td className="p-4 text-sm font-semibold">{test.testName}</td>
                  <td className="p-4">
                    <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                      test.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                      test.status === 'Processing' ? 'bg-blue-100 text-blue-700' : 
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {test.status === 'Completed' ? <CheckCircle size={12}/> : <Clock size={12}/>}
                      {test.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {test.status === 'Completed' ? (
                      <span className="flex items-center gap-2 mx-auto px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold w-fit">
                        <FileText size={14} className="text-purple-500" /> Lab_Result.pdf
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">Awaiting processing</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(test)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(test.id)}
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
              {editingTest ? "Update Lab Request" : "Request Lab Examination"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Patient Name</label>
                <input 
                  type="text" required value={patientName} onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Laboratory Test Name</label>
                <input 
                  type="text" required value={testName} onChange={(e) => setTestName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                  placeholder="e.g. Complete Blood Count (CBC)"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Status</label>
                <select 
                  value={status} onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                >
                  <option value="Pending">Pending Collection</option>
                  <option value="Processing">Processing Sample</option>
                  <option value="Completed">Completed & Verified</option>
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
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow-md shadow-purple-500/20"
                >
                  Save Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
