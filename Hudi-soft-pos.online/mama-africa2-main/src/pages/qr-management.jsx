// src/pages/qr-management.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { qrAPI, realApi } from '../api/realApi';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { 
  QrCode, 
  Settings, 
  Download, 
  Printer, 
  RefreshCw, 
  Power, 
  TrendingUp, 
  DollarSign, 
  Smartphone, 
  BarChart3, 
  Check, 
  Eye, 
  X, 
  AlertCircle,
  FileImage,
  FileCode
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build the QR value (short URL preferred) */
const buildQRValue = (table) => {
  if (table.qrUrl) {
    return table.qrUrl.replace('/menu?table=', '/order?table=');
  }
  const base = window.location.origin;
  return `${base}/order?table=${table.qrToken || ''}`;
};

/** Serialize an SVG element to a data-URI string */
const svgToDataURI = (svgEl) => {
  const svgString = new XMLSerializer().serializeToString(svgEl);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
};

/** Render a hidden high-res canvas for download (1024×1024) */
const renderHighResCanvas = (qrValue) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    // qrcode.react doesn't expose a direct API, so we use qrcode lib via SVG rasterisation
    // Approach: render an off-screen SVG component → serialize → draw onto canvas
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // We'll use a temporary QRCodeCanvas at 1024px
    const { createRoot } = window.__reactRoot || {};
    // Fallback: use import dynamically rendered via ReactDOM
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(container);
      const { createElement } = window.React || {};

      // Use React.createElement directly to avoid JSX transform issues
      const React = window.React;

      // Render QRCodeCanvas hidden at 1024×1024
      const { QRCodeCanvas: QRC } = window.__qrcodeReact || {};

      // Best approach without root React: draw SVG onto canvas
      const svgEl = document.querySelector('#qr-svg-preview svg');
      if (svgEl) {
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, 1024, 1024);
          ctx.drawImage(img, 0, 0, 1024, 1024);
          document.body.removeChild(container);
          root.unmount();
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
          document.body.removeChild(container);
          root.unmount();
          resolve(null);
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
      } else {
        document.body.removeChild(container);
        root.unmount();
        resolve(null);
      }
    });
  });
};

// ─── Download helpers ─────────────────────────────────────────────────────────

/**
 * Download QR as high-quality PNG (1024×1024) using an off-screen canvas.
 * We grab the live SVG from the preview modal and rasterise it.
 */
const downloadQRAsPNG = (table, svgContainerRef) => {
  const svgEl = svgContainerRef?.current?.querySelector('svg');
  if (!svgEl) { alert('QR preview not found. Open the preview first.'); return; }

  const SIZE = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();

  img.onload = () => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `table-${table.number || table._id}-qr-1024px.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    alert('Failed to generate PNG. Try SVG download instead.');
  };

  img.src = url;
};

/** Download QR as raw SVG file */
const downloadQRAsSVG = (table, svgContainerRef) => {
  const svgEl = svgContainerRef?.current?.querySelector('svg');
  if (!svgEl) { alert('QR preview not found. Open the preview first.'); return; }

  // Clone and set explicit dimensions
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('width', '500');
  clone.setAttribute('height', '500');

  const svgData = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `table-${table.number || table._id}-qr.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Print a premium QR card using SVG inline */
const printQRCard = (table, svgContainerRef) => {
  const svgEl = svgContainerRef?.current?.querySelector('svg');
  if (!svgEl) { alert('QR preview not found. Open the preview first.'); return; }

  const svgClone = svgEl.cloneNode(true);
  // Ensure crisp rendering at print size (200px = ~53mm at 96dpi)
  svgClone.setAttribute('width', '300');
  svgClone.setAttribute('height', '300');
  const svgInline = svgClone.outerHTML;

  const tableNum = table.number || table.tableNumber || table._id;
  const printWindow = window.open('', '_blank', 'width=600,height=700');

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>QR Code — Table ${tableNum}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: 100mm 130mm; margin: 0; }
    @media print {
      body { margin: 0; padding: 0; }
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 8mm;
    }
    .card {
      width: 88mm;
      border: 2.5px solid #0f172a;
      border-radius: 6mm;
      padding: 6mm 7mm;
      text-align: center;
      background: #fff;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .brand {
      font-size: 14pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.03em;
      line-height: 1.1;
      margin-bottom: 1.5mm;
    }
    .tagline {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-bottom: 4mm;
    }
    .qr-wrap {
      display: inline-block;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4mm;
      padding: 4mm;
      margin-bottom: 4mm;
    }
    .qr-wrap svg {
      display: block;
      width: 60mm !important;
      height: 60mm !important;
    }
    .table-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 20pt;
      font-weight: 900;
      padding: 2mm 6mm;
      border-radius: 3mm;
      letter-spacing: -0.02em;
    }
    .instructions {
      font-size: 6.5pt;
      color: #475569;
      font-weight: 500;
      margin-top: 3mm;
      line-height: 1.6;
    }
    .wifi-hint {
      font-size: 6pt;
      color: #94a3b8;
      margin-top: 2mm;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">MAMA AFRICA RESTAURANT</div>
    <div class="tagline">Scan &amp; Order Instantly</div>
    <div class="qr-wrap">
      ${svgInline}
    </div>
    <div>
      <div class="table-badge">TABLE ${tableNum}</div>
    </div>
    <div class="instructions">
      Point your smartphone camera at the QR code above.<br>
      Browse our menu and place your order — no app needed.
    </div>
    <div class="wifi-hint">📶 Requires internet connection</div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 800);
      }, 300);
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
};

