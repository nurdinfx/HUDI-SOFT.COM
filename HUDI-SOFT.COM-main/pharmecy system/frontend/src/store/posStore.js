import { create } from 'zustand';
import axios from 'axios';
import useAuthStore from './authStore';

const API_URL = 'http://localhost:5000/api/v1/sales';

const usePosStore = create((set, get) => ({
  cart: [],
  discount: 0,
  vatPercentage: 0, // Configurable from settings, but let's assume 0 by default
  isLoading: false,
  error: null,

  addToCart: (medicine) => set((state) => {
    const existingItem = state.cart.find(item => item.medicine === medicine._id);
    if (existingItem) {
      return {
        cart: state.cart.map(item =>
          item.medicine === medicine._id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        )
      };
    }
    return {
      cart: [...state.cart, {
        medicine: medicine._id,
        name: medicine.name,
        price: medicine.sellingPrice,
        quantity: 1,
        total: medicine.sellingPrice
      }]
    };
  }),

  removeFromCart: (medicineId) => set((state) => ({
    cart: state.cart.filter(item => item.medicine !== medicineId)
  })),

  updateQuantity: (medicineId, quantity) => set((state) => ({
    cart: state.cart.map(item => 
      item.medicine === medicineId 
        ? { ...item, quantity: Number(quantity), total: Number(quantity) * item.price }
        : item
    )
  })),

  clearCart: () => set({ cart: [], discount: 0 }),

  setDiscount: (amount) => set({ discount: Number(amount) }),
  setVatPercentage: (percentage) => set({ vatPercentage: Number(percentage) }),

  checkout: async (paymentMethod, customerInfo) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      const { cart, discount, vatPercentage } = get();
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      const payload = {
        branch: user.branch, // Using cashier's branch
        items: cart.map(item => ({ medicine: item.medicine, quantity: item.quantity })),
        paymentMethod,
        discount,
        vatPercentage,
        customerName: customerInfo?.name || '',
        customerPhone: customerInfo?.phone || ''
      };

      const response = await axios.post(API_URL, payload, config);
      get().clearCart();
      set({ isLoading: false });
      return response.data; // Return receipt/sale data
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, isLoading: false });
      throw error;
    }
  }
}));

export default usePosStore;
