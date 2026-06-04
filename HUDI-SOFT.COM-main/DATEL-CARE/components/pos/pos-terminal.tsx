"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { 
    Search, Plus, Minus, Trash2, User, CreditCard, Receipt, 
    Activity, Pill, FileText, CheckCircle2, ChevronRight, X, 
    Printer, QrCode, Info, History, Loader2, RotateCcw, Calendar, 
    DollarSign, Wallet, Smartphone, Landmark, ShieldCheck
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { db, Patient, Customer, Medication, Invoice, Loan } from "@/lib/db-store"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface CatalogItem {
    id: string;
    name: string;
    type: 'medicine' | 'lab' | 'service';
    category: string;
    unitPrice: number;
    stock?: number;
}

interface POSItem {
    id: string;
    name: string;
    type: 'medicine' | 'lab' | 'service';
    category: string;
    unitPrice: number;
    quantity: number;
}

export function POSTerminal() {
    const [catalog, setCatalog] = useState<CatalogItem[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")

    const [cart, setCart] = useState<POSItem[]>([])
    const [discount, setDiscount] = useState<number>(0)
    const [insuranceCoverage, setInsuranceCoverage] = useState<number>(0)

    const [patients, setPatients] = useState<Patient[]>([])
    const [patientSearch, setPatientSearch] = useState("")
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

    const [paymentMethod, setPaymentMethod] = useState("Zaad") // Zaad, Sahal, Edahab, MyCash, Credit
    const [amountPaid, setAmountPaid] = useState<string>("")
    const [isProcessing, setIsProcessing] = useState(false)

    const [lastInvoice, setLastInvoice] = useState<any>(null)
    const [showReceipt, setShowReceipt] = useState(false)
    const [receiptMode, setReceiptMode] = useState<'review' | 'print'>('review')

    const [showHistory, setShowHistory] = useState(false)

    // Credit Customer State
    const [creditCustomers, setCreditCustomers] = useState<Customer[]>([])
    const [selectedCreditCustomer, setSelectedCreditCustomer] = useState<Customer | null>(null)

    // Load Initial Data from db-store
    useEffect(() => {
        const meds = db.getMedications()
        const pats = db.getPatients()
        const customers = db.getCustomers()
        
        const formattedMeds: CatalogItem[] = meds.map(m => ({
            id: m.id,
            name: m.name,
            type: 'medicine',
            category: 'Pharmacy',
            unitPrice: m.price,
            stock: m.stock
        }))

        // Mock Lab Tests for POS
        const mockLabs: CatalogItem[] = [
            { id: "L-001", name: "Complete Blood Count (CBC)", type: "lab", category: "Laboratory", unitPrice: 25.00 },
            { id: "L-002", name: "Lipid Profile", type: "lab", category: "Laboratory", unitPrice: 30.00 },
            { id: "L-003", name: "Liver Function Test", type: "lab", category: "Laboratory", unitPrice: 35.00 },
            { id: "L-004", name: "Urinalysis", type: "lab", category: "Laboratory", unitPrice: 15.00 },
            { id: "L-005", name: "Blood Sugar Fasting", type: "lab", category: "Laboratory", unitPrice: 10.00 }
        ]

        // Mock Services for POS
        const mockServices: CatalogItem[] = [
            { id: "S-001", name: "General Consultation", type: "service", category: "Clinical", unitPrice: 20.00 },
            { id: "S-002", name: "Specialist Consultation", type: "service", category: "Clinical", unitPrice: 50.00 },
            { id: "S-003", name: "Emergency Visit", type: "service", category: "Clinical", unitPrice: 100.00 },
            { id: "S-004", name: "Nursing Care (Daily)", type: "service", category: "IPD", unitPrice: 40.00 },
            { id: "S-005", name: "Ward Bed (Standard)", type: "service", category: "IPD", unitPrice: 80.00 }
        ]

        setCatalog([...formattedMeds, ...mockLabs, ...mockServices])
        setPatients(pats)
        setCreditCustomers(customers)
    }, [])

    // Filter Catalog
    const filteredCatalog = useMemo(() => {
        return catalog.filter(item => {
            const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
            const matchCategory = categoryFilter === "all" || item.type === categoryFilter
            return matchSearch && matchCategory
        })
    }, [catalog, searchTerm, categoryFilter])

    // Filter Patients
    const filteredPatients = useMemo(() => {
        if (!patientSearch) return [];
        return patients.filter(p =>
            p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
            p.id.toLowerCase().includes(patientSearch.toLowerCase()) ||
            p.phone?.includes(patientSearch)
        ).slice(0, 5)
    }, [patients, patientSearch])

    const handlePatientSelect = (patient: Patient) => {
        setSelectedPatient(patient)
        setPatientSearch("")
        setSelectedCreditCustomer(null)
    }

    // Cart Calculations
    const subtotal = cart.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 1)), 0)
    const totalBeforeInsurance = subtotal - discount
    const total = Math.max(0, totalBeforeInsurance - insuranceCoverage)

    const handleAddToCart = (item: CatalogItem) => {
        if (item.type === 'medicine' && (item.stock === undefined || item.stock <= 0)) {
            return toast.error("This medicine is out of stock")
        }

        setCart(prev => {
            const existing = prev.find(p => p.id === item.id)
            if (existing) {
                if (item.type === 'medicine' && existing.quantity >= (item.stock || 0)) {
                    toast.error("Cannot exceed available stock limit")
                    return prev
                }
                return prev.map(p => p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p)
            }
            return [...prev, {
                id: item.id,
                name: item.name,
                type: item.type,
                category: item.category,
                unitPrice: item.unitPrice,
                quantity: 1
            }]
        })
    }

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const catItem = catalog.find(c => c.id === id)
                const newQ = item.quantity + delta
                if (newQ < 1) return item
                if (catItem?.type === 'medicine' && newQ > (catItem.stock || 0)) {
                    toast.error("Cannot exceed available stock limit")
                    return item
                }
                return { ...item, quantity: newQ }
            }
            return item
        }))
    }

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id))
    }

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error("Cart is empty")

        setIsProcessing(true)
        try {
            const parsedDiscount = (typeof discount === 'string' ? parseFloat(discount) : discount) || 0
            const parsedAmountPaid = amountPaid === "" ? total : (parseFloat(amountPaid) || 0)
            
            // Build Offline Invoice
            const now = new Date()
            const invoices = db.getInvoices()
            const newInvoiceId = `INV-${now.getFullYear()}-${String(invoices.length + 100).padStart(3, "0")}`
            
            const customerName = selectedPatient ? selectedPatient.name : (selectedCreditCustomer ? selectedCreditCustomer.name : "Walk-In Patient")
            
            const newInvoice: Invoice = {
                id: newInvoiceId,
                patientName: customerName,
                date: now.toISOString().split("T")[0],
                amount: total,
                status: "Paid",
                method: paymentMethod
            }
            
            db.saveInvoices([newInvoice, ...invoices])
            
            // Reduce Medicine Stock in DB
            const meds = db.getMedications()
            const updatedMeds = meds.map(m => {
                const cartItem = cart.find(ci => ci.id === m.id)
                if (cartItem) {
                    const newStock = Math.max(0, m.stock - cartItem.quantity)
                    return { ...m, stock: newStock, status: newStock === 0 ? "Out of Stock" : newStock <= m.minStock ? "Low Stock" : "In Stock" }
                }
                return m
            })
            db.saveMedications(updatedMeds as Medication[])

            // Handle Credit Loan if method is Credit
            if (paymentMethod === "Credit" && selectedCreditCustomer) {
                const loans = db.getLoans()
                const customers = db.getCustomers()
                
                const newLoan: Loan = {
                    id: `LN-${now.getTime().toString().slice(-6)}`,
                    customerId: selectedCreditCustomer.id,
                    customerName: selectedCreditCustomer.name,
                    amount: total,
                    paid: 0,
                    remaining: total,
                    dueDate: new Date(now.setDate(now.getDate() + 30)).toISOString().split('T')[0],
                    method: "Credit",
                    status: "Active",
                    notes: `Credit Sale from ${newInvoiceId}`,
                    date: now.toISOString().split('T')[0]
                }
                
                db.saveLoans([newLoan, ...loans])
                
                // Update Customer Balance
                const updatedCustomers = customers.map(c => 
                    c.id === selectedCreditCustomer.id 
                    ? { ...c, totalBilled: c.totalBilled + total, creditBalance: c.creditBalance + total }
                    : c
                )
                db.saveCustomers(updatedCustomers as Customer[])
            }

            // Build Receipt Data
            const invoiceData = {
                invoiceId: newInvoiceId,
                patientName: customerName,
                userName: "Dr. Sarah Jenkins",
                items: cart.map(i => ({ description: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.unitPrice * i.quantity })),
                subtotal: subtotal,
                tax: 0,
                discount: parsedDiscount,
                total: total,
                paidAmount: parsedAmountPaid
            }

            setLastInvoice(invoiceData)
            toast.success("Transaction completed successfully! Accounts updated.")

            // Reduce local state stock cache
            setCatalog(prev => prev.map(c => {
                const cartItem = cart.find(ci => ci.id === c.id)
                if (cartItem && c.type === 'medicine' && c.stock !== undefined) {
                    return { ...c, stock: c.stock - cartItem.quantity }
                }
                return c;
            }))

            // Reset Form
            setCart([])
            setSelectedPatient(null)
            setDiscount(0)
            setInsuranceCoverage(0)
            setAmountPaid("")
            setPatientSearch("")
            setSelectedCreditCustomer(null)
            setReceiptMode('review')
            setShowReceipt(true)
        } catch (err: any) {
            toast.error(err.message || "Checkout failed.")
        } finally {
            setIsProcessing(false)
        }
    }

    const handlePrintReceipt = () => {
        const printContent = document.getElementById('thermal-receipt-content')
        if (!printContent) return

        const iframe = document.createElement('iframe')
        iframe.style.position = 'absolute'
        iframe.style.top = '-1000px'
        document.body.appendChild(iframe)

        const doc = iframe.contentWindow?.document
        if (doc) {
            doc.open()
            doc.write(`
                <html>
                <head>
                    <title>Receipt</title>
                    <style>
                        @page { size: 58mm auto; margin: 0; }
                        body { padding: 0; margin: 0; background: #fff; width: 58mm; color: #000; font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; text-align: center; }
                        .thermal-receipt { padding: 2mm 1mm; }
                        .thermal-title { font-size: 18px; font-weight: 800; margin-bottom: 2px; }
                        .thermal-subtitle { font-size: 14px; font-weight: 600; margin-bottom: 1px; }
                        .thermal-info { font-size: 12px; margin-bottom: 5px; text-align: left; padding: 0 2mm; }
                        .thermal-separator { border-top: 1px dashed #000; margin: 5px 0; }
                        .thermal-table { width: 100%; text-align: left; border-collapse: collapse; font-size: 12px; padding: 0 1mm; }
                        .thermal-table th { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; font-weight: bold; }
                        .thermal-table td { padding: 4px 0; }
                        .thermal-totals { border-top: 1px dashed #000; padding: 5px 2mm; text-align: left; }
                        .thermal-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    ${printContent.outerHTML}
                </body>
                </html>
            `)
            doc.close()

            setTimeout(() => {
                iframe.contentWindow?.focus()
                iframe.contentWindow?.print()
                setTimeout(() => { document.body.removeChild(iframe) }, 1000)
            }, 250)
        }
    }

    const PAYMENT_METHODS = [
        { id: 'Zaad', label: 'ZAAD', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { id: 'Sahal', label: 'SAHAL', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
        { id: 'Edahab', label: 'EDAHAB', icon: Smartphone, color: 'text-purple-500', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
        { id: 'MyCash', label: 'MYCASH', icon: Landmark, color: 'text-indigo-500', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        { id: 'Credit', label: 'CREDIT', icon: History, color: 'text-rose-500', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    ]

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-100/50 rounded-2xl border border-slate-200 shadow-sm relative">
            
            {/* TOP HEADER */}
            <div className="h-16 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between shrink-0 z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-clinical-100 rounded-xl flex items-center justify-center text-clinical-600">
                        <Wallet className="size-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900 leading-tight">Billing & POS</h2>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Fast Checkout Terminal</p>
                    </div>
                </div>

                <div className="flex-1 max-w-md mx-8 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <QrCode className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input
                        placeholder="Scan patient QR or search by name/ID..."
                        className="pl-10 h-10 bg-white shadow-sm border-slate-200 rounded-xl font-medium focus-visible:ring-clinical-500/20 transition-all"
                        value={patientSearch}
                        onChange={e => setPatientSearch(e.target.value)}
                    />
                    {patientSearch && (
                        <div className="absolute top-12 left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2 focus-within:ring-2">
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map((p) => (
                                    <div
                                        key={p.id}
                                        className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex flex-col transition-colors"
                                        onClick={() => handlePatientSelect(p)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-mono mt-0.5">{p.id} • {p.phone || 'No Phone'}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center">
                                    <User className="size-6 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-slate-600">No patients found</p>
                                    <p className="text-xs text-slate-400">Press enter to use as Walk-in Patient</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {selectedPatient ? (
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 pl-3 pr-1 py-1 rounded-full animate-in zoom-in-95">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-emerald-900 leading-none">{selectedPatient.name}</span>
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{selectedPatient.id}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700" onClick={() => setSelectedPatient(null)}>
                                <X className="size-3" />
                            </Button>
                        </div>
                    ) : selectedCreditCustomer ? (
                        <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 pl-3 pr-1 py-1 rounded-full animate-in zoom-in-95">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-rose-900 leading-none">{selectedCreditCustomer.name}</span>
                                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">{selectedCreditCustomer.id}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700" onClick={() => setSelectedCreditCustomer(null)}>
                                <X className="size-3" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Badge variant="outline" className="border-slate-300 text-slate-500 px-3 py-1 font-semibold uppercase tracking-widest text-[10px]">
                                Walking Customer
                            </Badge>
                        </div>
                    )}
                    
                    <Button variant="outline" size="sm" className="h-9 gap-2 ml-2 shadow-sm rounded-xl border-slate-200" onClick={() => setShowHistory(true)} disabled={!selectedPatient}>
                        <History className="size-4" />
                        <span className="hidden xl:inline">History</span>
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                
                {/* LEFT COLLABORATIVE PANEL: Catalog & Search */}
                <div className="w-[45%] flex flex-col bg-slate-50 border-r border-slate-200">
                    <div className="p-4 shrink-0 border-b border-slate-200 bg-white">
                        <Tabs defaultValue="all" value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
                            <TabsList className="w-full grid grid-cols-4 h-10 p-1 bg-slate-100 rounded-xl">
                                <TabsTrigger value="all" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">All</TabsTrigger>
                                <TabsTrigger value="medicine" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Pharmacy</TabsTrigger>
                                <TabsTrigger value="lab" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Labs</TabsTrigger>
                                <TabsTrigger value="service" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Services</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="relative mt-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <Input
                                placeholder="Search catalog items..."
                                className="pl-9 h-10 bg-slate-100 border-transparent rounded-xl text-sm font-medium focus-visible:bg-white transition-colors focus-visible:ring-1 focus-visible:ring-clinical-500/30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <ScrollArea className="flex-1 p-4">
                        <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                            {filteredCatalog.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => handleAddToCart(item)}
                                    className="group bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-clinical-500/50 hover:shadow-md transition-all flex flex-col gap-2 relative overflow-hidden h-[120px] select-none"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className={cn("text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md font-bold", 
                                            item.type === 'medicine' ? "bg-emerald-50 text-emerald-600" : 
                                            item.type === 'lab' ? "bg-blue-50 text-blue-600" : 
                                            "bg-purple-50 text-purple-600"
                                        )}>
                                            {item.category}
                                        </div>
                                        {item.type === 'medicine' && (
                                            <span className={cn("text-[10px] font-black", (item.stock || 0) > 10 ? 'text-emerald-500' : 'text-rose-500')}>
                                                {item.stock} LEFT
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-auto">
                                        <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{item.name}</h4>
                                        <p className="text-base font-black text-slate-700 mt-1">${item.unitPrice.toLocaleString()}</p>
                                    </div>
                                    <div className="absolute opacity-0 group-hover:opacity-100 bottom-3 right-3 bg-clinical-600 text-white p-1.5 rounded-full transition-all scale-75 group-hover:scale-100 shadow-sm">
                                        <Plus className="size-4" />
                                    </div>
                                </div>
                            ))}
                            {filteredCatalog.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
                                    <Search className="size-8 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">No catalog items found.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* RIGHT COLLABORATIVE PANEL: Cart & Payment */}
                <div className="w-[55%] flex flex-col bg-white">
                    {/* CART LIST */}
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-3">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-slate-400 py-32 opacity-60">
                                        <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                                            <Receipt className="size-10 stroke-1 text-slate-400" />
                                        </div>
                                        <p className="font-bold text-lg text-slate-600">Order is empty</p>
                                        <p className="text-sm font-medium">Add items from the catalog</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.id} className="group relative bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 flex gap-4 items-center hover:border-slate-300 transition-colors animate-in slide-in-from-bottom-2">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h5 className="font-bold text-slate-900 truncate text-sm leading-none">{item.name}</h5>
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 font-mono">${item.unitPrice.toLocaleString()}</p>
                                            </div>
                                            
                                            <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200/60">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => updateQuantity(item.id, -1)}>
                                                    <Minus className="size-3" />
                                                </Button>
                                                <span className="w-8 text-center font-black text-sm text-slate-700">{item.quantity}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => updateQuantity(item.id, 1)}>
                                                    <Plus className="size-3" />
                                                </Button>
                                            </div>
                                            
                                            <div className="w-20 text-right">
                                                <span className="font-black text-slate-900 block">${(item.unitPrice * item.quantity).toLocaleString()}</span>
                                            </div>
                                            
                                            <Button variant="ghost" size="icon" className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-sm" onClick={() => removeFromCart(item.id)}>
                                                <X className="size-3" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* PAYMENT CONTROLS */}
                    <div className="shrink-0 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10 flex flex-col">
                        
                        {/* Calculations Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-100 divide-x divide-slate-100">
                            <div className="p-3 px-4 flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subtotal</span>
                                <span className="text-base font-bold text-slate-900">${subtotal.toLocaleString()}</span>
                            </div>
                            <div className="p-3 px-4 flex flex-col relative group">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-clinical-500 transition-colors cursor-pointer border-b border-dashed border-slate-300 w-fit">Discount</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-base font-bold text-slate-900">-</span>
                                    <Input 
                                        type="number" 
                                        className="h-6 w-full px-1 py-0 text-base font-bold bg-transparent border-0 border-b border-transparent focus-visible:border-clinical-500 focus-visible:ring-0 rounded-none shadow-none" 
                                        value={discount || ''}
                                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                        placeholder="$0.00"
                                    />
                                </div>
                            </div>
                            <div className="p-3 px-4 flex flex-col relative group">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-cyan-500 transition-colors cursor-pointer border-b border-dashed border-slate-300 w-fit flex items-center gap-1">
                                    Insurance <ShieldCheck className="size-3" />
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="text-base font-bold text-slate-900">-</span>
                                    <Input 
                                        type="number" 
                                        className="h-6 w-full px-1 py-0 text-base font-bold bg-transparent border-0 border-b border-transparent focus-visible:border-cyan-500 focus-visible:ring-0 rounded-none shadow-none text-cyan-700" 
                                        value={insuranceCoverage || ''}
                                        onChange={(e) => setInsuranceCoverage(parseFloat(e.target.value) || 0)}
                                        placeholder="$0.00"
                                    />
                                </div>
                            </div>
                            <div className="p-3 px-4 flex flex-col bg-emerald-50/50">
                                <span className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Total Due</span>
                                <span className="text-2xl font-black text-emerald-600 tracking-tighter leading-none">${total.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="p-4 flex flex-col gap-4">
                            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                                {PAYMENT_METHODS.map(method => (
                                    <button
                                        key={method.id}
                                        onClick={() => setPaymentMethod(method.id)}
                                        className={cn(
                                            "flex items-center justify-center gap-2 h-10 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap outline-none",
                                            paymentMethod === method.id 
                                                ? method.bg + ' shadow-sm ring-2 ring-offset-1 ' + method.color.replace('text-', 'ring-')
                                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                        )}
                                    >
                                        <method.icon className="size-4" />
                                        {method.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                {paymentMethod !== 'Credit' && (
                                    <div className="w-1/3 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-bold">$</span>
                                        </div>
                                        <Input
                                            className="h-14 bg-white border-slate-200 text-slate-900 font-black text-lg text-center rounded-2xl focus-visible:ring-emerald-500 shadow-sm"
                                            placeholder="Tend. Amount"
                                            value={amountPaid}
                                            onChange={e => setAmountPaid(e.target.value)}
                                        />
                                    </div>
                                )}
                                
                                {paymentMethod === 'Credit' && (
                                    <div className="w-full relative">
                                        <div className="flex flex-col gap-2">
                                            <Select 
                                                value={selectedCreditCustomer?.id || ""} 
                                                onValueChange={(value) => {
                                                    const customer = creditCustomers.find(c => c.id === value);
                                                    setSelectedCreditCustomer(customer || null);
                                                    setSelectedPatient(null);
                                                }}
                                            >
                                                <SelectTrigger className="h-14 bg-white border-slate-200 text-slate-900 font-bold rounded-2xl focus:ring-rose-500 shadow-sm px-4">
                                                    <div className="flex items-center gap-3">
                                                        <User className="size-4 text-slate-400" />
                                                        <SelectValue placeholder="Select Credit Customer..." />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl max-h-[300px]">
                                                    {creditCustomers.length > 0 ? (
                                                        creditCustomers.map((c) => (
                                                            <SelectItem key={c.id} value={c.id} className="p-3 border-b border-slate-50 last:border-0">
                                                                <div className="flex flex-col text-left">
                                                                    <div className="flex justify-between items-center gap-4">
                                                                        <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                                                                        <Badge variant="outline" className="text-[9px] text-rose-600 border-rose-200 bg-rose-50 font-bold shrink-0">
                                                                            ${c.creditBalance.toLocaleString()} Owed
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[10px] text-slate-500 font-mono">{c.id}</span>
                                                                    </div>
                                                                </div>
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center">
                                                            <p className="text-sm font-medium text-slate-600">No customers found</p>
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                                
                                <Button
                                    className="flex-1 h-14 rounded-2xl text-lg font-black tracking-widest uppercase bg-slate-900 text-white hover:bg-slate-800 shadow-xl transition-all hover:translate-y-[-2px] hover:shadow-2xl active:translate-y-[0px] disabled:opacity-50 disabled:hover:translate-y-0"
                                    disabled={
                                        cart.length === 0 || 
                                        isProcessing || 
                                        (paymentMethod === 'Credit' && !selectedCreditCustomer)
                                    }
                                    onClick={handleCheckout}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="size-5 animate-spin md:mr-2" />
                                    ) : (
                                        <CheckCircle2 className="size-5 md:mr-2" />
                                    )}
                                    <span className="hidden md:inline">
                                        {isProcessing ? "PROCESSING..." : `TENDER $${total.toLocaleString()}`}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PATIENT HISTORY MODAL */}
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                    <DialogHeader className="p-8 border-b bg-slate-900 text-white shrink-0">
                        <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight">
                            <History className="size-6 text-clinical-400" />
                            Financial History
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium">
                            Records for {selectedPatient?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden p-8 text-center text-slate-500">
                        Patient historical invoices will load here in the full version.
                    </div>
                </DialogContent>
            </Dialog>

             {/* RECEIPT MODAL */}
             <Dialog open={showReceipt} onOpenChange={(open) => { if (!open) setShowReceipt(false) }}>
                <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-slate-50 border-b">
                        <DialogTitle className="sr-only">Transaction Receipt</DialogTitle>
                        <div className="flex flex-col items-center justify-center text-center space-y-2 py-4">
                            <div className={`h-16 w-16 ${receiptMode === 'review' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'} rounded-full flex items-center justify-center mb-2`}>
                                {receiptMode === 'review' ? <Info className="size-8" /> : <CheckCircle2 className="size-8" />}
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                                {receiptMode === 'review' ? 'Review Receipt' : 'Payment Successful'}
                            </h3>
                            <p className="text-sm font-bold text-slate-500">
                                {receiptMode === 'review' ? 'Please verify details before printing' : `Transaction ID: ${lastInvoice?.invoiceId}`}
                            </p>
                        </div>
                    </DialogHeader>

                    {/* Visible Review Section */}
                    <div className="p-4 bg-slate-50 border-y border-dashed border-slate-200">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-h-[300px] overflow-y-auto">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                                    <span className="text-xs font-black uppercase text-slate-400">Items Scan</span>
                                    <span className="text-xs font-mono font-bold text-slate-500">#{lastInvoice?.invoiceId || 'PENDING'}</span>
                                </div>
                                <div className="space-y-3">
                                    {lastInvoice?.items?.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900">{item.description}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase">{item.quantity} x ${item.unitPrice}</span>
                                            </div>
                                            <span className="font-black text-slate-900">${item.total}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-slate-200 space-y-1">
                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>Subtotal</span>
                                        <span>${lastInvoice?.subtotal}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>Tax</span>
                                        <span>${lastInvoice?.tax}</span>
                                    </div>
                                    {lastInvoice?.discount > 0 && (
                                        <div className="flex justify-between text-xs font-bold text-rose-500">
                                            <span>Discount</span>
                                            <span>-${lastInvoice?.discount}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-black text-slate-900 pt-2 text-emerald-600">
                                        <span>TOTAL PAID</span>
                                        <span>${lastInvoice?.total}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Printable Receipt Area container */}
                    <div className="hidden">
                        <div id="thermal-receipt-content" className="thermal-receipt">
                            <div className="thermal-header">
                                <div className="thermal-title">Hudi Datel Care Clinic</div>
                                <div className="thermal-subtitle">Health & Care Center</div>
                            </div>

                            <div className="thermal-info">
                                <div><span className="thermal-label">Receipt Number : </span>{lastInvoice?.invoiceId}</div>
                                <div><span className="thermal-label">Served By : </span>{lastInvoice?.userName}</div>
                                <div><span className="thermal-label">Customer : </span>{lastInvoice?.patientName}</div>
                                <div><span className="thermal-label">Date : </span>{lastInvoice ? format(new Date(), "dd/MM/yyyy HH:mm") : ''}</div>
                            </div>

                            <table className="thermal-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '45%' }}>Item.</th>
                                        <th style={{ width: '15%', textAlign: 'center' }}>No.</th>
                                        <th style={{ width: '15%', textAlign: 'center' }}>Price.</th>
                                        <th style={{ width: '25%', textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lastInvoice?.items?.map((item: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ wordBreak: 'break-word', fontWeight: 'bold' }}>{item.description}</td>
                                            <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'center' }}>{Number(item.unitPrice).toFixed(1)}</td>
                                            <td style={{ textAlign: 'right' }}>{Number(item.total).toFixed(1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="thermal-separator"></div>

                            <div className="thermal-totals">
                                <div className="thermal-row">
                                    <span>Vat @ 0 %</span>
                                    <span>0.0</span>
                                </div>
                                <div className="thermal-row">
                                    <span>Paid Amount</span>
                                    <span>{Number(lastInvoice?.paidAmount || lastInvoice?.total || 0).toFixed(0)}</span>
                                </div>
                                <div className="thermal-separator"></div>
                                <div className="thermal-row" style={{ fontWeight: 'bold' }}>
                                    <span>Total : {Number(lastInvoice?.total || 0).toFixed(1)}</span>
                                </div>
                            </div>

                            <div className="thermal-separator"></div>

                            <div className="thermal-footer">
                                <div style={{ marginBottom: '5px', textTransform: 'uppercase' }}>Thank you for visiting us</div>
                                <div style={{ fontSize: '10px' }}>Powered by HUDI-SOFT</div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-slate-100 flex gap-3 sm:justify-center">
                        <Button variant="outline" className="h-12 rounded-xl font-bold uppercase tracking-widest text-xs flex-1 border-slate-300" onClick={() => setShowReceipt(false)}>
                            NEW SALE
                        </Button>
                        <Button
                            className="h-12 rounded-xl font-bold uppercase tracking-widest text-xs flex-1 shadow-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => {
                                handlePrintReceipt()
                                setReceiptMode('print')
                            }}
                        >
                            <Printer className="size-4 mr-2" /> PRINT RECEIPT
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
