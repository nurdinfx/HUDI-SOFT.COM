/**
 * print.js — Unified POS print router.
 *
 * Priority order:
 *  1. Electron Direct Print  (silent, no dialog)
 *  2. Electron Print Preview (Electron print dialog)
 *  3. Browser iframe print   (normal browser/PWA preview)
 *
 * This file only routes print jobs. It does not change APIs, auth, DB, or
 * business logic.
 */

const DEFAULT_ELECTRON_SETTINGS = {
  defaultPrinter: '',
  customerReceiptPrinter: '',
  kitchenPrinter: '',
  directPrintMode: false,
  autoPrintEnabled: true,
  paperWidth: '80mm',
  printBackground: true,
};

const LAST_PRINT_JOB_KEY = 'hudi-pos-last-print-job';

let _electronSettings = null;

function hasElectronAPI() {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

export async function getElectronPrinterSettings() {
  if (!hasElectronAPI()) return null;
  if (_electronSettings) return _electronSettings;

  try {
    _electronSettings = {
      ...DEFAULT_ELECTRON_SETTINGS,
      ...(await window.electronAPI.getPrinterSettings()),
    };
  } catch (e) {
    _electronSettings = { ...DEFAULT_ELECTRON_SETTINGS };
  }

  return _electronSettings;
}

export function invalidatePrinterSettingsCache() {
  _electronSettings = null;
}

export async function shouldAutoPrintAfterPayment(fallbackValue = true) {
  if (hasElectronAPI()) {
    const settings = await getElectronPrinterSettings();
    if (typeof settings?.autoPrintEnabled === 'boolean') {
      return settings.autoPrintEnabled;
    }
  }

  return fallbackValue !== false;
}

function resolvePrintJobOptions(settings, options = {}) {
  const jobType = options.jobType || 'receipt';
  const paperWidth = options.paperWidth || settings?.paperWidth || '80mm';

  let printerName = options.printerName || '';

  if (!printerName) {
    if (jobType === 'kitchen') {
      printerName = settings?.kitchenPrinter || settings?.defaultPrinter || '';
    } else if (jobType === 'customerReceipt' || jobType === 'receipt') {
      printerName = settings?.customerReceiptPrinter || settings?.defaultPrinter || '';
    } else {
      printerName = settings?.defaultPrinter || '';
    }
  }

  return {
    ...options,
    jobType,
    paperWidth,
    printerName,
  };
}

function persistLastPrintJob(htmlContent, options = {}) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (options.saveAsLastReceipt === false) return;
  if (options.jobType === 'kitchen') return;

  try {
    const payload = {
      htmlContent,
      options: {
        jobType: options.jobType || 'customerReceipt',
        paperWidth: options.paperWidth,
        printerName: options.printerName || '',
        orderNumber: options.orderNumber || '',
        orderId: options.orderId || '',
      },
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(LAST_PRINT_JOB_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Could not cache last print job:', e);
  }
}

export function getLastPrintedReceiptJob() {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    const raw = window.localStorage.getItem(LAST_PRINT_JOB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function reprintLastPrintedReceipt() {
  const lastJob = getLastPrintedReceiptJob();
  if (!lastJob?.htmlContent) {
    return { success: false, reason: 'no-last-receipt' };
  }

  return printToIframe(lastJob.htmlContent, {
    ...(lastJob.options || {}),
    isReprint: true,
    saveAsLastReceipt: false,
  });
}

/**
 * Main print entry point used by the POS module.
 *
 * @param {string} htmlContent Full receipt HTML
 * @param {object} options Optional printer routing metadata
 */
export const printToIframe = async (htmlContent, options = {}) => {
  const normalizedOptions = {
    jobType: 'receipt',
    saveAsLastReceipt: true,
    ...options,
  };

  persistLastPrintJob(htmlContent, normalizedOptions);

  if (hasElectronAPI()) {
    const settings = await getElectronPrinterSettings();
    const electronOptions = resolvePrintJobOptions(settings, normalizedOptions);

    if (settings?.directPrintMode && normalizedOptions.forcePreview !== true) {
      try {
        const result = await window.electronAPI.printDirect(htmlContent, electronOptions);
        if (result?.success) {
          return { success: true, mode: 'electron-silent', ...result };
        }
        console.warn('Direct print failed, falling back to preview:', result?.reason);
      } catch (e) {
        console.warn('Direct print threw, falling back to preview:', e);
      }
    }

    try {
      const result = await window.electronAPI.printPreview(htmlContent, electronOptions);
      return { success: !!result?.success, mode: 'electron-preview', ...result };
    } catch (e) {
      console.warn('Electron preview failed, falling back to browser iframe:', e);
    }
  }

  _printViaIframe(htmlContent);
  return { success: true, mode: 'browser' };
};

/**
 * Internal: browser-based iframe print.
 * With Chrome --kiosk-printing no dialog appears.
 * Without it the standard browser print dialog shows.
 */
function _printViaIframe(htmlContent) {
  const existing = document.getElementById('__silent_print_iframe__');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = '__silent_print_iframe__';
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:1px;height:1px;border:none;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.warn('Browser iframe print failed:', e);
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) iframe.remove();
      }, 3000);
    }, 300);
  };

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();
}
