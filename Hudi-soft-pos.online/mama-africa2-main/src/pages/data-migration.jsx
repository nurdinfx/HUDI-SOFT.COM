import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Database, Upload, FileText, ChevronRight, ChevronLeft,
  CheckCircle, AlertTriangle, XCircle, Info, Download,
  RefreshCw, Clock, BarChart2, Zap, Shield, Package,
  Users, Truck, Briefcase, ShoppingCart, DollarSign,
  ArrowRight, Play, Pause, RotateCcw, Eye, History,
  Settings, Map, FileSpreadsheet, Archive, Search,
  Filter, TrendingUp, Activity, HardDrive, Star,
  Globe, AlertCircle, BookOpen, Layers, Target, Award
} from 'lucide-react';
import { migrationAPI } from '../api/realApi';
import {
  MIGRATION_CONNECTORS, TARGET_FIELDS, MAPPING_TEMPLATES,
  autoMapFields, validateRecords, parseCSV, parseXLSX, parseJSON
} from '../services/migrationConnectorService';

// ─── Step definitions ─────────────────────────────────────────────────────────
const WIZARD_STEPS = [
  { id: 1, label: 'Source', icon: Database },
  { id: 2, label: 'Upload', icon: Upload },
  { id: 3, label: 'Dry Run', icon: Eye },
  { id: 4, label: 'Mapping', icon: Map },
  { id: 5, label: 'Validate', icon: Shield },
  { id: 6, label: 'Options', icon: Settings },
  { id: 7, label: 'Backup', icon: HardDrive },
  { id: 8, label: 'Import', icon: Play },
  { id: 9, label: 'Report', icon: Award },
];

const ENTITY_OPTIONS = [
  { key: 'importProducts', label: 'Products', icon: Package, color: 'blue' },
  { key: 'importCustomers', label: 'Customers', icon: Users, color: 'green' },
  { key: 'importSuppliers', label: 'Suppliers', icon: Truck, color: 'orange' },
  { key: 'importEmployees', label: 'Employees', icon: Briefcase, color: 'purple' },
  { key: 'importCategories', label: 'Categories', icon: Layers, color: 'yellow' },
  { key: 'importInventory', label: 'Inventory', icon: Archive, color: 'red' },
  { key: 'importSalesHistory', label: 'Sales History', icon: TrendingUp, color: 'cyan' },
  { key: 'importPurchaseHistory', label: 'Purchase History', icon: ShoppingCart, color: 'indigo' },
  { key: 'importExpenses', label: 'Expenses', icon: DollarSign, color: 'rose' },
  { key: 'importOpeningBalances', label: 'Opening Balances', icon: BookOpen, color: 'teal' },
];

const IMPORT_STAGES = [
  { id: 'reading', label: 'Reading File...', icon: FileText },
  { id: 'validating', label: 'Validating Data...', icon: Shield },
  { id: 'backup', label: 'Creating Backup Snapshot...', icon: HardDrive },
  { id: 'preparing', label: 'Preparing Database...', icon: Database },
  { id: 'products', label: 'Importing Products...', icon: Package },
  { id: 'categories', label: 'Importing Categories...', icon: Layers },
  { id: 'customers', label: 'Importing Customers...', icon: Users },
  { id: 'suppliers', label: 'Importing Suppliers...', icon: Truck },
  { id: 'employees', label: 'Importing Employees...', icon: Briefcase },
  { id: 'finalizing', label: 'Finalizing Migration...', icon: CheckCircle },
  { id: 'complete', label: 'Completed Successfully!', icon: Award },
];