// ─── QR Preview Modal ─────────────────────────────────────────────────────────

const QRPreviewModal = ({ table, onClose, onToggle, onRegenerate }) => {
  const svgRef = useRef(null);
  const qrValue = buildQRValue(table);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <h3 className="font-black text-base flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            QR Code — Table {table.number || table.tableNumber}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-5">
          
          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
            table.qrEnabled 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            <Power className="w-3 h-3" />
            {table.qrEnabled ? 'ACTIVE — Customers can scan' : 'DISABLED — Scanning blocked'}
          </div>

          {/* QR Code — SVG, 300×300, Level H, quiet zone 4 */}
          <div 
            ref={svgRef}
            id="qr-svg-preview"
            className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-inner"
            style={{ lineHeight: 0 }}
          >
            <QRCodeSVG
              value={qrValue}
              size={300}
              level="H"
              marginSize={4}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </div>

          {/* URL display */}
          <div className="w-full bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">QR Target URL</p>
            <p className="text-xs font-mono text-slate-600 break-all">{qrValue}</p>
          </div>

          {/* Download row */}
          <div className="w-full grid grid-cols-2 gap-2">
            <button
              onClick={() => downloadQRAsPNG(table, svgRef)}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition-colors shadow"
            >
              <FileImage className="w-4 h-4" /> PNG (1024px)
            </button>
            <button
              onClick={() => downloadQRAsSVG(table, svgRef)}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-colors shadow"
            >
              <FileCode className="w-4 h-4" /> SVG Vector
            </button>
          </div>

          {/* Action row */}
          <div className="w-full grid grid-cols-3 gap-2">
            <button
              onClick={() => printQRCard(table, svgRef)}
              className="flex items-center justify-center gap-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={() => onToggle(table._id)}
              className={`flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-black transition-colors border ${
                table.qrEnabled 
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Power className="w-4 h-4" /> {table.qrEnabled ? 'Disable' : 'Enable'}
            </button>
            <button
              onClick={() => onRegenerate(table._id)}
              className="flex items-center justify-center gap-1 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-black transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Regen
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const QRManagement = () => {
  const [tables, setTables] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  // Load tables with QR details
  const fetchQRData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tablesRes, analyticsRes] = await Promise.all([
        qrAPI.getTablesWithQR(),
        qrAPI.getQRAnalytics()
      ]);

      if (tablesRes.success) {
        setTables(realApi.extractData(tablesRes) || []);
      } else {
        throw new Error(tablesRes.message || 'Failed to load tables');
      }

      if (analyticsRes.success) {
        setAnalytics(realApi.extractData(analyticsRes) || null);
      }
    } catch (err) {
      console.error('Error fetching QR data:', err);
      setError('Could not load QR Management data. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQRData(); }, [fetchQRData]);

  // Generate / Regenerate QR for a table
  const handleGenerateQR = async (tableId) => {
    try {
      const res = await qrAPI.generateQR(tableId);
      if (res.success) {
        const updatedTable = res.data;
        setTables(prev =>
          prev.map(t => t._id === tableId
            ? { ...t, qrToken: updatedTable.qrToken, qrUrl: updatedTable.qrUrl, qrEnabled: true, qrGeneratedAt: new Date() }
            : t
          )
        );
        if (selectedTable && selectedTable._id === tableId) {
          setSelectedTable(prev => ({
            ...prev,
            qrToken: updatedTable.qrToken,
            qrUrl: updatedTable.qrUrl,
            qrEnabled: true
          }));
        }
        alert('QR code generated successfully!');
      } else {
        alert('Failed to generate QR code: ' + res.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error generating QR code');
    }
  };

  // Toggle QR activation status
  const handleToggleQR = async (tableId) => {
    try {
      const res = await qrAPI.toggleQR(tableId);
      if (res.success) {
        const isEnabled = res.data.qrEnabled;
        setTables(prev =>
          prev.map(t => t._id === tableId ? { ...t, qrEnabled: isEnabled } : t)
        );
        if (selectedTable && selectedTable._id === tableId) {
          setSelectedTable(prev => ({ ...prev, qrEnabled: isEnabled }));
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to toggle QR status');
    }
  };

  // Bulk Generate
  const handleBulkGenerate = async () => {
    const targetTables = tables.filter(t => !t.qrToken);
    if (targetTables.length === 0) {
      alert('All tables already have generated QR Codes!');
      return;
    }
    if (!window.confirm(`Generate QR codes for ${targetTables.length} tables?`)) return;

    setBulkGenerating(true);
    setBulkProgress(0);
    let completed = 0;

    for (const table of targetTables) {
      try {
        await qrAPI.generateQR(table._id);
        completed++;
        setBulkProgress(Math.round((completed / targetTables.length) * 100));
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error(`Failed bulk generate for table ${table.number}:`, err);
      }
    }

    setBulkGenerating(false);
    alert(`Bulk generation complete! Generated ${completed} QR codes.`);
    fetchQRData();
  };

  // Print ALL active QR codes — one per page, using inline SVG
  const handlePrintAllEnabled = () => {
    const enabledTables = tables.filter(t => t.qrToken && t.qrEnabled);
    if (enabledTables.length === 0) {
      alert('No active QR codes to print!');
      return;
    }

    const cards = enabledTables.map(table => {
      const qrValue = buildQRValue(table);
      const tableNum = table.number || table.tableNumber || table._id;

      // We cannot render React here, so we generate a QR data-URL via a canvas approach
      // Instead: generate a placeholder card with the URL for the print window
      // The print window will use a CDN-loaded qrcode library to render
      return `
        <div class="page">
          <div class="card">
            <div class="brand">MAMA AFRICA RESTAURANT</div>
            <div class="tagline">Scan &amp; Order Instantly</div>
            <div class="qr-wrap">
              <canvas id="qr-print-${tableNum}" width="300" height="300"></canvas>
            </div>
            <div><div class="table-badge">TABLE ${tableNum}</div></div>
            <div class="instructions">
              Point your smartphone camera at the QR code above.<br>
              Browse our menu and place your order — no app needed.
            </div>
          </div>
        </div>
        <script>
          (function() {
            var qrData = ${JSON.stringify({ value: qrValue, canvas: `qr-print-${tableNum}` })};
            window.__qrJobs = window.__qrJobs || [];
            window.__qrJobs.push(qrData);
          })();
        </script>
      `;
    }).join('');

    const printWindow = window.open('', '_blank', 'width=700,height=900');
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Print All QR Codes — ${enabledTables.length} Tables</title>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: 100mm 130mm; margin: 0; }
    @media print {
      body { margin: 0; padding: 0; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
    }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f1f5f9; }
    .page {
      display: flex; justify-content: center; align-items: center;
      width: 100vw; height: 100vh; padding: 8mm;
    }
    .card {
      width: 88mm; border: 2.5px solid #0f172a; border-radius: 6mm;
      padding: 6mm 7mm; text-align: center; background: #fff;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .brand { font-size: 14pt; font-weight: 900; color: #0f172a; letter-spacing: -0.03em; margin-bottom: 1.5mm; }
    .tagline { font-size: 7pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 4mm; }
    .qr-wrap { display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4mm; padding: 4mm; margin-bottom: 4mm; }
    .qr-wrap canvas { display: block; width: 60mm !important; height: 60mm !important; }
    .table-badge { display: inline-block; background: #0f172a; color: #fff; font-size: 20pt; font-weight: 900; padding: 2mm 6mm; border-radius: 3mm; }
    .instructions { font-size: 6.5pt; color: #475569; font-weight: 500; margin-top: 3mm; line-height: 1.6; }
  </style>
</head>
<body>
  ${cards}
  <script>
    window.onload = function() {
      var jobs = window.__qrJobs || [];
      var done = 0;
      if (jobs.length === 0) { window.print(); return; }
      jobs.forEach(function(job) {
        var canvas = document.getElementById(job.canvas);
        if (!canvas) { done++; if (done === jobs.length) { window.print(); setTimeout(function(){ window.close(); }, 800); } return; }
        QRCode.toCanvas(canvas, job.value, {
          errorCorrectionLevel: 'H',
          width: 300,
          margin: 4,
          color: { dark: '#000000', light: '#FFFFFF' }
        }, function(err) {
          done++;
          if (done === jobs.length) {
            setTimeout(function() { window.print(); setTimeout(function(){ window.close(); }, 800); }, 500);
          }
        });
      });
    };
  <\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  return (
    <div className="page-content bg-slate-50 min-h-screen p-6 flex flex-col gap-6 text-slate-800">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            📱 QR Code Board Management
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            High-quality SVG QR codes · Level H error correction · Instant smartphone scanning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkGenerate}
            disabled={bulkGenerating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-black transition-colors"
          >
            {bulkGenerating ? `Generating (${bulkProgress}%)` : 'BULK GENERATE QR'}
          </button>

          <button
            onClick={handlePrintAllEnabled}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> PRINT ALL ACTIVE
          </button>

          <button
            onClick={fetchQRData}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Analytics widgets */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Smartphone className="w-6 h-6" /></div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Scans</span>
              <span className="text-2xl font-black text-slate-900">{analytics.totalScans || 0}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">QR Orders</span>
              <span className="text-2xl font-black text-slate-900">{analytics.totalQROrders || 0}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><DollarSign className="w-6 h-6" /></div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">QR Revenue</span>
              <span className="text-2xl font-black text-slate-900">${(analytics.totalQRRevenue || 0).toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><QrCode className="w-6 h-6" /></div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Tables Active</span>
              <span className="text-2xl font-black text-slate-900">{analytics.tablesWithQR || 0} / {tables.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Table grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-slate-500 font-semibold flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-500 tracking-wider">
                  <th className="p-4 uppercase">Table</th>
                  <th className="p-4 uppercase">Location</th>
                  <th className="p-4 uppercase">Capacity</th>
                  <th className="p-4 uppercase text-center">QR Preview</th>
                  <th className="p-4 uppercase text-center">Status</th>
                  <th className="p-4 uppercase text-center">Scans</th>
                  <th className="p-4 uppercase text-center">Active Orders</th>
                  <th className="p-4 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tables.map(table => (
                  <tr key={table._id} className="hover:bg-slate-50/50 transition-colors text-sm font-semibold">

                    <td className="p-4">
                      <div className="font-black text-slate-900">TBL {table.number || table.tableNumber}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{table.name || 'No Name'}</div>
                    </td>

                    <td className="p-4 text-slate-600 capitalize">{table.location || 'Main'}</td>
                    <td className="p-4 text-slate-600">{table.capacity || 4} seats</td>

                    {/* Inline SVG thumbnail — 48px display, Level H */}
                    <td className="p-4">
                      <div className="flex justify-center items-center">
                        {table.qrToken ? (
                          <button
                            onClick={() => setSelectedTable(table)}
                            className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group relative"
                            title="Click to view full QR"
                          >
                            <QRCodeSVG
                              value={buildQRValue(table)}
                              size={52}
                              level="H"
                              marginSize={2}
                              bgColor="#FFFFFF"
                              fgColor="#000000"
                            />
                            <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-indigo-700" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No QR Code</span>
                        )}
                      </div>
                    </td>

                    {/* Toggle */}
                    <td className="p-4">
                      <div className="flex justify-center">
                        {table.qrToken ? (
                          <button
                            onClick={() => handleToggleQR(table._id)}
                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border transition-colors ${
                              table.qrEnabled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            {table.qrEnabled ? 'ACTIVE' : 'DISABLED'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">—</span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center font-bold text-slate-600">{table.qrScanCount || 0}</td>

                    <td className="p-4 text-center">
                      {table.activeOrders > 0 ? (
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-black">
                          {table.activeOrders} active
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {table.qrToken ? (
                          <>
                            <button
                              onClick={() => setSelectedTable(table)}
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-700 transition-colors"
                              title="Preview / Download / Print"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleGenerateQR(table._id)}
                              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                              title="Regenerate QR Code"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleGenerateQR(table._id)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-colors"
                          >
                            GENERATE
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

      {/* QR Preview Modal */}
      {selectedTable && (
        <QRPreviewModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onToggle={async (id) => {
            await handleToggleQR(id);
          }}
          onRegenerate={async (id) => {
            await handleGenerateQR(id);
          }}
        />
      )}

    </div>
  );
};

export default QRManagement;
