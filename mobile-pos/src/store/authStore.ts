import { create } from 'zustand';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '@/constants';
import { authApi, User } from '@/api';
import * as SecureStore from '@/utils/secureStore';

// Helper to get a persistent device/machine ID
export const getMachineId = async (): Promise<string> => {
  try {
    if (Platform.OS === 'android') {
      return Application.getAndroidId() || 'fallback-android';
    } else if (Platform.OS === 'ios') {
      const id = await Application.getIosIdForVendorAsync();
      return id || 'fallback-ios';
    }
  } catch (err) {
    console.error('Failed to get device ID', err);
  }
  return 'fallback-device-id';
};

interface AuthState {
  licenseKey: string | null;
  licenseValid: boolean;
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  activateLicense: (key: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  licenseKey: null,
  licenseValid: false,
  token: null,
  user: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const licenseKey = await SecureStore.getItemAsync(STORAGE_KEYS.LICENSE_KEY);
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      const userJson = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);

      let user: User | null = null;
      if (userJson) {
        try {
          user = JSON.parse(userJson);
        } catch {
          // ignore
        }
      }

      set({
        licenseKey,
        licenseValid: !!licenseKey,
        token,
        user,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Initialization failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  activateLicense: async (key: string) => {
    set({ isLoading: true, error: null });
    try {
      const machineId = await getMachineId();
      const res = await authApi.validateLicense({ licenseKey: key, machineId });

      if (res.valid) {
        await SecureStore.setItemAsync(STORAGE_KEYS.LICENSE_KEY, key);
        set({ licenseKey: key, licenseValid: true });
        return true;
      } else {
        set({ error: res.message || 'License key is invalid or expired.' });
        return false;
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'License activation failed';
      set({ error: msg });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login({ email, password });

      if (res.success && res.token && res.user) {
        await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, res.token);
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(res.user));
        set({ token: res.token, user: res.user });
        return true;
      } else {
        set({ error: res.message || 'Invalid response from server' });
        return false;
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      set({ error: msg });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout().catch(() => {}); // silent catch if offline
    } catch {
      // ignore
    }
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      set({ token: null, user: null });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
