/**
 * PrinterSettings.jsx
 * Electron-only printer configuration panel.
 * Rendered inside the Settings → Printer tab.
 * Does NOT modify any business logic, DB schema, or API routes.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  invalidatePrinterSettingsCache,
  reprintLastPrintedReceipt,
} from '../../utils/print';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

const DEFAULT_SETTINGS = {
  defaultPrinter: '',
  customerReceiptPrinter: '',
  kitchenPrinter: '',
  directPrintMode: false,
  autoPrintEnabled: true,
  paperWidth: '80mm',
  printBackground: true,
};

function buildTestReceiptHtml(title, width = '80mm') {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      @page { size: ${width} auto; margin: 0; }
      body {
        font-family: 'Courier New', monospace;
        width: ${width};
        margin: 0 auto;
        padding: 4mm;
        font-size: 13px;
        color: #000;
      }
      .center { text-align: center; }
      .bold   { font-weight: bold; }
      .line   { border-top: 1px dashed #000; margin: 6px 0; }
      .row    { display: flex; justify-content: space-between; margin: 3px 0; }
      .big    { font-size: 16px; font-weight: bold; }
      .small  { font-size: 10px; color: #555; }
      .spacer { height: 60px; }
    </style>
  </head>
  <body>
    <div class="center bold big">${title}</div>
    <div class="center small">HUDI-SOFT POS DESKTOP</div>
    <div class="line"></div>
    <div class="row"><span>Test Item × 1</span><span>$10.00</span></div>
    <div class="row"><span>Test Item × 2</span><span>$20.00</span></div>
    <div class="line"></div>
    <div class="row bold"><span>TOTAL</span><span>$30.00</span></div>
    <div class="line"></div>
    <div class="center small" style="margin-top:8px;">
      Silent print routing check<br/>
      POWERED BY HUDI-SOFT
    </div>
    <div class="spacer"></div>
  </body>
  </html>`;
}

function PrinterSelect({ label, description, value, onChange, printers }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-slate-700"
      >
        <option value="">Use OS default / inherit</option>
        {printers.map((printer) => (
          <option key={printer.name} value={printer.name}>
            {printer.displayName || printer.name}
            {printer.isDefault ? ' (OS Default)' : ''}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export default function PrinterSettings() {
  const [printers, setPrinters] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTarget, setTestingTarget] = useState('');
  const [reprinting, setReprinting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    if (!isElectron) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [printerList, savedSettings] = await Promise.all([
        window.electronAPI.listPrinters(),
        window.electronAPI.getPrinterSettings(),
      ]);

      setPrinters(printerList || []);
      setSettings({
        ...DEFAULT_SETTINGS,
        ...(savedSettings || {}),
      });
    } catch (e) {
      setError('Failed to load printer information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSave = async () => {
    if (!isElectron) return;

    setSaving(true);
    setError('');

    try {
      const savedSettings = await window.electronAPI.savePrinterSettings(settings);
      setSettings({
        ...DEFAULT_SETTINGS,
        ...(savedSettings || {}),
      });
      invalidatePrinterSettingsCache();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError('Failed to save printer settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async (jobType) => {
    if (!isElectron) return;

    setTestingTarget(jobType);
    setTestResult(null);
    setError('');

    const html = buildTestReceiptHtml(
      jobType === 'kitchen' ? 'KITCHEN TEST' : 'CUSTOMER TEST',
      settings.paperWidth || '80mm',
    );

    const opts = {
      jobType,
      paperWidth: settings.paperWidth,
      saveAsLastReceipt: false,
    };

    try {
      let result;

      if (settings.directPrintMode) {
        result = await window.electronAPI.printDirect(html, opts);
        if (!result?.success) {
          result = await window.electronAPI.printPreview(html, opts);
        }
      } else {
        result = await window.electronAPI.printPreview(html, opts);
      }

      setTestResult(result?.success ? `${jobType}:success` : `${jobType}:failed`);
    } catch (e) {
      setTestResult(`${jobType}:failed`);
    } finally {
      setTestingTarget('');
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  const handleReprintLastReceipt = async () => {
    setReprinting(true);
    setError('');

    try {
      const result = await reprintLastPrintedReceipt();
      if (!result?.success) {
        setError('No last receipt is available to reprint yet.');
      }
    } catch (e) {
      setError('Failed to reprint the last receipt.');
    } finally {
      setReprinting(false);
    }
  };

  if (!isElectron) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Printer Settings</h2>
        <div className="border border-blue-100 rounded-xl p-6 bg-blue-50/40 text-center">
          <div className="text-4xl mb-3">🖥️</div>
          <p className="font-semibold text-slate-700 mb-1">Desktop App Required</p>
          <p className="text-sm text-slate-500">
            Direct thermal printer control is only available when running as the
            Electron desktop app. In the browser and PWA, POS receipts keep using
            the normal browser print preview.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500">
        <svg className="animate-spin h-6 w-6 mr-3 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading printer information…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Printer Settings</h2>
      <p className="text-sm text-slate-500">
        Configure POS desktop printing for 58mm and 80mm thermal printers. These
        settings stay on this device and do not change the browser or PWA flow.
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">🖨️</span>
          <div>
            <h3 className="text-base font-bold text-slate-800">Printer Routing</h3>
            <p className="text-xs text-slate-500">
              Assign POS print jobs to the correct thermal printer.
            </p>
          </div>
          <button
            onClick={loadAll}
            title="Refresh printer list"
            className="ml-auto text-xs text-blue-600 hover:underline"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PrinterSelect
            label="Default Printer"
            description="Fallback printer used when a specific POS printer is not selected."
            value={settings.defaultPrinter}
            onChange={(value) => setSettings((current) => ({ ...current, defaultPrinter: value }))}
            printers={printers}
          />

          <PrinterSelect
            label="Customer Receipt Printer"
            description="Used for POS receipts, reprints, and sales-history receipt printing."
            value={settings.customerReceiptPrinter}
            onChange={(value) => setSettings((current) => ({ ...current, customerReceiptPrinter: value }))}
            printers={printers}
          />

          <PrinterSelect
            label="Kitchen Printer"
            description="Used only for kitchen chits and kitchen update prints."
            value={settings.kitchenPrinter}
            onChange={(value) => setSettings((current) => ({ ...current, kitchenPrinter: value }))}
            printers={printers}
          />

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Paper Width</label>
            <select
              value={settings.paperWidth}
              onChange={(e) => setSettings((current) => ({ ...current, paperWidth: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-slate-700"
            >
              <option value="58mm">58mm receipt</option>
              <option value="80mm">80mm receipt</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Choose the thermal paper width used by your Epson, XPrinter, or other ESC/POS-compatible printer.
            </p>
          </div>
        </div>

        {printers.length === 0 && (
          <p className="mt-4 text-xs text-amber-600">
            No printers detected. Make sure the printer is installed in Windows before testing.
          </p>
        )}
      </div>

      <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">⚙️</span>
          <div>
            <h3 className="text-base font-bold text-slate-800">Printing Behaviour</h3>
            <p className="text-xs text-slate-500">
              Control silent printing and automatic POS receipt printing after payment.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/60">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">⚡</span>
                <span className="font-semibold text-slate-800 text-sm">Silent Print Mode</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                When enabled, POS customer and kitchen prints go straight to the assigned printer with no browser preview.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.directPrintMode}
                onChange={(e) => setSettings((current) => ({ ...current, directPrintMode: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/60">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">🧾</span>
                <span className="font-semibold text-slate-800 text-sm">Auto Print After Payment</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Controls automatic POS receipt printing after a sale is completed in the desktop app.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.autoPrintEnabled}
                onChange={(e) => setSettings((current) => ({ ...current, autoPrintEnabled: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🧪</span>
          <div>
            <h3 className="text-base font-bold text-slate-800">Test & Reprint</h3>
            <p className="text-xs text-slate-500">
              Verify both printer routes and reprint the most recent customer receipt.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => handleTestPrint('customerReceipt')}
            disabled={!!testingTarget}
            className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            {testingTarget === 'customerReceipt' ? 'Printing…' : 'Test Customer Printer'}
          </button>

          <button
            onClick={() => handleTestPrint('kitchen')}
            disabled={!!testingTarget}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            {testingTarget === 'kitchen' ? 'Printing…' : 'Test Kitchen Printer'}
          </button>

          <button
            onClick={handleReprintLastReceipt}
            disabled={reprinting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            {reprinting ? 'Reprinting…' : 'Reprint Last Receipt'}
          </button>

          {testResult?.includes('success') && (
            <span className="text-sm text-green-600 font-semibold">
              ✅ Test print sent successfully.
            </span>
          )}
          {testResult?.includes('failed') && (
            <span className="text-sm text-red-600 font-semibold">
              ❌ Test print failed. Check printer connection and driver.
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-bold text-sm shadow-sm transition-colors active:scale-95"
        >
          {saving ? 'Saving…' : '💾 Save Printer Settings'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-semibold">
            ✅ Printer settings saved.
          </span>
        )}
      </div>

      <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/40 text-xs text-slate-600 leading-relaxed">
        <strong>ℹ️ How it works:</strong> These settings are stored on this device only.
        Browser and PWA users keep the normal print preview. Electron desktop uses
        the selected customer or kitchen printer and falls back to the print dialog
        only if silent printing fails.
      </div>
    </div>
  );
}
