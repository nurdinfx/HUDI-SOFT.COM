"use client"

import { useState, useEffect } from "react"
import { db, EHRRecord, Patient } from "@/lib/db-store"
import { FileText, Plus, Search, Calendar, FileSignature, Stethoscope, TestTube, Edit2, Trash2 } from "lucide-react"

export default function EHRPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [records, setRecords] = useState<EHRRecord[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState("PT-092")
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<EHRRecord | null>(null)

  // Form Fields
  const [type, setType] = useState("Consultation")
  const [diagnosis, setDiagnosis] = useState("")
  const [notes, setNotes] = useState("")
  const [doctor, setDoctor] = useState("Dr. Sarah Jenkins")

  useEffect(() => {
    setPatients(db.getPatients())
    setRecords(db.getEHR())
  }, [])

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0]
  const patientRecords = records.filter(r => r.patientId === selectedPatientId)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    let updated: EHRRecord[] = []

    if (editingRecord) {
      updated = records.map(r => 
        r.id === editingRecord.id 
          ? { ...r, type, diagnosis, notes, doctor, date: new Date().toISOString().split('T')[0] } 
          : r
      )
    } else {
      const newRec: EHRRecord = {
        id: `EHR-${String(records.length + 1).padStart(3, '0')}`,
        patientId: selectedPatientId,
        date: new Date().toISOString().split('T')[0],
        doctor,
        type,
        diagnosis,
        notes
      }
      updated = [...records, newRec]
    }

    db.saveEHR(updated)
    setRecords(updated)
    resetForm()
  }

  const handleEdit = (rec: EHRRecord) => {
    setEditingRecord(rec)
    setType(rec.type)
    setDiagnosis(rec.diagnosis)
    setNotes(rec.notes)
    setDoctor(rec.doctor)
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this clinical record?")) {
      const updated = records.filter(r => r.id !== id)
      db.saveEHR(updated)
      setRecords(updated)
    }
  }

  const resetForm = () => {
    setType("Consultation")
    setDiagnosis("")
    setNotes("")
    setDoctor("Dr. Sarah Jenkins")
    setEditingRecord(null)
    setShowModal(false)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Electronic Health Records</h1>
          <p className="text-slate-500">Secure digital medical timelines and clinical notes.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-clinical-600 text-white rounded-xl font-bold text-sm hover:bg-clinical-700 transition-colors shadow-md shadow-clinical-500/20 flex items-center gap-2"
        >
          <Plus size={18} /> Add New Record
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
        
        {/* Left Side: Patient Selector & Summary */}
        <div className="lg:col-span-1 space-y-6 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Select Patient</h3>
            
            <div className="space-y-2 mb-6">
              {patients.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
                    selectedPatientId === p.id 
                      ? 'bg-clinical-50 dark:bg-clinical-500/10 border-clinical-200 text-clinical-800' 
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono font-bold">{p.id}</p>
                  </div>
                </button>
              ))}
            </div>

            {selectedPatient && (
              <div className="border-t border-slate-100 dark:border-slate-700 pt-6 space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Demographics Summary</h3>
                <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                  <p>Age/Gender: <span className="font-bold text-slate-800 dark:text-white">{selectedPatient.age} yrs • {selectedPatient.gender}</span></p>
                  <p>Contact: <span className="font-bold text-slate-800 dark:text-white">{selectedPatient.phone}</span></p>
                  <p>Blood Type: <span className="font-bold text-clinical-600">{selectedPatient.bloodType}</span></p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: EHR Timeline */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between mb-8 shrink-0">
            <h2 className="text-xl font-black flex items-center gap-2">
              <FileText size={24} className="text-clinical-500" />
              Medical Timeline for {selectedPatient?.name}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
            <div className="relative border-l-2 border-slate-100 dark:border-slate-700 ml-6 space-y-8 pb-8">
              {patientRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold">
                  No medical records found for this patient. Click "Add New Record" to generate one.
                </div>
              ) : (
                patientRecords.map((record, idx) => {
                  const Icon = record.type === 'Laboratory Result' ? TestTube : record.type === 'Follow-up' ? FileSignature : Stethoscope
                  return (
                    <div key={idx} className="relative pl-8">
                      <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-clinical-50 dark:bg-clinical-500/10 border-4 border-white dark:border-slate-800 flex items-center justify-center shadow-sm">
                        <Icon size={12} className="text-clinical-600" />
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow group relative">
                        
                        <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(record.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50">
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-black tracking-widest uppercase text-clinical-600">{record.type}</span>
                          <span className="text-xs font-bold text-slate-400 mr-12 group-hover:mr-20 transition-all">{record.date}</span>
                        </div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white mb-1">{record.diagnosis}</h4>
                        <p className="text-xs font-bold text-slate-500 mb-4">By {record.doctor}</p>
                        
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {record.notes}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">
              {editingRecord ? "Edit Medical Record" : "Add Patient Diagnosis & Note"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Record Type</label>
                <select 
                  value={type} onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                >
                  <option value="Consultation">Consultation Note</option>
                  <option value="Laboratory Result">Laboratory Result</option>
                  <option value="Follow-up">Clinical Follow-up</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Diagnosis / Assessment</label>
                <input 
                  type="text" required value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium"
                  placeholder="e.g. Acute Bronchitis"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Clinical Observations & Plan</label>
                <textarea 
                  required value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-clinical-500 text-sm font-medium h-28 resize-none"
                  placeholder="Write details of diagnosis, prescriptions, dosage..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Medical Officer</label>
                <input 
                  type="text" required value={doctor} onChange={(e) => setDoctor(e.target.value)}
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
