import api from './auth';
import { API_CONFIG } from '../config/api.config';

const buildUrl = (path) => `${API_CONFIG.API_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

export const productAPI = {
  getProducts: (params = {}) => api.get('/products', { params }),

  getProduct: (id) => api.get(`/products/${id}`),

  createProduct: (productData) => api.post('/products', productData),

  updateProduct: (id, productData) => api.put(`/products/${id}`, productData),

  deleteProduct: (id) => api.delete(`/products/${id}`),
  
  getLowStockProducts: () => api.get('/products/low-stock'),
  
  updateStock: (id, stockData) => api.put(`/products/${id}/stock`, stockData)
};