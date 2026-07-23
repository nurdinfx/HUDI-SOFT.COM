import { create } from 'zustand';
import { STORAGE_KEYS } from '@/constants';
import * as SecureStore from '@/utils/secureStore';

export interface BluetoothPrinterDevice {
  name: string;
  address: string;
}

interface PrinterState {
  selectedPrinter: BluetoothPrinterDevice | null;
  paperSize: '58mm' | '80mm';
  isConnected: boolean;
  isConnecting: boolean;

  initialize: () => Promise<void>;
  setPrinter: (printer: BluetoothPrinterDevice | null) => void;
  setPaperSize: (size: '58mm' | '80mm') => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
}

export const usePrinterStore = create<PrinterState>((set) => ({
  selectedPrinter: null,
  paperSize: '58mm',
  isConnected: false,
  isConnecting: false,

  initialize: async () => {
    try {
      const savedPrinterJson = await SecureStore.getItemAsync(STORAGE_KEYS.DEFAULT_PRINTER);
      const savedPaperSize = await SecureStore.getItemAsync(STORAGE_KEYS.PAPER_SIZE);

      let selectedPrinter: BluetoothPrinterDevice | null = null;
      if (savedPrinterJson) {
        try {
          selectedPrinter = JSON.parse(savedPrinterJson);
        } catch {
          // ignore
        }
      }

      set({
        selectedPrinter,
        paperSize: savedPaperSize === '80mm' ? '80mm' : '58mm',
      });
    } catch (err) {
      console.error('Failed to initialize printer store', err);
    }
  },

  setPrinter: (printer: BluetoothPrinterDevice | null) => {
    void (async () => {
      try {
        if (printer) {
          await SecureStore.setItemAsync(STORAGE_KEYS.DEFAULT_PRINTER, JSON.stringify(printer));
        } else {
          await SecureStore.deleteItemAsync(STORAGE_KEYS.DEFAULT_PRINTER);
        }
        set({ selectedPrinter: printer, isConnected: false });
      } catch (err) {
        console.error('Failed to save default printer', err);
      }
    })();
  },

  setPaperSize: (size: '58mm' | '80mm') => {
    void (async () => {
      try {
        await SecureStore.setItemAsync(STORAGE_KEYS.PAPER_SIZE, size);
        set({ paperSize: size });
      } catch (err) {
        console.error('Failed to save paper size', err);
      }
    })();
  },

  setConnected: (isConnected: boolean) => set({ isConnected, isConnecting: false }),
  setConnecting: (isConnecting: boolean) => set({ isConnecting }),
}));
