import { Platform } from 'react-native';
import * as ExpoSecureStore from 'expo-secure-store';

const webStore = {
  async getItemAsync(key: string): Promise<string | null> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage.getItem(key);
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(key, value);
  },

  async deleteItemAsync(key: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.removeItem(key);
  },
};

const secureStore = Platform.OS === 'web' ? webStore : ExpoSecureStore;

export const getItemAsync = (key: string) => secureStore.getItemAsync(key);
export const setItemAsync = (key: string, value: string) => secureStore.setItemAsync(key, value);
export const deleteItemAsync = (key: string) => secureStore.deleteItemAsync(key);