// ─── Score Ring Component ──────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const r = 42, circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="112" height="112" viewBox="0 0 112 112" className="transform -rotate-90">
      <circle cx="56" cy="56" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 1.2s ease-in-out' }} strokeLinecap="round" />
    </svg>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const DataMigration = () => {
  // Dashboard
  const [dashStats, setDashStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'wizard' | 'history'

  // Wizard
  const [step, setStep] = useState(1);
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedData, setParsedData] = useState({ headers: [], rows: [] });
  const [dryRunResult, setDryRunResult] = useState(null);
  const [fieldMappings, setFieldMappings] = useState({});
  const [entityType, setEntityType] = useState('product'); // for validation context
  const [validationResult, setValidationResult] = useState(null);
  const [importOptions, setImportOptions] = useState({
    importProducts: true, importCustomers: false, importSuppliers: false,
    importEmployees: false, importCategories: true, importInventory: false,
    importSalesHistory: false, importPurchaseHistory: false,
    importExpenses: false, importOpeningBalances: false,
    conflictResolution: 'skip', // 'skip' | 'update' | 'replace' | 'merge'
  });
  const [backupCreated, setBackupCreated] = useState(false);
  const [backupId, setBackupId] = useState(null);

  // Import progress
  const [importRunning, setImportRunning] = useState(false);
  const [importPaused, setImportPaused] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('reading');
  const [importReport, setImportReport] = useState(null);

  // History
  const [migrationLogs, setMigrationLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [rollbackTarget, setRollbackTarget] = useState(null);

  // Search & filter for history
  const [searchLogs, setSearchLogs] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // ─── Load Dashboard Stats ───────────────────────────────────────────────────
  const loadDashStats = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await migrationAPI.getDashboardStats();
      if (res.data?.success) {
        setDashStats(res.data.data);
      }
    } catch {
      // Backend not yet connected — show placeholders
      setDashStats(null);
    } finally {
      setDashLoading(false);
    }
  }, []);

  const loadMigrationLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await migrationAPI.getLogs();
      if (res.data?.success) {
        setMigrationLogs(res.data.data || []);
      }
    } catch {
      setMigrationLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashStats();
  }, [loadDashStats]);

  useEffect(() => {
    if (activeView === 'history') loadMigrationLogs();
  }, [activeView, loadMigrationLogs]);

  // ─── File Parsing ───────────────────────────────────────────────────────────
  const parseFile = useCallback(async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    let result = { headers: [], rows: [] };

    if (ext === 'csv') {
      const text = await file.text();
      result = parseCSV(text);
    } else if (ext === 'json') {
      const text = await file.text();
      result = parseJSON(text);
    } else if (['xlsx', 'xls'].includes(ext)) {
      const buf = await file.arrayBuffer();
      result = await parseXLSX(buf);
    } else if (['sql', 'db', 'sqlite'].includes(ext)) {
      // For SQL files, extract INSERT INTO values as best-effort
      const text = await file.text();
      const insertMatch = text.match(/INSERT INTO\s+`?\w+`?\s*\(([^)]+)\)\s*VALUES/i);
      if (insertMatch) {
        const headers = insertMatch[1].split(',').map(h => h.trim().replace(/`/g, ''));
        const rows = [];
        const valuePattern = /VALUES\s*\(([^;]+)\)/gi;
        let m;
        while ((m = valuePattern.exec(text)) !== null && rows.length < 500) {
          const vals = m[1].split("','").map(v => v.replace(/^'+|'+$/g, ''));
          const obj = {};
          headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
          rows.push(obj);
        }
        result = { headers, rows };
      }
    }

    return result;
  }, []);

  const handleFileSelected = useCallback(async (file) => {
    setUploadedFile(file);
    setUploadProgress(0);
    setParsedData({ headers: [], rows: [] });
    setDryRunResult(null);
    setFieldMappings({});
    setValidationResult(null);

    // Simulate upload progress
    for (let p = 0; p <= 100; p += 10) {
      await new Promise(r => setTimeout(r, 60));
      setUploadProgress(p);
    }

    toast.loading('Parsing file...', { id: 'parse' });
    try {
      const data = await parseFile(file);
      setParsedData(data);

      // Auto-map fields immediately after parsing
      if (data.headers.length > 0) {
        const autoMap = autoMapFields(data.headers);
        setFieldMappings(autoMap);
      }

      toast.success(`File parsed successfully — ${data.rows.length.toLocaleString()} records found`, { id: 'parse' });
    } catch (err) {
      toast.error('Failed to parse file. Please check the format.', { id: 'parse' });
    }
  }, [parseFile]);

  // Drag-and-drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
  }, [handleFileSelected]);

  // ─── Dry Run ────────────────────────────────────────────────────────────────
  const runDryRun = useCallback(() => {
    if (!parsedData.rows.length) return;

    // Detect entity type from mappings
    const mappingValues = Object.values(fieldMappings);
    let detectedEntity = 'product';
    if (mappingValues.some(v => v?.startsWith('customer_'))) detectedEntity = 'customer';
    else if (mappingValues.some(v => v?.startsWith('supplier_'))) detectedEntity = 'supplier';
    else if (mappingValues.some(v => v?.startsWith('employee_'))) detectedEntity = 'employee';
    setEntityType(detectedEntity);

    // Apply mappings to rows
    const normalizedRows = parsedData.rows.map(row => {
      const norm = {};
      Object.entries(fieldMappings).forEach(([src, tgt]) => {
        if (tgt && row[src] !== undefined) norm[tgt] = row[src];
      });
      return norm;
    });

    const result = validateRecords(normalizedRows, detectedEntity);
    setDryRunResult(result);
    setValidationResult(result);
  }, [parsedData, fieldMappings]);

  // ─── Migration Execution ────────────────────────────────────────────────────
  const handleExecuteMigration = async () => {
    if (!parsedData.rows.length) return;

    setImportRunning(true);
    setImportProgress(0);

    const stages = IMPORT_STAGES.filter(s => {
      if (s.id === 'products') return importOptions.importProducts;
      if (s.id === 'categories') return importOptions.importCategories;
      if (s.id === 'customers') return importOptions.importCustomers;
      if (s.id === 'suppliers') return importOptions.importSuppliers;
      if (s.id === 'employees') return importOptions.importEmployees;
      return true;
    });

    // Animate through stages
    for (let i = 0; i < stages.length - 1; i++) {
      setCurrentStage(stages[i].id);
      setImportProgress(Math.round((i / stages.length) * 90));
      await new Promise(r => setTimeout(r, 900));
    }

    try {
      const res = await migrationAPI.execute({
        source: selectedConnector?.name,
        fileName: uploadedFile?.name,
        rows: parsedData.rows,
        fieldMappings,
        options: importOptions,
      });

      setImportProgress(100);
      setCurrentStage('complete');

      if (res.data?.success) {
        const { summary, backupId: bid } = res.data.data;
        setBackupId(bid);
        setImportReport(summary);
        toast.success('🎉 Data migration completed successfully!');
        loadDashStats();
      } else {
        throw new Error(res.data?.message || 'Migration failed');
      }
    } catch (err) {
      toast.error(`Migration failed: ${err.response?.data?.message || err.message}`);
      setCurrentStage('reading');
      setImportRunning(false);
    } finally {
      setImportRunning(false);
    }
  };

  // ─── Rollback ───────────────────────────────────────────────────────────────
  const handleRollback = async (targetBackupId) => {
    if (!targetBackupId) return;
    const ok = window.confirm('⚠️ This will restore the database to the state BEFORE this migration. All newly imported data will be removed. Are you sure?');
    if (!ok) return;

    try {
      const res = await migrationAPI.rollback(targetBackupId);
      if (res.data?.success) {
        toast.success('✅ Migration rolled back successfully!');
        setRollbackTarget(null);
        loadMigrationLogs();
        loadDashStats();
      } else {
        toast.error(res.data?.message || 'Rollback failed');
      }
    } catch (err) {
      toast.error('Rollback failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedConnector(null);
    setUploadedFile(null);
    setUploadProgress(0);
    setParsedData({ headers: [], rows: [] });
    setDryRunResult(null);
    setFieldMappings({});
    setValidationResult(null);
    setImportOptions({ importProducts: true, importCustomers: false, importSuppliers: false, importEmployees: false, importCategories: true, importInventory: false, importSalesHistory: false, importPurchaseHistory: false, importExpenses: false, importOpeningBalances: false, conflictResolution: 'skip' });
    setBackupCreated(false);
    setBackupId(null);
    setImportRunning(false);
    setImportProgress(0);
    setCurrentStage('reading');
    setImportReport(null);
  };

  const goToStep = (s) => {
    if (s < step || canAdvance(step)) setStep(s);
  };

  const canAdvance = (currentStep) => {
    if (currentStep === 1) return !!selectedConnector;
    if (currentStep === 2) return uploadedFile && parsedData.rows.length > 0;
    if (currentStep === 3) return !!dryRunResult;
    if (currentStep === 4) return Object.keys(fieldMappings).length > 0;
    if (currentStep === 5) return true;
    if (currentStep === 6) return Object.values(importOptions).some(v => v === true && typeof v === 'boolean');
    if (currentStep === 7) return true;
    if (currentStep === 8) return !!importReport;
    return true;
  };

  // ─── Download Report ────────────────────────────────────────────────────────
  const downloadReport = (report) => {
    const lines = [
      '=== HUDI-SOFT POS — MIGRATION REPORT ===',
      `Date: ${new Date().toLocaleString()}`,
      `Source: ${selectedConnector?.name || 'File Import'}`,
      `File: ${uploadedFile?.name || 'N/A'}`,
      '',
      '--- SUMMARY ---',
      `Products Imported:    ${(report?.productsImported || 0).toLocaleString()}`,
      `Customers Imported:   ${(report?.customersImported || 0).toLocaleString()}`,
      `Suppliers Imported:   ${(report?.suppliersImported || 0).toLocaleString()}`,
      `Employees Imported:   ${(report?.employeesImported || 0).toLocaleString()}`,
      `Categories Imported:  ${(report?.categoriesImported || 0).toLocaleString()}`,
      `Duplicates Skipped:   ${(report?.duplicatesSkipped || 0).toLocaleString()}`,
      `Errors:               ${(report?.errorsFound || 0).toLocaleString()}`,
      `Warnings:             ${(report?.warningsCount || 0).toLocaleString()}`,
      `Duration:             ${report?.durationSeconds || 0}s`,
      `Database Status:      ${report?.healthStatus || 'Healthy'}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ─── RENDER ──────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-[#0f1629] via-[#111827] to-[#0f1629] border-b border-white/10 px-6 py-4 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg shadow-violet-900/40">
              <Database size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight leading-tight">Data Migration Center</h1>
              <p className="text-xs text-slate-400 font-medium">Enterprise Import Platform · Secure · Resumable · Audited</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
              { id: 'wizard', label: 'New Migration', icon: Zap },
              { id: 'history', label: 'History', icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setActiveView(id); if (id === 'wizard') resetWizard(); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${activeView === id ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ══════════════════ DASHBOARD VIEW ══════════════════ */}
        {activeView === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Products', value: dashStats?.importedProducts, icon: Package, color: 'from-blue-600 to-cyan-600', loading: dashLoading },
                { label: 'Customers', value: dashStats?.importedCustomers, icon: Users, color: 'from-green-600 to-emerald-600', loading: dashLoading },
                { label: 'Suppliers', value: dashStats?.importedSuppliers, icon: Truck, color: 'from-orange-600 to-amber-600', loading: dashLoading },
                { label: 'Employees', value: dashStats?.importedEmployees, icon: Briefcase, color: 'from-purple-600 to-violet-600', loading: dashLoading },
                { label: 'Sales Records', value: dashStats?.importedSales, icon: TrendingUp, color: 'from-cyan-600 to-sky-600', loading: dashLoading },
                { label: 'Purchase Records', value: dashStats?.importedPurchases, icon: ShoppingCart, color: 'from-rose-600 to-red-600', loading: dashLoading },
                { label: 'Last Migration', value: dashStats?.lastMigrationDate ? new Date(dashStats.lastMigrationDate).toLocaleDateString() : 'None', icon: Clock, color: 'from-teal-600 to-green-600', loading: dashLoading },
                { label: 'System Status', value: dashStats?.migrationStatus || 'Healthy', icon: Activity, color: 'from-slate-600 to-gray-600', loading: dashLoading },
              ].map(({ label, value, icon: Icon, color, loading }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition-all group">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  {loading ? (
                    <div className="h-7 w-20 bg-white/10 rounded-lg animate-pulse mb-1" />
                  ) : (
                    <div className="text-2xl font-black text-white">{typeof value === 'number' ? value.toLocaleString() : (value || '—')}</div>
                  )}
                  <div className="text-xs text-slate-400 font-medium mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-5">
              <button onClick={() => { setActiveView('wizard'); resetWizard(); }}
                className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-violet-900/60 to-indigo-900/40 border border-violet-500/30 hover:border-violet-400/60 hover:from-violet-800/70 transition-all group text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center shadow-xl shadow-violet-900/50 group-hover:scale-110 transition-transform">
                  <Zap size={28} className="text-white" />
                </div>
                <div>
                  <div className="font-extrabold text-white text-base">Start New Migration</div>
                  <div className="text-xs text-violet-300 mt-1">Import from Excel, CSV, SQL, JSON and more</div>
                </div>
              </button>

              <button onClick={() => setActiveView('history')}
                className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-white/10 hover:border-white/20 hover:bg-slate-700/50 transition-all group text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-600 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <History size={28} className="text-white" />
                </div>
                <div>
                  <div className="font-extrabold text-white text-base">Migration History</div>
                  <div className="text-xs text-slate-400 mt-1">View audit trail, reports, and rollback options</div>
                </div>
              </button>

              <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-emerald-900/40 to-teal-900/30 border border-emerald-500/20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-700 flex items-center justify-center shadow-xl">
                  <Shield size={28} className="text-white" />
                </div>
                <div>
                  <div className="font-extrabold text-white text-base">Auto Backup Active</div>
                  <div className="text-xs text-emerald-300 mt-1">Every migration creates a full rollback snapshot automatically</div>
                </div>
              </div>
            </div>

            {/* Supported Connectors */}
            <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-extrabold text-white mb-4 flex items-center gap-2"><Globe size={16} className="text-violet-400" /> Supported Migration Sources</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {MIGRATION_CONNECTORS.map(c => (
                  <div key={c.id} className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all ${c.available ? 'bg-white/5 border-white/15 hover:bg-white/10 cursor-pointer' : 'bg-white/3 border-white/8 opacity-60'}`}
                    onClick={() => c.available && (setActiveView('wizard'), setSelectedConnector(c), setStep(1))}>
                    <span className="text-2xl">{c.icon}</span>
                    <span className="text-xs font-bold text-slate-200 leading-tight">{c.name}</span>
                    {!c.available && (
                      <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-[9px] font-extrabold text-black px-1.5 py-0.5 rounded-full">SOON</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ WIZARD VIEW ══════════════════ */}
        {activeView === 'wizard' && (
          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="bg-white/4 border border-white/10 rounded-2xl p-5 overflow-x-auto">
              <div className="flex items-center gap-0 min-w-max">
                {WIZARD_STEPS.map((s, idx) => {
                  const Icon = s.icon;
                  const isCompleted = step > s.id;
                  const isCurrent = step === s.id;
                  const isAccessible = s.id <= step || (s.id === step + 1 && canAdvance(step));
                  return (
                    <React.Fragment key={s.id}>
                      <button onClick={() => isAccessible && goToStep(s.id)}
                        className={`flex flex-col items-center gap-1.5 px-3 transition-all ${isAccessible ? 'cursor-pointer' : 'cursor-default opacity-50'}`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all border-2 ${isCompleted ? 'bg-emerald-500 border-emerald-400 text-white' : isCurrent ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-900/50 scale-110' : 'bg-white/5 border-white/20 text-slate-400'}`}>
                          {isCompleted ? <CheckCircle size={16} /> : <Icon size={15} />}
                        </div>
                        <span className={`text-[10px] font-bold ${isCurrent ? 'text-violet-300' : isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>{s.label}</span>
                      </button>
                      {idx < WIZARD_STEPS.length - 1 && (
                        <div className={`h-0.5 w-8 flex-shrink-0 transition-all ${step > s.id ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div className="bg-white/4 border border-white/10 rounded-2xl overflow-hidden min-h-[500px]">

              {/* ── STEP 1: Select Source ── */}
              {step === 1 && (
                <div className="p-7">
                  <h2 className="text-xl font-black text-white mb-1">Select Migration Source</h2>
                  <p className="text-slate-400 text-sm mb-6">Choose the format or system you want to import data from.</p>

                  <div className="mb-6">
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">📂 File Formats</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {MIGRATION_CONNECTORS.filter(c => c.category === 'file').map(c => (
                        <button key={c.id} onClick={() => setSelectedConnector(c)}
                          className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${selectedConnector?.id === c.id ? 'border-violet-500 bg-violet-900/30 shadow-xl shadow-violet-900/30 scale-[1.03]' : 'border-white/10 bg-white/4 hover:border-white/25 hover:bg-white/8'}`}>
                          <span className="text-4xl">{c.icon}</span>
                          <div className="text-center">
                            <div className="font-extrabold text-white text-sm">{c.name}</div>
                            <div className="text-[11px] text-slate-400 mt-1 leading-tight">{c.description}</div>
                          </div>
                          {selectedConnector?.id === c.id && <CheckCircle size={18} className="text-violet-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">🌐 ERP & Cloud Connectors</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {MIGRATION_CONNECTORS.filter(c => c.category !== 'file').map(c => (
                        <div key={c.id} className="relative flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/3 opacity-60">
                          <span className="text-3xl">{c.icon}</span>
                          <div className="text-center">
                            <div className="font-bold text-slate-300 text-sm">{c.name}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Coming Soon</div>
                          </div>
                          <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-[9px] font-extrabold text-black px-1.5 py-0.5 rounded-full">SOON</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Upload ── */}
              {step === 2 && (
                <div className="p-7">
                  <h2 className="text-xl font-black text-white mb-1">Upload Your File</h2>
                  <p className="text-slate-400 text-sm mb-6">Drag & drop or click to upload. Supports {selectedConnector?.fileTypes?.join(', ') || '.csv, .xlsx, .json, .sql'}</p>

                  <div ref={dropZoneRef} onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${uploadedFile ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-white/20 bg-white/3 hover:border-violet-500/50 hover:bg-violet-950/10'}`}>
                    <input ref={fileInputRef} type="file" accept={selectedConnector?.acceptString || '.csv,.xlsx,.xls,.json,.sql,.db,.sqlite'} className="hidden"
                      onChange={e => e.target.files[0] && handleFileSelected(e.target.files[0])} />

                    {!uploadedFile ? (
                      <div>
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center mx-auto mb-4">
                          <Upload size={28} className="text-slate-400" />
                        </div>
                        <div className="font-extrabold text-white text-base mb-1">Drop file here or click to browse</div>
                        <div className="text-slate-400 text-sm">Maximum 100MB · {selectedConnector?.name || 'CSV, Excel, JSON, SQL'}</div>
                      </div>
                    ) : (
                      <div>
                        <CheckCircle size={48} className="text-emerald-400 mx-auto mb-3" />
                        <div className="font-extrabold text-white text-base">{uploadedFile.name}</div>
                        <div className="text-slate-400 text-sm mt-1">{(uploadedFile.size / 1024).toFixed(1)} KB · {parsedData.rows.length.toLocaleString()} records detected</div>
                      </div>
                    )}
                  </div>

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-400 mb-2">
                        <span>Processing file...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-600 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {parsedData.rows.length > 0 && (
                    <div className="mt-6 bg-white/5 rounded-xl border border-white/10 p-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        {[
                          { label: 'Total Records', value: parsedData.rows.length },
                          { label: 'Columns', value: parsedData.headers.length },
                          { label: 'File Size', value: uploadedFile ? `${(uploadedFile.size / 1024).toFixed(0)} KB` : '—' },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <div className="text-xl font-black text-white">{typeof value === 'number' ? value.toLocaleString() : value}</div>
                            <div className="text-xs text-slate-400">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3: Dry Run ── */}
              {step === 3 && (
                <div className="p-7">
                  <h2 className="text-xl font-black text-white mb-1">Dry Run Analysis</h2>
                  <p className="text-slate-400 text-sm mb-6">Preview your data without touching the database. Detect issues before importing.</p>

                  {!dryRunResult ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 rounded-full bg-violet-900/40 border-2 border-violet-500/40 flex items-center justify-center mx-auto mb-4">
                        <Eye size={32} className="text-violet-400" />
                      </div>
                      <h3 className="font-extrabold text-white text-base mb-2">Run Analysis</h3>
                      <p className="text-slate-400 text-sm mb-6">Click below to analyze {parsedData.rows.length.toLocaleString()} records and generate a readiness score.</p>
                      <button onClick={runDryRun}
                        className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-violet-900/40">
                        <span className="flex items-center gap-2"><Eye size={16} /> Run Dry Run Analysis</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Score Card */}
                      <div className="flex flex-col sm:flex-row items-center gap-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 rounded-2xl p-7">
                        <div className="relative flex items-center justify-center">
                          <ScoreRing score={dryRunResult.score} />
                          <div className="absolute text-center">
                            <div className="text-3xl font-black text-white">{dryRunResult.score}%</div>
                            <div className="text-[11px] text-slate-400 font-bold">Score</div>
                          </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          {[
                            { label: 'Total Records', value: dryRunResult.totalRecords, color: 'text-white' },
                            { label: 'Valid Records', value: dryRunResult.validRecords, color: 'text-emerald-400' },
                            { label: 'Invalid Records', value: dryRunResult.invalidRecords, color: 'text-red-400' },
                            { label: 'Duplicates', value: dryRunResult.duplicateRecords, color: 'text-amber-400' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                              <div className={`text-2xl font-black ${color}`}>{value.toLocaleString()}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                            </div>
                          ))}
                        </div>
                        <div className="text-center sm:text-right">
                          <div className={`text-sm font-extrabold px-4 py-1.5 rounded-full mb-2 ${dryRunResult.isReadyToImport ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-500/30' : 'bg-amber-900/60 text-amber-400 border border-amber-500/30'}`}>
                            {dryRunResult.isReadyToImport ? '✅ Migration Ready' : '⚠️ Review Required'}
                          </div>
                          <div className="text-xs text-slate-400">Estimated: {dryRunResult.estimatedTime}</div>
                        </div>
                      </div>

                      {/* Data Preview Table */}
                      {parsedData.rows.length > 0 && (
                        <div>
                          <h3 className="font-extrabold text-slate-300 text-sm mb-3 flex items-center gap-2"><FileText size={14} /> First 10 Records Preview</h3>
                          <div className="overflow-x-auto rounded-xl border border-white/10">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                  <th className="px-3 py-2 text-left text-slate-400 font-bold">#</th>
                                  {parsedData.headers.slice(0, 6).map(h => (
                                    <th key={h} className="px-3 py-2 text-left text-slate-400 font-bold">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {parsedData.rows.slice(0, 10).map((row, idx) => (
                                  <tr key={idx} className="border-b border-white/5 hover:bg-white/4">
                                    <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                                    {parsedData.headers.slice(0, 6).map(h => (
                                      <td key={h} className="px-3 py-2 text-slate-300 max-w-[120px] truncate">{String(row[h] || '')}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Issues */}
                      {(dryRunResult.errors.length > 0 || dryRunResult.warnings.length > 0) && (
                        <div className="space-y-2">
                          {dryRunResult.errors.slice(0, 5).map((e, i) => (
                            <div key={i} className="flex items-start gap-2 px-3 py-2 bg-red-950/30 border border-red-500/30 rounded-lg text-xs">
                              <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                              <span className="text-red-300">{e.message}</span>
                            </div>
                          ))}
                          {dryRunResult.warnings.slice(0, 5).map((w, i) => (
                            <div key={i} className="flex items-start gap-2 px-3 py-2 bg-amber-950/30 border border-amber-500/30 rounded-lg text-xs">
                              <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                              <span className="text-amber-300">{w.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 4: Field Mapping ── */}
              {step === 4 && (
                <div className="p-7">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-black text-white mb-1">Smart Field Mapping</h2>
                      <p className="text-slate-400 text-sm">AI matched fields automatically. Review and adjust if needed.</p>
                    </div>
                    {/* Template selector */}
                    <div className="flex gap-2">
                      {Object.entries(MAPPING_TEMPLATES).map(([key, tmpl]) => (
                        <button key={key} onClick={() => setFieldMappings(prev => ({ ...prev, ...tmpl.mappings }))}
                          className="px-3 py-1.5 bg-white/6 hover:bg-white/12 border border-white/15 rounded-lg text-xs font-bold text-slate-300 transition-all flex items-center gap-1">
                          {tmpl.icon} {tmpl.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {parsedData.headers.map(header => {
                      const mapped = fieldMappings[header] || '';
                      const sampleVal = parsedData.rows[0]?.[header] || '—';
                      return (
                        <div key={header} className={`grid grid-cols-5 items-center gap-3 p-3 rounded-xl border transition-all ${mapped ? 'bg-white/5 border-white/15' : 'bg-white/3 border-dashed border-white/10'}`}>
                          <div className="col-span-2">
                            <div className="font-bold text-slate-200 text-sm truncate">{header}</div>
                            <div className="text-[11px] text-slate-500 truncate">e.g. {String(sampleVal).substring(0, 30)}</div>
                          </div>
                          <div className="flex justify-center">
                            <ArrowRight size={14} className={mapped ? 'text-violet-400' : 'text-slate-600'} />
                          </div>
                          <div className="col-span-2">
                            <select value={mapped} onChange={e => setFieldMappings(prev => ({ ...prev, [header]: e.target.value }))}
                              className="w-full bg-slate-800 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-violet-500 appearance-none">
                              <option value="">— Skip Field —</option>
                              {Object.entries(TARGET_FIELDS).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center gap-3 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-900/30 border border-violet-500/30 rounded-lg text-xs text-violet-300">
                      <Zap size={12} /> {Object.values(fieldMappings).filter(Boolean).length} of {parsedData.headers.length} fields auto-matched
                    </div>
                    <button onClick={() => setFieldMappings(autoMapFields(parsedData.headers))}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg text-xs font-bold text-slate-300 transition-all">
                      <RefreshCw size={12} /> Re-run Auto Match
                    </button>
                    <button onClick={() => setFieldMappings({})}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg text-xs font-bold text-slate-400 transition-all">
                      <XCircle size={12} /> Clear All
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 5: Validation ── */}
              {step === 5 && (
                <div className="p-7">
                  <h2 className="text-xl font-black text-white mb-1">Validation & Conflict Resolution</h2>
                  <p className="text-slate-400 text-sm mb-6">Choose how to handle duplicate records and conflicts during import.</p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-300 mb-3">Conflict Resolution Strategy</h3>
                      <div className="space-y-2">
                        {[
                          { value: 'skip', label: 'Skip Duplicates', desc: 'Keep existing records, ignore imported duplicates', icon: '⏭️' },
                          { value: 'update', label: 'Update Existing', desc: 'Overwrite existing records with imported data', icon: '🔄' },
                          { value: 'merge', label: 'Merge Records', desc: 'Merge missing fields from imported into existing', icon: '🔀' },
                          { value: 'replace', label: 'Replace All', desc: 'Delete existing and re-import fresh records', icon: '🔁' },
                        ].map(option => (
                          <button key={option.value} onClick={() => setImportOptions(prev => ({ ...prev, conflictResolution: option.value }))}
                            className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${importOptions.conflictResolution === option.value ? 'border-violet-500 bg-violet-900/20' : 'border-white/10 bg-white/3 hover:border-white/20'}`}>
                            <span className="text-xl">{option.icon}</span>
                            <div>
                              <div className="font-bold text-white text-sm">{option.label}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{option.desc}</div>
                            </div>
                            {importOptions.conflictResolution === option.value && <CheckCircle size={16} className="text-violet-400 ml-auto flex-shrink-0 mt-0.5" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-slate-300 mb-3">Validation Summary</h3>
                      {validationResult ? (
                        <div className="space-y-3">
                          {[
                            { label: 'Total Records', value: validationResult.totalRecords, icon: Database, color: 'text-white' },
                            { label: 'Valid Records', value: validationResult.validRecords, icon: CheckCircle, color: 'text-emerald-400' },
                            { label: 'Invalid Records', value: validationResult.invalidRecords, icon: XCircle, color: 'text-red-400' },
                            { label: 'Duplicates Found', value: validationResult.duplicateRecords, icon: AlertTriangle, color: 'text-amber-400' },
                            { label: 'Warnings', value: validationResult.warnings.length, icon: AlertCircle, color: 'text-orange-400' },
                          ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="flex items-center justify-between p-2.5 bg-white/4 rounded-lg">
                              <div className="flex items-center gap-2 text-sm text-slate-300">
                                <Icon size={14} className={color} /> {label}
                              </div>
                              <span className={`font-extrabold text-sm ${color}`}>{value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-slate-500 text-sm">Run Dry Run first to see validation results</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 6: Import Options ── */}
              {step === 6 && (
                <div className="p-7">
                  <h2 className="text-xl font-black text-white mb-1">Select What to Import</h2>
                  <p className="text-slate-400 text-sm mb-6">Choose which data entities to import. You can import each independently.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ENTITY_OPTIONS.map(({ key, label, icon: Icon, color }) => (
                      <button key={key} onClick={() => setImportOptions(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${importOptions[key] ? `border-${color}-500 bg-${color}-950/25 shadow-lg` : 'border-white/10 bg-white/3 hover:border-white/25 hover:bg-white/8'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${importOptions[key] ? `bg-${color}-600` : 'bg-white/10'}`}>
                          <Icon size={18} className="text-white" />
                        </div>
                        <span className="text-sm font-extrabold text-white">{label}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${importOptions[key] ? 'bg-emerald-500 border-emerald-400' : 'border-white/30'}`}>
                          {importOptions[key] && <CheckCircle size={12} className="text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-start gap-3">
                    <Info size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-200">Only the entities you selected above will be imported. Your file may contain multiple data types — this lets you control exactly what gets saved.</div>
                  </div>
                </div>
              )}

              {/* ── STEP 7: Backup ── */}
              {step === 7 && (
                <div className="p-7">
                  <h2 className="text-xl font-black text-white mb-1">Automatic Backup Snapshot</h2>
                  <p className="text-slate-400 text-sm mb-6">A full database snapshot will be created automatically before migration begins. You can roll back instantly if needed.</p>

                  <div className="flex flex-col items-center gap-6 text-center py-8">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all ${backupCreated ? 'bg-emerald-950/50 border-emerald-500' : 'bg-slate-800 border-white/15'}`}>
                      <HardDrive size={40} className={backupCreated ? 'text-emerald-400' : 'text-slate-400'} />
                    </div>
                    <div>
                      <div className="font-extrabold text-white text-lg mb-1">
                        {backupCreated ? '✅ Backup Snapshot Ready' : 'Auto Backup Will Be Created'}
                      </div>
                      <div className="text-slate-400 text-sm max-w-md">
                        {backupCreated
                          ? 'Your database snapshot is secured. You can roll back the migration at any time from the History tab.'
                          : 'When migration starts, a complete snapshot of all current Products, Customers, Suppliers, Categories, and Employees will be saved before any data is imported.'}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
                      {[
                        { icon: Package, label: 'Products', info: 'All existing products' },
                        { icon: Users, label: 'Customers', info: 'Full customer ledger' },
                        { icon: Truck, label: 'Suppliers', info: 'All supplier records' },
                      ].map(({ icon: Icon, label, info }) => (
                        <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                          <Icon size={20} className="text-slate-400 mx-auto mb-2" />
                          <div className="text-xs font-extrabold text-white">{label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{info}</div>
                        </div>
                      ))}
                    </div>

                    <div className="px-5 py-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                      <Shield size={14} /> Backup is created automatically — no manual action required. Click Next to continue.
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 8: Import Progress ── */}
              {step === 8 && (
                <div className="p-7">
                  <h2 className="text-xl font-black text-white mb-1">
                    {importRunning ? 'Migration In Progress...' : importReport ? 'Migration Complete' : 'Ready to Import'}
                  </h2>
                  <p className="text-slate-400 text-sm mb-6">
                    {importRunning ? 'Chunked batch processing with automatic backup. Do not close this tab.' :
                      importReport ? 'All data has been successfully imported into the database.' :
                        'Click Import to begin the migration process. A backup will be created first.'}
                  </p>

                  {!importRunning && !importReport && (
                    <div className="flex flex-col items-center gap-6 py-10 text-center">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-md">
                        <div className="grid grid-cols-2 gap-3 text-left mb-4">
                          {[
                            { label: 'Source', value: selectedConnector?.name || '—' },
                            { label: 'File', value: uploadedFile?.name?.substring(0, 25) + (uploadedFile?.name?.length > 25 ? '…' : '') || '—' },
                            { label: 'Total Records', value: parsedData.rows.length.toLocaleString() },
                            { label: 'Entities', value: Object.entries(importOptions).filter(([k, v]) => v === true).length + ' selected' },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-white/5 rounded-lg p-2.5">
                              <div className="text-xs text-slate-400">{label}</div>
                              <div className="text-sm font-bold text-white truncate">{value}</div>
                            </div>
                          ))}
                        </div>
                        <button onClick={handleExecuteMigration}
                          className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-xl transition-all shadow-xl shadow-violet-900/40 flex items-center justify-center gap-2 text-sm">
                          <Play size={16} /> Start Import Migration
                        </button>
                      </div>
                    </div>
                  )}

                  {importRunning && (
                    <div className="space-y-6">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-bold text-white">{importProgress}% Complete</span>
                          <span className="text-slate-400 text-xs">Processing in chunks...</span>
                        </div>
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${importProgress}%` }} />
                        </div>
                      </div>

                      {/* Stage Timeline */}
                      <div className="space-y-2 max-h-[320px] overflow-y-auto">
                        {IMPORT_STAGES.map(stage => {
                          const stages = IMPORT_STAGES.map(s => s.id);
                          const currentIdx = stages.indexOf(currentStage);
                          const stageIdx = stages.indexOf(stage.id);
                          const isDone = stageIdx < currentIdx;
                          const isCurr = stage.id === currentStage;
                          const Icon = stage.icon;
                          return (
                            <div key={stage.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isCurr ? 'bg-violet-900/30 border-violet-500/50' : isDone ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-white/3 border-white/8 opacity-40'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCurr ? 'bg-violet-600 animate-pulse' : isDone ? 'bg-emerald-600' : 'bg-white/10'}`}>
                                {isDone ? <CheckCircle size={14} className="text-white" /> : <Icon size={14} className="text-white" />}
                              </div>
                              <span className={`text-sm font-bold ${isCurr ? 'text-violet-200' : isDone ? 'text-emerald-300' : 'text-slate-500'}`}>{stage.label}</span>
                              {isCurr && <RefreshCw size={13} className="text-violet-400 ml-auto animate-spin" />}
                              {isDone && <CheckCircle size={13} className="text-emerald-400 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 9: Report ── */}
              {step === 9 && importReport && (
                <div className="p-7">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-black text-white mb-1">Migration Report</h2>
                      <p className="text-slate-400 text-sm">Complete audit summary of the migration execution.</p>
                    </div>
                    <button onClick={() => downloadReport(importReport)}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl transition-all">
                      <Download size={14} /> Download Report
                    </button>
                  </div>

                  {/* Success Banner */}
                  <div className="bg-gradient-to-r from-emerald-900/60 to-teal-900/40 border border-emerald-500/30 rounded-2xl p-5 mb-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Award size={22} className="text-white" />
                    </div>
                    <div>
                      <div className="font-extrabold text-emerald-200 text-base">Migration Completed Successfully</div>
                      <div className="text-emerald-400 text-xs mt-0.5">Duration: {importReport.durationSeconds}s · Database Status: {importReport.healthStatus || 'Healthy'}</div>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Products', value: importReport.productsImported, icon: Package, color: 'blue' },
                      { label: 'Customers', value: importReport.customersImported, icon: Users, color: 'green' },
                      { label: 'Suppliers', value: importReport.suppliersImported, icon: Truck, color: 'orange' },
                      { label: 'Employees', value: importReport.employeesImported, icon: Briefcase, color: 'purple' },
                      { label: 'Categories', value: importReport.categoriesImported, icon: Layers, color: 'yellow' },
                      { label: 'Duplicates Skipped', value: importReport.duplicatesSkipped, icon: AlertTriangle, color: 'amber' },
                      { label: 'Errors', value: importReport.errorsFound, icon: XCircle, color: 'red' },
                      { label: 'Warnings', value: importReport.warningsCount, icon: AlertCircle, color: 'orange' },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                        <Icon size={18} className="text-slate-400 mx-auto mb-1.5" />
                        <div className="text-2xl font-black text-white">{(value || 0).toLocaleString()}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    {backupId && (
                      <button onClick={() => handleRollback(backupId)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-900/40 hover:bg-red-800/50 border border-red-500/30 text-red-300 font-bold text-sm rounded-xl transition-all">
                        <RotateCcw size={14} /> Rollback This Migration
                      </button>
                    )}
                    <button onClick={() => { resetWizard(); setActiveView('dashboard'); loadDashStats(); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 font-bold text-sm rounded-xl transition-all">
                      <BarChart2 size={14} /> Back to Dashboard
                    </button>
                    <button onClick={() => { resetWizard(); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl transition-all">
                      <Zap size={14} /> New Migration
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Wizard Navigation */}
            {step < 9 && (
              <div className="flex items-center justify-between">
                <button onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 font-bold text-sm rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft size={15} /> Previous
                </button>
                <div className="text-xs text-slate-500">Step {step} of {WIZARD_STEPS.length}</div>
                <button onClick={() => {
                  if (!canAdvance(step)) { toast.error('Please complete this step before continuing.'); return; }
                  if (step === 3 && !dryRunResult) { runDryRun(); return; }
                  if (step === 8) { if (!importReport) { handleExecuteMigration(); return; } setStep(9); return; }
                  setStep(Math.min(step + 1, WIZARD_STEPS.length));
                }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-violet-900/30">
                  {step === 8 ? (importReport ? 'View Report' : 'Start Import') : 'Next'}
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ HISTORY VIEW ══════════════════ */}
        {activeView === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Migration History</h2>
                <p className="text-slate-400 text-sm mt-0.5">Complete audit trail of all data migration operations.</p>
              </div>
              <button onClick={loadMigrationLogs} className="flex items-center gap-1.5 px-3.5 py-2 bg-white/6 hover:bg-white/12 border border-white/15 text-slate-300 text-xs font-bold rounded-xl transition-all">
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Search by source, user, or file..." value={searchLogs}
                  onChange={e => setSearchLogs(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 appearance-none">
                <option value="all">All Status</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
                <option value="Rolled Back">Rolled Back</option>
              </select>
            </div>

            {/* Logs Table */}
            <div className="bg-white/4 border border-white/10 rounded-2xl overflow-hidden">
              {logsLoading ? (
                <div className="text-center py-16 text-slate-500">
                  <RefreshCw size={28} className="mx-auto mb-2 animate-spin opacity-50" />
                  <div className="text-sm">Loading history...</div>
                </div>
              ) : migrationLogs.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <History size={48} className="mx-auto mb-3 opacity-25" />
                  <div className="font-bold text-slate-400 text-base mb-1">No Migrations Yet</div>
                  <div className="text-sm">Start your first migration to see the audit trail here.</div>
                  <button onClick={() => { setActiveView('wizard'); resetWizard(); }}
                    className="mt-4 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl transition-all">
                    Start First Migration
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        {['Date', 'User', 'Source', 'Records', 'Duration', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-extrabold text-slate-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {migrationLogs
                        .filter(log => {
                          if (filterStatus !== 'all' && log.status !== filterStatus) return false;
                          if (searchLogs) {
                            const q = searchLogs.toLowerCase();
                            return log.source?.toLowerCase().includes(q) ||
                              log.userName?.toLowerCase().includes(q) ||
                              log.fileName?.toLowerCase().includes(q);
                          }
                          return true;
                        })
                        .map(log => (
                          <tr key={log._id} className="border-b border-white/5 hover:bg-white/4 transition-colors">
                            <td className="px-4 py-3 text-slate-300 text-xs">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-slate-300 text-xs">{log.userName || 'Admin'}</td>
                            <td className="px-4 py-3">
                              <div className="text-slate-200 text-xs font-bold">{log.source}</div>
                              <div className="text-slate-500 text-[11px]">{log.fileName}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-300 text-xs font-bold">
                              {(log.recordsCount?.total || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{log.durationSeconds}s</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${
                                log.status === 'Completed' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30' :
                                  log.status === 'Failed' ? 'bg-red-900/50 text-red-300 border border-red-500/30' :
                                    log.status === 'Rolled Back' ? 'bg-amber-900/50 text-amber-300 border border-amber-500/30' :
                                      'bg-blue-900/50 text-blue-300 border border-blue-500/30'
                              }`}>{log.status}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => setSelectedReport(log)}
                                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[11px] font-bold text-slate-300 transition-all flex items-center gap-1">
                                  <Eye size={11} /> Report
                                </button>
                                {log.backupId && !log.backupId?.isRestored && log.status === 'Completed' && (
                                  <button onClick={() => handleRollback(log.backupId?._id || log.backupId)}
                                    className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/50 border border-red-500/20 rounded-lg text-[11px] font-bold text-red-300 transition-all flex items-center gap-1">
                                    <RotateCcw size={11} /> Rollback
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Report Detail Modal ── */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/4">
              <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                <FileText size={15} className="text-violet-400" /> Migration Report
              </h3>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white text-xl font-bold">&times;</button>
            </div>
            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Source', value: selectedReport.source },
                  { label: 'File', value: selectedReport.fileName },
                  { label: 'Imported By', value: selectedReport.userName },
                  { label: 'Date', value: new Date(selectedReport.createdAt).toLocaleString() },
                  { label: 'Duration', value: `${selectedReport.durationSeconds}s` },
                  { label: 'Status', value: selectedReport.status },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-slate-400">{label}</div>
                    <div className="text-sm font-bold text-white truncate">{value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { label: 'Products', value: selectedReport.recordsCount?.products || 0 },
                  { label: 'Customers', value: selectedReport.recordsCount?.customers || 0 },
                  { label: 'Suppliers', value: selectedReport.recordsCount?.suppliers || 0 },
                  { label: 'Employees', value: selectedReport.recordsCount?.employees || 0 },
                  { label: 'Duplicates Skipped', value: selectedReport.duplicatesSkipped || 0 },
                  { label: 'Errors', value: selectedReport.errorsCount || 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2 bg-white/4 rounded-lg">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="text-sm font-extrabold text-white">{value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex gap-3">
              <button onClick={() => downloadReport(selectedReport.reportData || {})}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5">
                <Download size={13} /> Download
              </button>
              <button onClick={() => setSelectedReport(null)}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 font-bold text-sm rounded-xl transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataMigration;
