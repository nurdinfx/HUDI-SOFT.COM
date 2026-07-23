import { BleClient, numbersToDataView } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

/**
 * Utility for direct Bluetooth printing using Web Bluetooth API or Capacitor Native BLE
 */

let pairedDevice = null;
let nativeDeviceId = null;

const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

export const isBluetoothConnected = () => {
  if (Capacitor.isNativePlatform()) {
    return !!nativeDeviceId;
  }
  return !!pairedDevice;
};

export const connectBluetoothPrinter = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await BleClient.initialize();
      const device = await BleClient.requestDevice({
        services: [PRINTER_SERVICE_UUID],
        optionalServices: [PRINTER_SERVICE_UUID]
      });
      
      await BleClient.connect(device.deviceId, (deviceId) => {
        console.log('Printer disconnected:', deviceId);
        nativeDeviceId = null;
      });
      
      nativeDeviceId = device.deviceId;
      return device;
    } else {
      // Web Implementation
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [PRINTER_SERVICE_UUID] }, 
          { namePrefix: 'P58' }, 
          { namePrefix: 'TP' }, 
          { namePrefix: 'MPT' }
        ],
        optionalServices: [PRINTER_SERVICE_UUID]
      });
      pairedDevice = device;
      return device;
    }
  } catch (error) {
    console.error('Bluetooth connection failed:', error);
    throw error;
  }
};

export const printBluetooth = async (text) => {
  try {
    if (Capacitor.isNativePlatform()) {
      if (!nativeDeviceId) {
        await connectBluetoothPrinter();
      }

      // Simple ESC/POS encoding
      const encoder = new TextEncoder();
      const initPrinter = [0x1B, 0x40];
      const feedLines = [0x1B, 0x64, 0x06];
      const cutPaper = [0x1D, 0x56, 0x42, 0x00];
      const textData = Array.from(encoder.encode(text + '\n'));
      
      const combinedData = [...initPrinter, ...textData, ...feedLines, ...cutPaper];

      // Native BLE writing (handles chunking automatically usually, but we'll be safe)
      const chunkSize = 20;
      for (let i = 0; i < combinedData.length; i += chunkSize) {
        const chunk = combinedData.slice(i, i + chunkSize);
        await BleClient.write(
          nativeDeviceId,
          PRINTER_SERVICE_UUID,
          PRINTER_CHARACTERISTIC_UUID,
          numbersToDataView(chunk)
        );
      }
    } else {
      // Web Implementation
      if (!pairedDevice) {
        pairedDevice = await connectBluetoothPrinter();
      }

      const server = await pairedDevice.gatt.connect();
      const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(PRINTER_CHARACTERISTIC_UUID);

      const encoder = new TextEncoder();
      const initPrinter = new Uint8Array([0x1B, 0x40]);
      const feedLines = new Uint8Array([0x1B, 0x64, 0x06]);
      const cutPaper = new Uint8Array([0x1D, 0x56, 0x42, 0x00]);
      const textData = encoder.encode(text + '\n');
      
      const combinedData = new Uint8Array(initPrinter.length + textData.length + feedLines.length + cutPaper.length);
      let offset = 0;
      combinedData.set(initPrinter, offset); offset += initPrinter.length;
      combinedData.set(textData, offset); offset += textData.length;
      combinedData.set(feedLines, offset); offset += feedLines.length;
      combinedData.set(cutPaper, offset); offset += cutPaper.length;

      const chunkSize = 20;
      for (let i = 0; i < combinedData.length; i += chunkSize) {
        await characteristic.writeValue(combinedData.slice(i, i + chunkSize));
      }
    }
  } catch (error) {
    console.error('Print failed:', error);
    throw error;
  }
};
