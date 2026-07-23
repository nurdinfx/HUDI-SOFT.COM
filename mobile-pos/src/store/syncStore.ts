import { create } from 'zustand';
import { STORAGE_KEYS } from '@/constants';
import * as SecureStore from '@/utils/secureStore';

interface SyncState {
  lastSyncTime: string | null;
  isSyncing: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: string) => void;
  setError: (error: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  lastSyncTime: null,
  isSyncing: false,
  error: null,

  initialize: async () => {
    try {
      const lastSync = await SecureStore.getItemAsync(STORAGE_KEYS.LAST_SYNC);
      set({ lastSyncTime: lastSync || null });
    } catch {
      set({ lastSyncTime: null });
    }
  },

  setSyncing: (isSyncing: boolean) => set({ isSyncing }),

  setLastSyncTime: (time: string) => {
    void SecureStore.setItemAsync(STORAGE_KEYS.LAST_SYNC, time);
    set({ lastSyncTime: time, error: null });
  },

  setError: (error: string | null) => set({ error, isSyncing: false }),
}));
