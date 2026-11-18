import { create } from 'zustand';
import axios from 'axios';
import useAuthStore from './authStore';

const API_URL = 'http://localhost:5000/api/v1/finance';

const useFinanceStore = create((set) => ({
  summary: null,
  isLoading: false,
  error: null,

  fetchSummary: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      const config = { 
        headers: { Authorization: `Bearer ${user.token}` },
        params
      };
      const response = await axios.get(`${API_URL}/summary`, config);
      set({ summary: response.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  }
}));

export default useFinanceStore;
