import { create } from 'zustand';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1/superadmin';

const useSuperAdminStore = create((set) => ({
  stats: null,
  tenants: [],
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true });
    try {
      const { data } = await axios.get(`${API_URL}/stats`, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('user'))?.token}` }
      });
      set({ stats: data, isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.message, isLoading: false });
    }
  },

  fetchTenants: async () => {
    set({ isLoading: true });
    try {
      const { data } = await axios.get(`${API_URL}/tenants`, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('user'))?.token}` }
      });
      set({ tenants: data, isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.message, isLoading: false });
    }
  },

  updateTenant: async (id, updateData) => {
    set({ isLoading: true });
    try {
      await axios.put(`${API_URL}/tenants/${id}`, updateData, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('user'))?.token}` }
      });
      // Refresh tenants list
      const { data } = await axios.get(`${API_URL}/tenants`, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('user'))?.token}` }
      });
      set({ tenants: data, isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.message, isLoading: false });
    }
  }
}));

export default useSuperAdminStore;
