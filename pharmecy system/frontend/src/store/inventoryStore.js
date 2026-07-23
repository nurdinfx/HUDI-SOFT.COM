import { create } from 'zustand';
import axios from 'axios';
import useAuthStore from './authStore';

const API_URL = 'http://localhost:5000/api/v1';

const useInventoryStore = create((set, get) => ({
  medicines: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    try {
      const { user } = useAuthStore.getState();
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const response = await axios.get(`${API_URL}/categories`, config);
      set({ categories: response.data });
    } catch (error) {
      console.error(error);
    }
  },

  fetchMedicines: async () => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const response = await axios.get(`${API_URL}/medicines`, config);
      set({ medicines: response.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createMedicine: async (medicineData) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const response = await axios.post(`${API_URL}/medicines`, medicineData, config);
      set((state) => ({ medicines: [...state.medicines, response.data], isLoading: false }));
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, isLoading: false });
    }
  }
}));

export default useInventoryStore;
