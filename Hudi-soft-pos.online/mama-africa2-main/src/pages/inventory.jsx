// src/pages/Inventory.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { realApi } from '../api/realApi';
import { API_CONFIG } from '../config/api.config';
import {
  Search,
  Plus,
  Filter,
  Edit,
  Trash2,
  PackagePlus,
  Upload,
  Loader,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';

import { useOptimisticData } from '../hooks/useOptimisticData';
import { toast } from 'react-hot-toast';

// Real-world product categories that cover most business types
const DEFAULT_CATEGORIES = [
  'Food & Beverages',
  'Electronics',
  'Clothing & Apparel',
  'Health & Beauty',
  'Home & Kitchen',
  'Office Supplies',
  'Sports & Outdoors',
  'Toys & Games',
  'Automotive',
  'Books & Stationery',
  'Grocery',
  'Furniture',
  'Cleaning Supplies',
  'Pet Supplies',
  'Hardware & Tools',
  'Jewelry & Accessories',
  'Baby & Kids',
  'Garden & Outdoor',
  'Pharmacy & Medical',
  'General Merchandise'
];

const Inventory = () => {
  // Products hook
  const {
    data: products,
    loading: productsLoading,
    isRefetching: productsRefetching,
    error: productsError,
    refresh: loadProducts
  } = useOptimisticData('inventory_products', async () => {
    const response = await realApi.getProducts();
    if (response.success) {
      const extracted = realApi.extractData(response);
      // Handle both array and object with products key
      if (Array.isArray(extracted)) return extracted;
      if (extracted && Array.isArray(extracted.products)) return extracted.products;
      if (extracted && typeof extracted === 'object') {
        // Try to find any array in the response
        const keys = Object.keys(extracted);
        for (const key of keys) {
          if (Array.isArray(extracted[key])) return extracted[key];
        }
      }
      return [];
    }
    throw new Error(response.message || 'Failed to load products');
  }, []);

  // Categories hook - merge backend categories with defaults
  const {
    data: categories,
    isRefetching: categoriesRefetching,
    refresh: loadCategories,
    setData: setCategories
  } = useOptimisticData('inventory_categories', async () => {
    try {
      const response = await realApi.getCategories();
      if (response.success) {
        const backendCats = realApi.extractData(response) || [];
        const catArray = Array.isArray(backendCats) ? backendCats : [];
        // Merge backend categories with defaults, remove duplicates
        const merged = [...new Set([...DEFAULT_CATEGORIES, ...catArray])];
        return merged.sort();
      }
    } catch (e) {
      console.warn('Failed to fetch categories from backend, using defaults:', e);
    }
    return [...DEFAULT_CATEGORIES].sort();
  }, [...DEFAULT_CATEGORIES].sort());

  const [filteredProducts, setFilteredProducts] = useState([]);
  const loading = productsLoading;
  const isRefreshing = productsRefetching || categoriesRefetching;

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    lowStock: false
  });
  const [error, setError] = useState('');

  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (productsError) {
      console.error('❌ Failed to load products:', productsError);
      setError(productsError.message);
    }
  }, [productsError]);

  useEffect(() => {
    filterProducts();
  }, [products, filters]);

  const filterProducts = () => {
    let filtered = Array.isArray(products) ? products : [];

    if (filters.category) {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.lowStock) {
      filtered = filtered.filter(product => product.stock <= (product.minStock || 10));
    }

    setFilteredProducts(filtered);
  };

  const handleSaveProduct = async (productData) => {
    try {
      let response;
      if (editingProduct) {
        response = await realApi.updateProduct(editingProduct._id, productData);
      } else {
        response = await realApi.createProduct(productData);
      }

      if (response.success) {
        // Close modal FIRST for instant feedback
        setShowModal(false);
        setEditingProduct(null);
        setShowNewCategory(false);
        setNewCategory('');
        toast.success(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
        // Then refresh data in background
        await Promise.all([loadProducts(), loadCategories()]);
      } else {
        throw new Error(response.message || 'Failed to save product');
      }
    } catch (error) {
      const errorMsg = error?.message || error?.toString() || 'Failed to save product';
      toast.error(errorMsg);
      // DON'T close modal on error so user can fix and retry
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await realApi.deleteProduct(productId);
        if (response.success) {
          await loadProducts();
          toast.success('Product deleted successfully!');
        } else {
          throw new Error(response.message || 'Failed to delete product');
        }
      } catch (error) {
        toast.error(error.message || 'Failed to delete product');
      }
    }
  };

  const updateStock = async (productId, newStock) => {
    try {
      const response = await realApi.updateStock(productId, { stock: newStock });
      if (response.success) {
        await loadProducts();
        toast.success('Stock updated!');
      } else {
        throw new Error(response.message || 'Failed to update stock');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update stock');
    }
  };

  const getStockStatus = (stock, minStock = 10) => {
    if (stock === 0) return { color: 'bg-red-100 text-red-800', text: 'Out' };
    if (stock <= minStock) return { color: 'bg-orange-100 text-orange-800', text: 'Low' };
    return { color: 'bg-green-100 text-green-800', text: 'OK' };
  };

  const addNewCategory = useCallback(() => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories(prev => [...prev, trimmed].sort());
      setNewCategory('');
      setShowNewCategory(false);
      return trimmed;
    }
    return trimmed || '';
  }, [newCategory, categories, setCategories]);

  // Get only categories that have products for filter dropdown
  const usedCategories = Array.isArray(products) 
    ? [...new Set(products.map(p => p.category).filter(Boolean))].sort()
    : [];

  return (
    <div className="page-content flex flex-col gap-4 h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{Array.isArray(products) ? products.length : 0} Products</span>
            {(loading || isRefreshing) && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full animate-pulse border border-blue-100">
                <Loader className="animate-spin w-3 h-3" />
                <span className="text-[10px] font-medium uppercase tracking-tight">{loading ? 'Loading...' : 'Refreshing...'}</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 flex-shrink-0">
        <div className="flex flex-1 items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="bg-transparent border-none outline-none w-full text-sm"
          />
        </div>

        <select
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All Categories</option>
          {usedCategories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.lowStock}
            onChange={(e) => setFilters(prev => ({ ...prev, lowStock: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 whitespace-nowrap">Low Stock</span>
        </label>

        {(filters.category || filters.search || filters.lowStock) && (
          <button
            onClick={() => setFilters({ category: '', search: '', lowStock: false })}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50/50 rounded-xl border border-gray-200 p-4 relative">
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 h-1 z-10">
            <div className="h-full bg-blue-500 animate-[loading_1.5s_infinite] origin-left"></div>
          </div>
        )}
        {loading && (!Array.isArray(products) || products.length === 0) ? (
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {filteredProducts.map(product => {
              const stockStatus = getStockStatus(product.stock, product.minStock);
              const backendUrl = API_CONFIG.BACKEND_URL;
              let imageUrl = product.image || '';

              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `${backendUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
              } else if (!imageUrl) {
                imageUrl = 'https://via.placeholder.com/200x200?text=No+Image';
              }

              return (
                <div key={product._id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col overflow-hidden group h-[280px]">
                  <div className="h-32 bg-gray-100 relative overflow-hidden flex-shrink-0">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpolyline points="21 15 16 10 5 21"/%3E%3C/svg%3E';
                        e.target.style.padding = '2rem';
                      }}
                    />
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${stockStatus.color}`}>
                      {stockStatus.text}
                    </div>
                  </div>

                  <div className="p-3 flex flex-col flex-1">
                    <div className="mb-auto">
                      <div className="flex justify-between items-start gap-1">
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1" title={product.name}>{product.name}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 mb-2 line-clamp-1">{product.category}</p>

                      <div className="flex justify-between items-end mt-1">
                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase tracking-wider">Stock</span>
                          <span className="font-medium text-gray-700 text-sm">{product.stock ?? 0}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block uppercase tracking-wider">Price</span>
                          <span className="font-bold text-blue-600 text-sm">${typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-3 mt-2 border-t border-gray-50">
                      <button
                        onClick={() => updateStock(product._id, (product.stock || 0) + 1)}
                        className="flex items-center justify-center p-1.5 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        title="Add Stock"
                      >
                        <PackagePlus size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setShowModal(true);
                        }}
                        className="flex items-center justify-center p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                        title="Edit Product"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="flex items-center justify-center p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <PackagePlus size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-gray-500">No products found</p>
            <p className="text-sm">Try adjusting your filters or add new products</p>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          showNewCategory={showNewCategory}
          setShowNewCategory={setShowNewCategory}
          addNewCategory={addNewCategory}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
            setShowNewCategory(false);
            setNewCategory('');
          }}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
};

// Simplified Product Modal with auto-close and saving state
const ProductModal = ({
  product, categories, newCategory, setNewCategory,
  showNewCategory, setShowNewCategory, addNewCategory,
  onClose, onSave
}) => {
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', price: 0, cost: 0,
    stock: 0, minStock: 10, isAvailable: true, image: ''
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        price: product.price || 0,
        cost: product.cost || 0,
        stock: product.stock || 0,
        minStock: product.minStock || 10,
        isAvailable: product.isAvailable !== false,
        image: product.image || ''
      });
      setPreviewImage(product.image ? (product.image.startsWith('http') ? product.image : `${API_CONFIG.BACKEND_URL}${product.image.startsWith('/') ? '' : '/'}${product.image}`) : '');
    }
  }, [product]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Immediate preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const licenseData = localStorage.getItem('pos_license_data');
      const headers = {};

      if (token) {
        headers['Authorization'] = token.startsWith('demo-') ? token : `Bearer ${token}`;
      }

      if (licenseData) {
        try {
          const parsed = JSON.parse(licenseData);
          if (parsed.key) {
            headers['X-License-Key'] = parsed.key;
          }
        } catch (e) {}
      }

      const response = await fetch(`${API_CONFIG.API_URL}/upload`, {
        method: 'POST',
        headers: headers,
        body: uploadFormData,
      });

      const result = await response.json();
      if (result.success) {
        setFormData(prev => ({ ...prev, image: result.data.url || result.data.path }));
        if (result.data?.provider === 'local') {
          toast.success('Image uploaded locally! Note: configure Cloudinary on Render dashboard to persist images after restarts.', { duration: 6000 });
        } else {
          toast.success('Image uploaded persistently to Cloudinary!');
        }
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (saving) return;

    // Auto-link new category if we are in "new" mode and have text
    let finalCategory = formData.category;
    if (showNewCategory && newCategory.trim()) {
      finalCategory = newCategory.trim();
      addNewCategory();
    }

    // Validations
    if (!formData.name || !formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!finalCategory || !finalCategory.trim()) {
      toast.error('Please select or enter a category');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price (must be 0 or greater)');
      return;
    }

    const cost = parseFloat(formData.cost);
    const stock = parseInt(formData.stock);
    const minStock = parseInt(formData.minStock);

    setSaving(true);
    try {
      await onSave({
        ...formData,
        name: formData.name.trim(),
        category: finalCategory.trim(),
        price: price,
        cost: isNaN(cost) ? 0 : cost,
        stock: isNaN(stock) ? 0 : stock,
        minStock: isNaN(minStock) ? 10 : minStock
      });
      // Modal will be closed by parent's onSave handler on success
    } catch (err) {
      // Error already handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewCategory = (e) => {
    e?.preventDefault();
    if (newCategory.trim()) {
      const cat = addNewCategory();
      if (cat) {
        setFormData(prev => ({ ...prev, category: cat }));
      }
    }
  };

  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button type="button" onClick={onClose} disabled={saving} className="p-1 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col justify-between">
          <div className="p-6 space-y-5 flex-1">
            {/* Image Upload Area */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors">
                {previewImage ? (
                  <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2">
                    <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <span className="text-[10px] text-gray-400">Upload</span>
                  </div>
                )}
                <input type="file" onChange={handleImageUpload} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" disabled={saving} />
                {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader className="w-5 h-5 text-white animate-spin" /></div>}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 block">Product Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="e.g., Wireless Mouse" disabled={saving} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 block">Category *</label>
                  {!showNewCategory ? (
                    <select required value={formData.category} onChange={(e) => {
                      if (e.target.value === '__new__') setShowNewCategory(true);
                      else setFormData({ ...formData, category: e.target.value });
                    }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white transition-all" disabled={saving}>
                      <option value="">Select Category...</option>
                      {safeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__new__" className="text-blue-600 font-bold bg-blue-50">+ Add New Category</option>
                    </select>
                  ) : (
                    <div className="flex gap-1 group">
                      <input autoFocus type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewCategory(); }}} className="flex-1 border border-blue-300 rounded-l-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none shadow-inner" placeholder="Category name..." disabled={saving} />
                      <button type="button" onClick={handleAddNewCategory} disabled={saving} className="px-3 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-50">
                        <Check size={14} />
                      </button>
                      <button type="button" onClick={() => { setShowNewCategory(false); setNewCategory(''); }} disabled={saving} className="px-2 bg-gray-100 text-gray-400 border border-l-0 border-gray-200 rounded-r-lg hover:text-red-500 transition-colors disabled:opacity-50" title="Cancel">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 block">Status</label>
                  <select value={formData.isAvailable} onChange={e => setFormData({ ...formData, isAvailable: e.target.value === 'true' })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" disabled={saving}>
                    <option value="true">Available</option>
                    <option value="false">Unavailable</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 block">Price *</label>
                  <input required type="number" min="0" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0.00" disabled={saving} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 block">Cost</label>
                  <input type="number" min="0" step="0.01" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0.00" disabled={saving} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 block">Stock</label>
                  <input required type="number" min="0" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" disabled={saving} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 block">Description</label>
                <textarea rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="Optional product details..." disabled={saving} />
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving || uploading} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {saving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{product ? 'Update Product' : 'Add Product'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
