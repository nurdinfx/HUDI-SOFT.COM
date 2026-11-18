import { create } from 'zustand';
import { Product } from '@/db/repositories/productRepo';
import { Customer } from '@/db/repositories/customerRepo';

export interface CartItem {
  product: Product;
  qty: number;
  discount: number; // Item-level flat discount amount
}

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  paymentMethod: string;
  orderDiscount: number; // Order-level flat discount amount
  taxRate: number; // e.g. 0.15 for 15%

  // Getters
  getSubtotal: () => number;
  getTax: () => number;
  getTotalDiscount: () => number;
  getTotal: () => number;

  // Actions
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  setItemDiscount: (productId: string, discount: number) => void;
  setOrderDiscount: (discount: number) => void;
  setTaxRate: (rate: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setPaymentMethod: (method: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  paymentMethod: 'cash',
  orderDiscount: 0,
  taxRate: 0.15, // 15% standard rate

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + (item.product.price * item.qty - item.discount), 0);
  },

  getTax: () => {
    const subtotal = get().getSubtotal();
    const { taxRate } = get();
    return Math.max(0, subtotal * taxRate);
  },

  getTotalDiscount: () => {
    const { items, orderDiscount } = get();
    const itemDiscounts = items.reduce((sum, item) => sum + item.discount, 0);
    return itemDiscounts + orderDiscount;
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const tax = get().getTax();
    const { orderDiscount } = get();
    return Math.max(0, subtotal + tax - orderDiscount);
  },

  addToCart: (product: Product, qty = 1) => {
    set((state) => {
      const existingIndex = state.items.findIndex((item) => item.product.id === product.id);

      if (existingIndex > -1) {
        const updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          qty: updatedItems[existingIndex].qty + qty,
        };
        return { items: updatedItems };
      } else {
        return {
          items: [...state.items, { product, qty, discount: 0 }],
        };
      }
    });
  },

  removeFromCart: (productId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  updateQty: (productId: string, qty: number) => {
    if (qty <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, qty } : item
      ),
    }));
  },

  setItemDiscount: (productId: string, discount: number) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, discount: Math.max(0, discount) } : item
      ),
    }));
  },

  setOrderDiscount: (discount: number) => {
    set({ orderDiscount: Math.max(0, discount) });
  },

  setTaxRate: (rate: number) => {
    set({ taxRate: Math.max(0, rate) });
  },

  setCustomer: (customer: Customer | null) => {
    set({ customer });
  },

  setPaymentMethod: (paymentMethod: string) => {
    set({ paymentMethod });
  },

  clearCart: () => {
    set({
      items: [],
      customer: null,
      paymentMethod: 'cash',
      orderDiscount: 0,
    });
  },
}));
