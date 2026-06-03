import { create } from 'zustand';
import axios from 'axios';
import useAuthStore from './authStore';

const API_URL = 'http://localhost:5000/api/v1/branches';

const useBranchStore = create((set) => ({
  branches: [],
  isLoading: false,
  error: null,

  fetchBranches: async () => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const response = await axios.get(API_URL, config);
      set({ branches: response.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createBranch: async (branchData) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const response = await axios.post(API_URL, branchData, config);
      set((state) => ({ branches: [...state.branches, response.data], isLoading: false }));
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, isLoading: false });
    }
  }
}));

export default useBranchStore;
