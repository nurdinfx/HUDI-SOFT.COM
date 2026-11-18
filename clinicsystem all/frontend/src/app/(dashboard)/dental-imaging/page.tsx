'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, Image as ImageIcon, ZoomIn, ZoomOut, RotateCw, Maximize2,
  Calendar, User, Plus, X, Eye, FileText, Check, Search, Download
} from 'lucide-react'
import api from '@/lib/api'

interface DentalImage {
  id: string
  patient_name: string
  doctor_name: string
  image_type: string
  title: string
  image_url: string
  tooth_numbers?: string
  clinical_notes?: string
  taken_at: string
}

const IMAGE_TYPES = [
  'All Types',
  'Panoramic',
  'Periapical',
  'Bitewing',
  'CBCT',
  'Intraoral',
  'Before/After'
]

export default function DentalImagingPage() {
  const [images, setImages] = useState<DentalImage[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('All Types')
  const [selectedImage, setSelectedImage] = useState<DentalImage | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Viewer tool states
  const [zoomLevel, setZoomLevel] = useState(1)
  const [rotation, setRotation] = useState(0)

  // Form states
  const [patientId, setPatientId] = useState('')
  const [imageType, setImageType] = useState('Panoramic')
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [toothNumbers, setToothNumbers] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')

  const loadImages = async () => {
    setLoading(true)
    try {
      const [imgRes, patRes] = await Promise.all([
        api.get('/dental/images'),
        api.get('/patients', { params: { limit: 100 } })
      ])
      setImages(imgRes.data || [])
      setPatients(patRes.data?.patients || [])
    } catch (err) {
      console.error('Failed to load dental imaging:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadImages() }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !title || !imageUrl) {
      alert('Please fill patient, title, and valid image URL')
      return
    }

    try {
      await api.post('/dental/images', {
        patientId,
        imageType,
        title,
        imageUrl,
        toothNumbers,
        clinicalNotes
      })
      setShowUploadModal(false)
      setTitle('')
      setImageUrl('')
      setClinicalNotes('')
      loadImages()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save dental image')
    }
  }

  const filteredImages = activeType === 'All Types'
    ? images
    : images.filter(img => img.image_type.toLowerCase() === activeType.toLowerCase())

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Camera className="text-blue-600" size={24} />
            Dental Imaging & Radiograph Center
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Panoramic, periapical, bitewing X-rays, CBCT scans, and clinical photography
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus size={16} /> Register Imaging Scan
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {IMAGE_TYPES.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeType === type
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Imaging Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full p-16 text-center text-xs text-slate-400">Loading radiographs...</div>
        ) : filteredImages.length === 0 ? (
          <div className="col-span-full p-16 text-center space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <Camera className="mx-auto text-slate-300 dark:text-slate-700" size={40} />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No radiographs uploaded yet</p>
            <p className="text-xs text-slate-400">Upload panoramic or periapical X-rays to build diagnostic records.</p>
          </div>
        ) : (
          filteredImages.map(img => (
            <div
              key={img.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all group flex flex-col justify-between"
            >
              <div
                onClick={() => {
                  setSelectedImage(img)
                  setZoomLevel(1)
                  setRotation(0)
                }}
                className="relative h-48 bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer"
              >
                <img
                  src={img.image_url}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    // Fallback visual
                    (e.target as any).src = 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80'
                  }}
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
                  {img.image_type}
                </span>
                <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="p-2 rounded-full bg-white text-slate-900 shadow-md">
                    <Maximize2 size={16} />
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-2">
                <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                  {img.title}
                </h4>
                <p className="text-xs text-slate-500">
                  Patient: <strong>{img.patient_name}</strong>
                </p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>{new Date(img.taken_at).toLocaleDateString()}</span>
                  <span>Tooth: #{img.tooth_numbers || 'Arch'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Advanced Lightbox Viewer */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-6">
            {/* Viewer Bar */}
            <div className="flex items-center justify-between text-white">
              <div>
                <h3 className="font-black text-lg">{selectedImage.title}</h3>
                <p className="text-xs text-slate-400">
                  Patient: {selectedImage.patient_name} • Modality: {selectedImage.image_type} • Date: {new Date(selectedImage.taken_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                  title="Rotate 90°"
                >
                  <RotateCw size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all ml-2"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Canvas Display */}
            <div className="flex-1 flex items-center justify-center overflow-hidden my-4">
              <motion.img
                src={selectedImage.image_url}
                alt={selectedImage.title}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out'
                }}
                className="max-h-[75vh] max-w-[85vw] object-contain drop-shadow-2xl rounded-2xl"
              />
            </div>

            {/* Clinical Annotations Footer */}
            {selectedImage.clinical_notes && (
              <div className="bg-white/10 text-white p-4 rounded-2xl max-w-3xl mx-auto backdrop-blur-md text-xs">
                <span className="font-bold text-blue-400 uppercase tracking-wider block mb-1">Dentist Radiographic Findings:</span>
                <p className="text-slate-300">{selectedImage.clinical_notes}</p>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="text-blue-600" size={18} /> Register Diagnostic Scan
                </h3>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Patient</label>
                    <select
                      required
                      value={patientId}
                      onChange={e => setPatientId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    >
                      <option value="">Select Patient...</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.fullName || p.full_name} ({p.patientNumber || p.patient_number})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Modality</label>
                    <select
                      value={imageType}
                      onChange={e => setImageType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    >
                      {IMAGE_TYPES.filter(t => t !== 'All Types').map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Scan Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Pre-Op Panoramic Survey or Periapical #16"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Secure Image URL / Cloudinary / Supabase Storage</label>
                  <input
                    type="url"
                    required
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Teeth Regions</label>
                  <input
                    type="text"
                    value={toothNumbers}
                    onChange={e => setToothNumbers(e.target.value)}
                    placeholder="e.g. 16, 17, Full Maxilla"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 block">Radiologist / Dentist Notes</label>
                  <textarea
                    rows={2}
                    value={clinicalNotes}
                    onChange={e => setClinicalNotes(e.target.value)}
                    placeholder="Periapical radiolucency, bone resorption, canal calcification..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20"
                  >
                    Save Scan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

