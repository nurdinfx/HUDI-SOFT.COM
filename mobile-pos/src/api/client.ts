import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '@/constants';
import * as SecureStore from '@/utils/secureStore';

// ─── Axios instance ───────────────────────────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    const licenseKey = await SecureStore.getItemAsync(STORAGE_KEYS.LICENSE_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (licenseKey) config.headers['X-License-Key'] = licenseKey;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle errors ─────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear stored token and let the app redirect to login
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
