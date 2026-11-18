import React, { useState, useEffect, useMemo, useRef } from 'react';
import { realApi } from '../api/realApi';
import { useAuth } from '../contexts/AuthContext';
import { fingerprintService } from '../services/fingerprintService';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Clock, 
  MapPin, 
  QrCode, 
  FileText, 
  Settings as SettingsIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Printer, 
  RefreshCw, 
  Search, 
  Calendar,
  AlertCircle,
  FileImage,
  TrendingUp,
  UserCheck,
  Briefcase,
  UserMinus,
  Check,
  Smartphone,
  Fingerprint,
  ShieldCheck,
  Zap,
  Activity,
  Wifi,
  CheckCircle2,
  XCircle,
  RotateCcw
} from 'lucide-react';

const SummaryCard = ({ title, value, color, icon: Icon }) => (
  <div className="flex items-center gap-4 rounded-xl p-5 text-white shadow-md transition-transform hover:scale-[1.02]" style={{ backgroundColor: color }}>
    <div className="p-3 bg-white/20 rounded-lg">
      <Icon size={24} />
    </div>
    <div>
      <div className="text-xs font-semibold opacity-90 uppercase tracking-wider">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  </div>
);

const Attendance = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'monitor', 'logs', 'shifts', 'stations', 'reports', 'settings'
  const [loading, setLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState({
    employeesPresentToday: 0,
    employeesAbsentToday: 0,
    employeesLateToday: 0,
    employeesCheckedOutToday: 0,
    totalWorkingHours: 0,
    overtimeHours: 0
  });
  const [monitorData, setMonitorData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [stations, setStations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [attendanceSettings, setAttendanceSettings] = useState({
    officeStartTime: '08:00',
    officeEndTime: '17:00',
    gracePeriod: 15,
    lateThreshold: 30,
    overtimeRules: { minHoursForOvertime: 8, multiplier: 1.5 },
    policies: { allowMultipleDevices: true, requireLocation: false }
  });

  // Modal / Form States
  const [showManualLogModal, setShowManualLogModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '',
    checkOutTime: '',
    status: 'Present'
  });

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    startTime: '08:00',
    endTime: '17:00',
    gracePeriod: 15,
    overtimeRules: { minHours: 8, multiplier: 1.5 }
  });

  const [showAssignShiftModal, setShowAssignShiftModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    shiftId: ''
  });

  const [showStationModal, setShowStationModal] = useState(false);
  const [stationForm, setStationForm] = useState({
    name: '',
    locationType: 'Entrance'
  });

  const [selectedStation, setSelectedStation] = useState(null);
  const qrPreviewRef = useRef(null);

  // Filters
  const [logStartDate, setLogStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [logEndDate, setLogEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [logEmployeeId, setLogEmployeeId] = useState('');
  const [logStatus, setLogStatus] = useState('');
  const [logSearch, setLogSearch] = useState('');

  // Reports state
  const [reportType, setReportType] = useState('daily');
  const [reportEmployeeId, setReportEmployeeId] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]);

  // Fingerprint Device & Enrollment States
  const [fpDeviceConnected, setFpDeviceConnected] = useState(true);
  const [fpDeviceInfo, setFpDeviceInfo] = useState({ deviceName: 'USB Fingerprint Reader', status: 'Ready' });
  const [fpEmployees, setFpEmployees] = useState([]);
  const [fpScanning, setFpScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [scanEmpSelect, setScanEmpSelect] = useState('');

  // Fingerprint Enrollment Modal States
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollingEmp, setEnrollingEmp] = useState(null);
  const [enrollStep, setEnrollStep] = useState('idle');

  // Fetch initial dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const res = await realApi.attendance.getDashboardStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMonitorData = async () => {
    try {
      setLoading(true);
      const res = await realApi.attendance.getMonitor();
      if (res.success) {
        setMonitorData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await realApi.attendance.getLogs({
        startDate: logStartDate,
        endDate: logEndDate,
        employeeId: logEmployeeId,
        status: logStatus,
        search: logSearch
      });
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await realApi.employees.getEmployees({ status: 'active' });
      if (res.success) {
        setEmployees(realApi.extractData(res) || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadShifts = async () => {
    try {
      const res = await realApi.attendance.getShifts();
      if (res.success) {
        setShifts(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadStations = async () => {
    try {
      const res = await realApi.attendance.getStations();
      if (res.success) {
        setStations(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await realApi.attendance.getSettings();
      if (res.success) {
        setAttendanceSettings(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await realApi.attendance.getAuditLogs();
      if (res.success) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadFingerprintEmployees = async () => {
    try {
      const res = await realApi.attendance.getFingerprintEmployees();
      if (res.success) {
        setFpEmployees(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Subscribe to real-time fingerprint device connection status
  useEffect(() => {
    const unsubscribe = fingerprintService.subscribeDeviceStatus((connected, info) => {
      setFpDeviceConnected(connected);
      setFpDeviceInfo(info);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadEmployees();
    loadShifts();
    loadDashboardData();
    loadFingerprintEmployees();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardData();
    } else if (activeTab === 'monitor') {
      loadMonitorData();
    } else if (activeTab === 'logs') {
      loadLogs();
    } else if (activeTab === 'fingerprint') {
      loadFingerprintEmployees();
    } else if (activeTab === 'shifts') {
      loadShifts();
    } else if (activeTab === 'stations') {
      loadStations();
    } else if (activeTab === 'settings') {
      loadSettings();
      loadAuditLogs();
    }
  }, [activeTab]);

  // Refresh logs when filter criteria changes
  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [logStartDate, logEndDate, logEmployeeId, logStatus, logSearch]);

  /**
   * ─── FINGERPRINT AUTOMATIC ATTENDANCE SCAN WORKFLOW ───────────────────────
   */
  const handleProcessFingerprintScan = async (targetEmpId = null) => {
    if (!fpDeviceConnected) {
      return toast.error('Fingerprint scanner is disconnected. Please connect device.');
    }

    try {
      setFpScanning(true);
      toast.loading('Reading fingerprint hardware scanner...', { id: 'fp-scan' });

      const empIdToScan = targetEmpId || scanEmpSelect || (fpEmployees[0] ? fpEmployees[0]._id : null);
      const scanData = await fingerprintService.captureFingerprint(empIdToScan);

      const res = await realApi.attendance.processFingerprintScan({
        fingerprintData: scanData.fingerprintData,
        employeeId: empIdToScan
      });

      if (res.success) {
        toast.success(res.message, { id: 'fp-scan' });
        setLastScanResult(res.data);

        // Update statistics instantly without page refresh
        if (res.data.stats) {
          setStats(res.data.stats);
        }
        loadDashboardData();
        loadLogs();
        loadMonitorData();
        loadFingerprintEmployees();
      } else {
        toast.error(res.message || 'Fingerprint scan failed', { id: 'fp-scan' });
      }
    } catch (err) {
      toast.error(err.message || 'Scanner error', { id: 'fp-scan' });
    } finally {
      setFpScanning(false);
    }
  };

  /**
   * ─── FINGERPRINT ENROLLMENT ACTIONS ─────────────────────────────────────────
   */
  const handleEnrollFingerprint = (employee) => {
    setEnrollingEmp(employee);
    setEnrollStep('ready');
    setShowEnrollModal(true);
  };

  const handleStartEnrollScan = async () => {
    if (!enrollingEmp) return;
    try {
      setEnrollStep('scanning');
      const scanData = await fingerprintService.captureFingerprint(enrollingEmp._id || enrollingEmp.id);

      const res = await realApi.attendance.enrollFingerprint({
        employeeId: enrollingEmp._id || enrollingEmp.id,
        fingerprintTemplate: scanData.fingerprintData,
        deviceName: fpDeviceInfo.deviceName || 'USB Fingerprint Reader'
      });

      if (res.success) {
        toast.success(res.message);
        setEnrollStep('success');
        loadFingerprintEmployees();
        setTimeout(() => {
          setShowEnrollModal(false);
          setEnrollingEmp(null);
          setEnrollStep('idle');
        }, 1200);
      } else {
        toast.error(res.message || 'Enrollment failed');
        setEnrollStep('ready');
      }
    } catch (err) {
      toast.error(err.message || 'Enrollment error');
      setEnrollStep('ready');
    }
  };

  const handleDeleteFingerprint = async (employeeId, name) => {
    if (!window.confirm(`Are you sure you want to delete fingerprint enrollment for ${name}?`)) return;
    try {
      setLoading(true);
      const res = await realApi.attendance.deleteFingerprint(employeeId);
      if (res.success) {
        toast.success(res.message);
        loadFingerprintEmployees();
      } else {
        toast.error(res.message || 'Failed to delete fingerprint');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ─── MANUAL LOGS OVERRIDE ──────────────────────────────────────────────────
   */
  const handleOpenManualLog = () => {
    setManualForm({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      checkInTime: '',
      checkOutTime: '',
      status: 'Present'
    });
    setShowManualLogModal(true);
  };

  const handleSaveManualLog = async (e) => {
    e.preventDefault();
    if (!manualForm.employeeId) return toast.error('Please select an employee');
    if (!manualForm.date) return toast.error('Date is required');

    try {
      setLoading(true);
      const payload = { ...manualForm };
      
      // Build full timestamps from selected times
      if (manualForm.checkInTime) {
        payload.checkInTime = new Date(`${manualForm.date}T${manualForm.checkInTime}`).toISOString();
      } else {
        delete payload.checkInTime;
      }
      
      if (manualForm.checkOutTime) {
        payload.checkOutTime = new Date(`${manualForm.date}T${manualForm.checkOutTime}`).toISOString();
      } else {
        delete payload.checkOutTime;
      }

      const res = await realApi.attendance.manualLog(payload);
      if (res.success) {
        toast.success(res.message || 'Log registered successfully');
        setShowManualLogModal(false);
        loadLogs();
        loadDashboardData();
      } else {
        toast.error(res.message || 'Failed to register log');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ─── SHIFT MANAGEMENT ACTIONS ─────────────────────────────────────────────
   */
  const handleOpenCreateShift = () => {
    setEditingShift(null);
    setShiftForm({
      name: '',
      startTime: '08:00',
      endTime: '17:00',
      gracePeriod: 15,
      overtimeRules: { minHours: 8, multiplier: 1.5 }
    });
    setShowShiftModal(true);
  };

  const handleOpenEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriod: shift.gracePeriod || 15,
      overtimeRules: shift.overtimeRules || { minHours: 8, multiplier: 1.5 }
    });
    setShowShiftModal(true);
  };

  const handleSaveShift = async (e) => {
    e.preventDefault();
    if (!shiftForm.name.trim()) return toast.error('Shift name is required');

    try {
      setLoading(true);
      let res;
      if (editingShift) {
        res = await realApi.attendance.updateShift(editingShift._id, shiftForm);
      } else {
        res = await realApi.attendance.createShift(shiftForm);
      }

      if (res.success) {
        toast.success(res.message || 'Shift saved successfully');
        setShowShiftModal(false);
        loadShifts();
      } else {
        toast.error(res.message || 'Action failed');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete shift "${name}"?`)) return;

    try {
      setLoading(true);
      const res = await realApi.attendance.deleteShift(id);
      if (res.success) {
        toast.success(res.message || 'Shift deleted');
        loadShifts();
      } else {
        toast.error(res.message || 'Failed to delete');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignShift = async (e) => {
    e.preventDefault();
    if (!assignForm.employeeId) return toast.error('Select an employee');

    try {
      setLoading(true);
      const res = await realApi.attendance.assignShift(assignForm);
      if (res.success) {
        toast.success(res.message);
        setShowAssignShiftModal(false);
        loadEmployees();
      } else {
        toast.error(res.message || 'Failed to assign shift');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ─── QR STATION ACTIONS ───────────────────────────────────────────────────
   */
  const handleCreateStation = async (e) => {
    e.preventDefault();
    if (!stationForm.name.trim()) return toast.error('Station name is required');

    try {
      setLoading(true);
      const res = await realApi.attendance.createStation(stationForm);
      if (res.success) {
        toast.success('Station created successfully');
        setShowStationModal(false);
        setStationForm({ name: '', locationType: 'Entrance' });
        loadStations();
      } else {
        toast.error(res.message || 'Failed to create');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateStationToken = async (id) => {
    if (!window.confirm('Regenerating this QR code will invalidate the old printed sign immediately. Continue?')) return;
    try {
      setLoading(true);
      const res = await realApi.attendance.regenerateStation(id);
      if (res.success) {
        toast.success('QR Code regenerated successfully');
        loadStations();
        if (selectedStation && selectedStation._id === id) {
          setSelectedStation(res.data);
        }
      }
    } catch (err) {
      toast.error('Regeneration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStation = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete station "${name}"?`)) return;
    try {
      setLoading(true);
      const res = await realApi.attendance.deleteStation(id);
      if (res.success) {
        toast.success('Station deleted successfully');
        loadStations();
      }
    } catch (err) {
      toast.error('Deletion failed');
    } finally {
      setLoading(false);
    }
  };

  const getQRUrl = (token) => {
    const base = window.location.origin;
    // Uses HashRouter format to handle electron/hosting wildcards natively
    return `${base}/#/attendance/${token}`;
  };

  const downloadPNG = (station) => {
    const svgEl = qrPreviewRef.current?.querySelector('svg');
    if (!svgEl) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      URL.revokeObjectURL(url);

      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `attendance-${station.name.replace(/\s+/g, '-')}-qr.png`;
      a.click();
    };
    img.src = url;
  };

  const printStationSign = (station) => {
    const svgEl = qrPreviewRef.current?.querySelector('svg');
    if (!svgEl) return;

    const svgClone = svgEl.cloneNode(true);
    svgClone.setAttribute('width', '250');
    svgClone.setAttribute('height', '250');
    const svgHTML = svgClone.outerHTML;

    const printWin = window.open('', '_blank', 'width=600,height=750');
    printWin.document.write(`
      <html>
      <head>
        <title>Print QR sign - ${station.name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Arial, sans-serif;
            background: white;
            display: flex; justify-content: center; align-items: center;
            height: 100vh; padding: 10mm;
          }
          .sign-card {
            width: 90mm;
            border: 3px solid #1e4c82;
            border-radius: 8mm;
            padding: 8mm 6mm;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          }
          .brand-title {
            font-size: 16pt;
            font-weight: 900;
            color: #1e4c82;
            letter-spacing: -0.02em;
            margin-bottom: 2px;
          }
          .brand-subtitle {
            font-size: 8pt;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 6mm;
          }
          .qr-box {
            display: inline-block;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4mm;
            padding: 4mm;
            margin-bottom: 6mm;
          }
          .station-badge {
            display: inline-block;
            background: #1e4c82;
            color: white;
            font-size: 12pt;
            font-weight: 800;
            padding: 2mm 5mm;
            border-radius: 2mm;
            text-transform: uppercase;
          }
          .guide-text {
            font-size: 7.5pt;
            color: #475569;
            margin-top: 4mm;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="sign-card">
          <div class="brand-title">HUDI-SOFT POS</div>
          <div class="brand-subtitle">Attendance Tracking Station</div>
          <div class="qr-box">
            ${svgHTML}
          </div>
          <div>
            <div class="station-badge">${station.name}</div>
          </div>
          <div class="guide-text">
            Open your mobile phone camera and scan the code above.<br>
            Verify your identity with biometrics to Check In or Check Out.
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            }, 300);
          }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  /**
   * ─── REPORTS GENERATOR ────────────────────────────────────────────────────
   */
  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      
      // Calculate start and end date based on reportType
      let start = reportDate;
      let end = reportDate;

      if (reportType === 'weekly') {
        const dateObj = new Date(reportDate);
        const day = dateObj.getDay();
        const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(dateObj.setDate(diff));
        const sunday = new Date(dateObj.setDate(monday.getDate() + 6));
        start = monday.toISOString().split('T')[0];
        end = sunday.toISOString().split('T')[0];
      } else if (reportType === 'monthly') {
        const [year, month] = reportDate.split('-');
        const lastDay = new Date(year, month, 0).getDate();
        start = `${year}-${month}-01`;
        end = `${year}-${month}-${lastDay}`;
      }

      const params = {
        startDate: start,
        endDate: end
      };
      if (reportEmployeeId) {
        params.employeeId = reportEmployeeId;
      }

      const res = await realApi.attendance.getLogs(params);
      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const printReportTable = () => {
    const printWin = window.open('', '_blank', 'width=900,height=600');
    
    // Construct HTML rows
    const rows = reportData.map((log, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${log.employee?.name || 'Deleted'}</td>
        <td>${log.date}</td>
        <td>${log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
        <td>${log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
        <td>${log.totalHours ? log.totalHours.toFixed(2) : '0.00'} hrs</td>
        <td><span class="status-badge ${log.status.toLowerCase()}">${log.status}</span></td>
        <td>${log.isBiometricVerified ? '🟢 Biometric' : '🔴 Fallback/Manual'}</td>
      </tr>
    `).join('');

    printWin.document.write(`
      <html>
      <head>
        <title>Attendance Report - Hudi Soft</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 18pt; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 10pt; }
          th { bg-color: #f5f5f5; font-weight: bold; }
          .status-badge { font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 8pt; }
          .status-badge.present { background: #e6fcf5; color: #0ca678; }
          .status-badge.late { background: #fff9db; color: #f59f00; }
          .status-badge.overtime { background: #e7f5ff; color: #1c7ed6; }
          .status-badge.early { background: #fff0f6; color: #d6336c; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">HUDI-SOFT POS ATTENDANCE REPORT</div>
            <div style="font-size: 9pt; color: #666; margin-top: 4px;">Type: ${reportType.toUpperCase()} | Generated At: ${new Date().toLocaleDateString()}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold;">Branch Terminal</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Employee Name</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Working Hours</th>
              <th>Status</th>
              <th>Verification</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8" style="text-align: center; color: #999;">No records found.</td></tr>'}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            }, 300);
          }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  /**
   * ─── SETTINGS ACTIONS ─────────────────────────────────────────────────────
   */
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await realApi.attendance.updateSettings(attendanceSettings);
      if (res.success) {
        toast.success(res.message || 'Settings updated successfully');
        loadSettings();
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ─── EXPORT CSV UTILITY ───────────────────────────────────────────────────
   */
  const handleExportCSV = () => {
    if (logs.length === 0) return toast.error('No logs to export');
    
    // Headers
    const headers = ['Employee Name', 'Position', 'Date', 'Check In', 'Check Out', 'Hours Worked', 'Status', 'Verification'];
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        `"${log.employee?.name || 'Deleted'}"`,
        `"${log.employee?.position || '-'}"`,
        log.date,
        log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString() : '',
        log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString() : '',
        log.totalHours ? log.totalHours.toFixed(2) : '0',
        log.status,
        log.isBiometricVerified ? 'Biometric' : 'PIN/Manual'
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `attendance_logs_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page-content flex flex-col gap-6 h-full overflow-auto p-6 bg-slate-50">
      
      {/* Header Panel */}
      <div className="card bg-gradient-to-r from-[#1e4c82] to-[#122e50] text-white border-0 shadow-lg p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <QrCode size={28} className="text-blue-300" />
                QR & Fingerprint Attendance System
              </h1>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
                <Zap size={13} /> Dual Auth Mode Active
              </span>
            </div>
            <p className="text-blue-100 text-sm">Monitor shifts, create QR check-in stations, and perform automatic fingerprint biometric attendance</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Device Connection Real-time Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-extrabold shadow-inner ${
              fpDeviceConnected 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${fpDeviceConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              {fpDeviceConnected ? '🟢 Fingerprint Device Connected' : '🔴 Fingerprint Device Disconnected'}
            </div>

            <button
              onClick={() => {
                const newState = fingerprintService.toggleSimulatedDevice();
                toast(newState ? '🟢 Biometric scanner connected' : '🔴 Biometric scanner disconnected');
              }}
              className="text-[11px] font-bold underline text-blue-200 hover:text-white transition-colors"
              title="Click to simulate USB device plug/unplug"
            >
              {fpDeviceConnected ? 'Simulate Disconnect' : 'Simulate Connect'}
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (activeTab === 'dashboard') loadDashboardData();
                  else if (activeTab === 'monitor') loadMonitorData();
                  else if (activeTab === 'logs') loadLogs();
                  else if (activeTab === 'fingerprint') loadFingerprintEmployees();
                  else if (activeTab === 'shifts') loadShifts();
                  else if (activeTab === 'stations') loadStations();
                }}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
                title="Refresh Data"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
              {activeTab === 'logs' && (
                <button
                  onClick={handleOpenManualLog}
                  className="flex items-center gap-2 bg-white text-[#1e4c82] font-bold px-4 py-2.5 rounded-lg shadow hover:bg-slate-100 transition-colors text-sm"
                >
                  <Plus size={16} />
                  Adjust Log
                </button>
              )}
              {activeTab === 'shifts' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAssignShiftModal(true)}
                    className="flex items-center gap-2 bg-white/10 text-white font-bold px-4 py-2.5 rounded-lg border border-white/20 hover:bg-white/20 transition-colors text-sm"
                  >
                    Assign Shift
                  </button>
                  <button
                    onClick={handleOpenCreateShift}
                    className="flex items-center gap-2 bg-white text-[#1e4c82] font-bold px-4 py-2.5 rounded-lg shadow hover:bg-slate-100 transition-colors text-sm"
                  >
                    <Plus size={16} />
                    Add Shift
                  </button>
                </div>
              )}
              {activeTab === 'stations' && (
                <button
                  onClick={() => setShowStationModal(true)}
                  className="flex items-center gap-2 bg-white text-[#1e4c82] font-bold px-4 py-2.5 rounded-lg shadow hover:bg-slate-100 transition-colors text-sm"
                >
                  <Plus size={16} />
                  Create Station
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex flex-wrap border-b border-gray-200 bg-white p-2 rounded-xl shadow-sm gap-2">
        {[
          { id: 'dashboard', label: 'Overview Dashboard', icon: TrendingUp },
          { id: 'monitor', label: 'Live Monitor', icon: UserCheck },
          { id: 'logs', label: 'Attendance Logs', icon: Clock },
          { id: 'fingerprint', label: 'Fingerprint Enrollment', icon: Fingerprint },
          { id: 'shifts', label: 'Shift Scheduler', icon: Briefcase },
          { id: 'stations', label: 'QR Sign Stations', icon: QrCode },
          { id: 'reports', label: 'Reports Maker', icon: FileText },
          { id: 'settings', label: 'Policies & Settings', icon: SettingsIcon }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#1e4c82] text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}

      {/* 1. OVERVIEW DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard title="Present Today" value={stats.employeesPresentToday} color="#10b981" icon={UserCheck} />
            <SummaryCard title="Late Today" value={stats.employeesLateToday} color="#f59e0b" icon={Clock} />
            <SummaryCard title="Absent Today" value={stats.employeesAbsentToday} color="#ef4444" icon={UserMinus} />
            <SummaryCard title="Checked Out" value={stats.employeesCheckedOutToday} color="#6366f1" icon={Users} />
          </div>

          {/* Live Automatic USB Fingerprint Scanner Station Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#1e4c82] text-white p-6 rounded-2xl shadow-md border border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col gap-3 max-w-lg">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <Fingerprint size={24} />
                </span>
                <div>
                  <h2 className="text-lg font-black tracking-tight">Live USB Fingerprint Scanner Station</h2>
                  <p className="text-xs text-slate-300">Touch or scan enrolled employee finger to record attendance instantly</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                  <label className="text-slate-400 font-bold text-[11px] uppercase">Select Staff (Test / Scanner):</label>
                  <select
                    value={scanEmpSelect}
                    onChange={(e) => setScanEmpSelect(e.target.value)}
                    className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-800 text-white">-- Auto Identify (Enrolled Staff) --</option>
                    {fpEmployees.map(emp => (
                      <option key={emp._id} value={emp._id} className="bg-slate-800 text-white">
                        {emp.name} ({emp.fingerprint?.enrollmentStatus === 'Enrolled' ? '🟢 Enrolled' : '🔴 Not Enrolled'})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleProcessFingerprintScan()}
                  disabled={fpScanning || !fpDeviceConnected}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all ${
                    !fpDeviceConnected
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : fpScanning
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105'
                  }`}
                >
                  <Fingerprint size={18} className={fpScanning ? 'animate-spin' : ''} />
                  {fpScanning ? 'Scanning Fingerprint...' : 'Scan Fingerprint Now'}
                </button>
              </div>
            </div>

            {/* Scanner Visualizer & Last Scan Card */}
            <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-700/60 w-full md:w-auto min-w-[280px]">
              <div className={`relative p-4 rounded-2xl flex items-center justify-center transition-all ${
                fpScanning ? 'bg-amber-500/20 text-amber-400 ring-4 ring-amber-500/40 animate-pulse' :
                lastScanResult ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                'bg-slate-800/80 text-blue-400 border border-slate-700'
              }`}>
                <Fingerprint size={42} />
              </div>

              <div className="flex flex-col text-xs">
                {lastScanResult ? (
                  <>
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} /> Scan Verified ({lastScanResult.authMethod})
                    </span>
                    <span className="text-sm font-black text-white mt-0.5">{lastScanResult.employee?.name}</span>
                    <span className="text-slate-300 font-semibold mt-0.5">
                      {lastScanResult.attendanceType} · <span className="font-mono text-emerald-300">{lastScanResult.timestamp}</span>
                    </span>
                    <span className="inline-block mt-1 bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold w-fit">
                      Status: {lastScanResult.status}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scanner Hardware Status</span>
                    <span className="text-xs font-bold text-white mt-1">
                      {fpDeviceConnected ? '🟢 Scanner Connected & Ready' : '🔴 Scanner Disconnected'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">Place finger on scanner surface</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-2">Total Working Hours</h3>
                <p className="text-4xl font-extrabold text-gray-900 font-mono">{stats.totalWorkingHours} hrs</p>
                <p className="text-xs text-gray-400 mt-2">Cumulative actual check-in hours clocked across the branch today.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-2">Overtime Logged</h3>
                <p className="text-4xl font-extrabold text-blue-600 font-mono">{stats.overtimeHours} hrs</p>
                <p className="text-xs text-gray-400 mt-2">Today's aggregate extra hours worked beyond standard scheduled shifts.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LIVE MONITOR */}
      {activeTab === 'monitor' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Live Branch Monitor</h2>
            <div className="flex gap-4 text-xs font-bold text-gray-500">
              <span className="flex items-center gap-1">🟢 Present</span>
              <span className="flex items-center gap-1">🟡 Checked Out</span>
              <span className="flex items-center gap-1">🔴 Absent</span>
              <span className="flex items-center gap-1">🟠 Late</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Job Position</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Shift Scheduled</th>
                  <th className="px-6 py-4 text-center">Live Status</th>
                  <th className="px-6 py-4">Check In</th>
                  <th className="px-6 py-4">Check Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monitorData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                      No active employees setup in this branch.
                    </td>
                  </tr>
                ) : (
                  monitorData.map(emp => (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {emp.photoUrl ? (
                            <img src={emp.photoUrl} alt={emp.name} className="w-8 h-8 rounded-full object-cover border" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-semibold text-gray-900">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{emp.position}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{emp.department}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{emp.shift}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          emp.status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
                          emp.status === 'Late' ? 'bg-amber-100 text-amber-800' :
                          emp.status === 'Checked Out' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm font-mono">
                        {emp.checkInTime ? new Date(emp.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm font-mono">
                        {emp.checkOutTime ? new Date(emp.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ATTENDANCE LOGS TABLE */}
      {activeTab === 'logs' && (
        <div className="flex flex-col gap-4">
          {/* Filters Bar */}
          <div className="card bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-bold uppercase">From</span>
                  <input
                    type="date"
                    value={logStartDate}
                    onChange={(e) => setLogStartDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-bold uppercase">To</span>
                  <input
                    type="date"
                    value={logEndDate}
                    onChange={(e) => setLogEndDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={logStatus}
                  onChange={(e) => setLogStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Overtime">Overtime</option>
                  <option value="Early Departure">Early Departure</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-xs outline-none"
                  />
                </div>
                <button
                  onClick={handleExportCSV}
                  className="p-2 border border-gray-300 hover:bg-slate-50 text-gray-600 rounded-lg flex items-center justify-center"
                  title="Export to CSV"
                >
                  <Download size={14} />
                </button>
              </div>

            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Check In</th>
                    <th className="px-6 py-4">Check Out</th>
                    <th className="px-6 py-4">Hours Worked</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Auth Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                        No attendance records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900">{log.employee?.name || 'Deleted'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm font-semibold">{log.date}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm font-mono">
                          {log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm font-mono">
                          {log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-6 py-4 text-gray-900 text-sm font-bold">
                          {log.totalHours ? `${log.totalHours.toFixed(2)} hrs` : '0.00 hrs'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            log.status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
                            log.status === 'Late' ? 'bg-amber-100 text-amber-800' :
                            log.status === 'Overtime' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-pink-100 text-pink-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium">
                          {log.authMethod === 'Fingerprint' || log.isBiometricVerified ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold">
                              <Fingerprint size={13} /> Fingerprint
                            </span>
                          ) : log.authMethod === 'QR Code' ? (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold">
                              <QrCode size={13} /> QR Code
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-bold">
                              ✏️ Manual
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3.5. FINGERPRINT BIOMETRIC ENROLLMENT DIRECTORY */}
      {activeTab === 'fingerprint' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Fingerprint className="text-blue-600" size={24} />
                Employee Fingerprint Enrollment Profiles
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Manage biometric fingerprint templates for staff authentication. Enrolled employees can use any USB fingerprint reader.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                Total Staff: {fpEmployees.length} | Enrolled: {fpEmployees.filter(e => e.fingerprint?.enrollmentStatus === 'Enrolled').length}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="px-6 py-4">Employee Profile</th>
                    <th className="px-6 py-4">Job Position</th>
                    <th className="px-6 py-4">Shift</th>
                    <th className="px-6 py-4 text-center">Enrollment Status</th>
                    <th className="px-6 py-4">Enrollment Date</th>
                    <th className="px-6 py-4">Last Verified</th>
                    <th className="px-6 py-4">Device Used</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fpEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                        No active employees found.
                      </td>
                    </tr>
                  ) : (
                    fpEmployees.map(emp => {
                      const isEnrolled = emp.fingerprint?.enrollmentStatus === 'Enrolled';
                      return (
                        <tr key={emp._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {emp.photoUrl ? (
                                <img src={emp.photoUrl} alt={emp.name} className="w-9 h-9 rounded-full object-cover border" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                  {emp.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-gray-900 text-sm block">{emp.name}</span>
                                <span className="text-[11px] text-gray-400 font-mono">ID: {emp.employeeId || emp._id.slice(-6)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-sm font-medium">{emp.position}</td>
                          <td className="px-6 py-4 text-gray-600 text-sm font-medium">{emp.shift}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                              isEnrolled ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {isEnrolled ? '🟢 Enrolled' : '🔴 Not Enrolled'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-xs font-mono">
                            {emp.fingerprint?.enrolledAt ? new Date(emp.fingerprint.enrolledAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-xs font-mono">
                            {emp.fingerprint?.lastVerifiedAt ? new Date(emp.fingerprint.lastVerifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs font-medium">
                            {emp.fingerprint?.deviceName || 'USB Biometric Reader'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {!isEnrolled ? (
                                <button
                                  onClick={() => handleEnrollFingerprint(emp)}
                                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                                >
                                  <Fingerprint size={14} /> Enroll Fingerprint
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEnrollFingerprint(emp)}
                                    className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-2.5 py-1.5 rounded-lg transition-colors border border-blue-200"
                                    title="Re-enroll fingerprint"
                                  >
                                    <RotateCcw size={13} /> Re-enroll
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFingerprint(emp._id, emp.name)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                                    title="Delete Fingerprint Profile"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. SHIFT SCHEDULER */}
      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shifts List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-2 border-b pb-2">Shift Routines</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shifts.map(shift => (
                <div key={shift._id} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between gap-4 hover:border-blue-400 transition-colors shadow-sm bg-slate-50/50">
                  <div>
                    <h3 className="font-extrabold text-[#1e4c82]">{shift.name}</h3>
                    <div className="text-xs text-gray-500 font-semibold font-mono mt-1">
                      {shift.startTime} - {shift.endTime}
                    </div>
                    <div className="text-[10px] bg-slate-200/70 inline-block px-2 py-0.5 rounded text-gray-600 font-bold uppercase tracking-wide mt-2">
                      Grace: {shift.gracePeriod} mins
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t pt-2 mt-2 border-gray-200">
                    <button
                      onClick={() => handleOpenEditShift(shift)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteShift(shift._id, shift.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Staff List */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-2 border-b pb-2">Staff Roster</h2>
            <div className="overflow-y-auto max-h-96 divide-y">
              {employees.map(emp => (
                <div key={emp._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-gray-900">{emp.name}</div>
                    <div className="text-gray-500 font-medium">{emp.position}</div>
                  </div>
                  <span className={`px-2 py-1.5 rounded font-black border text-[9px] uppercase tracking-wide ${
                    emp.shift ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {emp.shift ? emp.shift.name : 'No Shift'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. QR SIGN STATIONS */}
      {activeTab === 'stations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Station sign builder */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-2 border-b pb-2">Entrance QR Terminals</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stations.map(station => (
                <div key={station._id} className="border border-gray-200 rounded-xl p-4 bg-slate-50 flex items-center justify-between shadow-sm">
                  <div>
                    <h3 className="font-extrabold text-gray-900">{station.name}</h3>
                    <div className="text-xs text-gray-500 font-semibold mt-1">Location: {station.locationType}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedStation(station)}
                      className="p-2 bg-white hover:bg-slate-100 border text-[#1e4c82] rounded-lg transition-colors font-bold text-xs flex items-center gap-1"
                    >
                      <QrCode size={14} /> Preview
                    </button>
                    <button
                      onClick={() => handleDeleteStation(station._id, station.name)}
                      className="p-2 border text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Station"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center flex flex-col justify-center items-center gap-4">
            <div className="p-3 bg-blue-50 text-[#1e4c82] rounded-full"><Smartphone size={32} /></div>
            <h3 className="font-extrabold">Device Scanners</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Place printed signs at entrances, receptions, warehouses, or offices. Employees scan with their mobile devices to record check-in/out biometrically.
            </p>
          </div>
        </div>
      )}

      {/* 6. REPORTS MAKER */}
      {activeTab === 'reports' && (
        <div className="flex flex-col gap-4">
          <div className="card bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Report Format</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                >
                  <option value="daily">Daily Attendance</option>
                  <option value="weekly">Weekly Attendance</option>
                  <option value="monthly">Monthly Attendance</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Target Staff member</label>
                <select
                  value={reportEmployeeId}
                  onChange={(e) => setReportEmployeeId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                >
                  <option value="">-- All Employees --</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Select Date</label>
                <input
                  type={reportType === 'monthly' ? 'month' : 'date'}
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleGenerateReport}
                  className="flex-1 py-2 bg-[#1e4c82] hover:bg-[#122e50] text-white rounded-lg text-sm font-bold shadow transition-colors"
                >
                  Generate Report
                </button>
                {reportData.length > 0 && (
                  <button
                    onClick={printReportTable}
                    className="p-2 border border-gray-300 hover:bg-slate-50 text-gray-600 rounded-lg flex items-center justify-center"
                    title="Print / Save PDF"
                  >
                    <Printer size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Generated Report table */}
          {reportData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Check In</th>
                      <th className="px-6 py-4">Check Out</th>
                      <th className="px-6 py-4">Hours Clocked</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.map(log => (
                      <tr key={log._id} className="text-sm font-medium">
                        <td className="px-6 py-4 text-gray-900">{log.employee?.name || 'Deleted'}</td>
                        <td className="px-6 py-4 text-gray-600">{log.date}</td>
                        <td className="px-6 py-4 text-gray-500 font-mono">
                          {log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-mono">
                          {log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-6 py-4 text-gray-950 font-bold">{log.totalHours ? `${log.totalHours.toFixed(2)} hrs` : '0.00 hrs'}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            log.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>{log.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. POLICIES & SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 border-b pb-2">Rule Configs</h2>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Standard Office Start Time</label>
                  <input
                    type="time"
                    value={attendanceSettings.officeStartTime}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, officeStartTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Standard Office End Time</label>
                  <input
                    type="time"
                    value={attendanceSettings.officeEndTime}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, officeEndTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={attendanceSettings.gracePeriod}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, gracePeriod: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Late Threshold (Minutes)</label>
                  <input
                    type="number"
                    value={attendanceSettings.lateThreshold}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, lateThreshold: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 bg-[#1e4c82] hover:bg-[#122e50] text-white rounded-lg px-6 font-bold shadow text-sm"
              >
                Save Policy Configurations
              </button>
            </form>
          </div>

          {/* Audit Trails */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider border-b pb-2">Audit Logs</h2>
            <div className="overflow-y-auto max-h-96 divide-y text-xs">
              {auditLogs.length === 0 ? (
                <div className="text-gray-400 py-4 text-center">No action logs found.</div>
              ) : (
                auditLogs.map(log => (
                  <div key={log._id} className="py-2.5">
                    <div className="font-bold text-gray-900">{log.action}</div>
                    <div className="text-gray-600 mt-0.5">{log.details}</div>
                    <div className="text-[10px] text-gray-400 mt-1">By: {log.performedBy} · {new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}


      {/* ─── MODALS ─── */}

      {/* Manual log override Modal */}
      {showManualLogModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-[#1e4c82] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Log Manual Adjustment</h3>
              <button onClick={() => setShowManualLogModal(false)} className="text-white/80 hover:text-white font-bold">&times;</button>
            </div>
            <form onSubmit={handleSaveManualLog} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Employee *</label>
                <select
                  required
                  value={manualForm.employeeId}
                  onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                >
                  <option value="">-- Choose Staff member --</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} (${emp.salary}/mo)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Log Date *</label>
                  <input
                    type="date"
                    required
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Adjusted Status</label>
                  <select
                    value={manualForm.status}
                    onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Overtime">Overtime</option>
                    <option value="Early Departure">Early Departure</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Check In Time</label>
                  <input
                    type="time"
                    value={manualForm.checkInTime}
                    onChange={(e) => setManualForm({ ...manualForm, checkInTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Check Out Time</label>
                  <input
                    type="time"
                    value={manualForm.checkOutTime}
                    onChange={(e) => setManualForm({ ...manualForm, checkOutTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setShowManualLogModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1e4c82] hover:bg-[#122e50] text-white font-bold rounded-lg text-sm"
                >
                  Apply Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Edit/Create Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-[#1e4c82] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">{editingShift ? 'Edit Shift Details' : 'Create Custom Shift'}</h3>
              <button onClick={() => setShowShiftModal(false)} className="text-white/80 hover:text-white font-bold">&times;</button>
            </div>
            <form onSubmit={handleSaveShift} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Shift Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Shift"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Grace Period (Minutes)</label>
                <input
                  type="number"
                  value={shiftForm.gracePeriod}
                  onChange={(e) => setShiftForm({ ...shiftForm, gracePeriod: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1e4c82] hover:bg-[#122e50] text-white font-bold rounded-lg text-sm"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Shift Modal */}
      {showAssignShiftModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#1e4c82] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Assign Shift to Employee</h3>
              <button onClick={() => setShowAssignShiftModal(false)} className="text-white/80 hover:text-white font-bold">&times;</button>
            </div>
            <form onSubmit={handleAssignShift} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Employee *</label>
                <select
                  required
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} ({emp.position})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Scheduled Shift</label>
                <select
                  value={assignForm.shiftId}
                  onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                >
                  <option value="">-- No Shift (Default Office hours) --</option>
                  {shifts.map(shift => (
                    <option key={shift._id} value={shift._id}>{shift.name} ({shift.startTime} - {shift.endTime})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setShowAssignShiftModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1e4c82] hover:bg-[#122e50] text-white font-bold rounded-lg text-sm"
                >
                  Assign Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Station Modal */}
      {showStationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#1e4c82] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Create QR Sign Station</h3>
              <button onClick={() => setShowStationModal(false)} className="text-white/80 hover:text-white font-bold">&times;</button>
            </div>
            <form onSubmit={handleCreateStation} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Station / Location Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Front Entrance reception"
                  value={stationForm.name}
                  onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Station Placement</label>
                <select
                  value={stationForm.locationType}
                  onChange={(e) => setStationForm({ ...stationForm, locationType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                >
                  <option value="Entrance">Entrance</option>
                  <option value="Reception">Reception</option>
                  <option value="Office">Office</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Branch Location">Branch Location</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setShowStationModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1e4c82] hover:bg-[#122e50] text-white font-bold rounded-lg text-sm"
                >
                  Create Sign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code sign card preview modal */}
      {selectedStation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
            <div className="bg-[#1e4c82] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-extrabold text-sm flex items-center gap-2 uppercase tracking-wide">
                <QrCode className="w-5 h-5" /> QR Sign Preview
              </h3>
              <button onClick={() => setSelectedStation(null)} className="text-white/80 hover:text-white text-2xl font-bold">&times;</button>
            </div>
            
            <div className="p-6 flex flex-col items-center gap-5">
              
              <div 
                ref={qrPreviewRef}
                className="bg-white p-4 rounded-xl border border-slate-100 shadow"
                style={{ lineHeight: 0 }}
              >
                <QRCodeSVG
                  value={getQRUrl(selectedStation.token)}
                  size={240}
                  level="H"
                  marginSize={4}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>

              <div className="w-full bg-slate-50 rounded-lg p-2.5 text-center border">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target URL</p>
                <p className="text-[10px] font-mono text-slate-600 break-all">{getQRUrl(selectedStation.token)}</p>
              </div>

              <div className="w-full grid grid-cols-2 gap-2">
                <button
                  onClick={() => downloadPNG(selectedStation)}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-[#1e4c82] hover:bg-[#122e50] text-white rounded-lg text-xs font-bold shadow transition-colors"
                >
                  <FileImage size={14} /> PNG Image
                </button>
                <button
                  onClick={() => printStationSign(selectedStation)}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow transition-colors"
                >
                  <Printer size={14} /> Print Sign card
                </button>
              </div>
              
              <button
                onClick={() => handleRegenerateStationToken(selectedStation._id)}
                className="w-full py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
              >
                <RefreshCw size={12} /> Regenerate Secure QR Code
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Fingerprint Enrollment Biometric Capture Modal */}
      {showEnrollModal && enrollingEmp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                <Fingerprint size={20} /> Fingerprint Enrollment Station
              </h3>
              <button 
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollingEmp(null);
                }} 
                className="text-white/80 hover:text-white text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 flex flex-col items-center gap-5 text-center">
              <div className="flex items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-left">
                {enrollingEmp.photoUrl ? (
                  <img src={enrollingEmp.photoUrl} alt={enrollingEmp.name} className="w-12 h-12 rounded-full object-cover border" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-base font-bold text-blue-700">
                    {enrollingEmp.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-gray-900 text-base">{enrollingEmp.name}</h4>
                  <p className="text-xs text-gray-500 font-medium">{enrollingEmp.position} · {enrollingEmp.department || 'General'}</p>
                  <p className="text-[11px] text-emerald-600 font-mono font-bold mt-0.5">
                    {enrollingEmp.fingerprint?.enrollmentStatus === 'Enrolled' ? 'Re-enrollment Mode' : 'New Enrollment'}
                  </p>
                </div>
              </div>

              {/* Sensor Scanner Visualizer */}
              <div className={`p-6 rounded-full border-4 transition-all duration-500 ${
                enrollStep === 'scanning' ? 'bg-amber-50 border-amber-400 text-amber-500 animate-pulse ring-8 ring-amber-100' :
                enrollStep === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-600 ring-8 ring-emerald-100' :
                'bg-slate-50 border-blue-500 text-blue-600'
              }`}>
                <Fingerprint size={64} />
              </div>

              <div className="space-y-1">
                <h5 className="font-extrabold text-gray-900 text-sm">
                  {enrollStep === 'scanning' ? 'Scanning Fingerprint Sensor...' :
                   enrollStep === 'success' ? 'Fingerprint Registered Successfully!' :
                   'Place Finger on USB Scanner'}
                </h5>
                <p className="text-xs text-gray-500 max-w-xs">
                  {enrollStep === 'scanning' ? 'Keep finger still on the sensor while template hash is captured.' :
                   enrollStep === 'success' ? 'Biometric credential saved to employee profile.' :
                   'Ensure USB Fingerprint Scanner is connected to device port.'}
                </p>
              </div>

              <div className="flex gap-3 w-full border-t pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setEnrollingEmp(null);
                  }}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartEnrollScan}
                  disabled={enrollStep === 'scanning' || !fpDeviceConnected}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white shadow transition-all flex items-center justify-center gap-1.5 ${
                    !fpDeviceConnected ? 'bg-slate-400 cursor-not-allowed' :
                    enrollStep === 'scanning' ? 'bg-amber-500 animate-pulse' :
                    'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Fingerprint size={16} />
                  {enrollStep === 'scanning' ? 'Scanning...' : 'Capture Fingerprint'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Attendance;
