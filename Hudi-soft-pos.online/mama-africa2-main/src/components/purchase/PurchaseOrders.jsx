import React, { useState, useEffect } from 'react';
import { getPurchaseApi } from '../../services/api';
import { formatDate } from '../../utils/date';

const emptyForm = () => ({
  supplierId: '',
  items: [{ productId: '', productName: '', qty: 1, unitCost: 0 }],
  paymentMethod: 'cash',
  notes: '',
  expectedDelivery: ''
});

const PurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [deleteOrder, setDeleteOrder] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({ status: '', search: '' });

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const api = getPurchaseApi();
      const [ordersRes, suppliersRes, productsRes] = await Promise.allSettled([
        api.getPurchaseOrders({}),
        api.getSuppliers({}),
        api.getProducts({})
      ]);

      if (ordersRes.status === 'fulfilled') {
        const data = ordersRes.value?.data?.purchaseOrders
          || ordersRes.value?.data?.data?.purchaseOrders
          || ordersRes.value?.data || [];
        setOrders(Array.isArray(data) ? data : []);
      }

      if (suppliersRes.status === 'fulfilled') {
        const data = suppliersRes.value?.data?.suppliers || suppliersRes.value?.data || [];
        setSuppliers(Array.isArray(data) ? data : []);
      }

      if (productsRes.status === 'fulfilled') {
        const data = productsRes.value?.data?.products || productsRes.value?.data?.data || productsRes.value?.data || [];
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ---------- form helpers ----------
  const addItem = () => setFormData(p => ({
    ...p, items: [...p.items, { productId: '', productName: '', qty: 1, unitCost: 0 }]
  }));

  const removeItem = (i) => {
    if (formData.items.length <= 1) return;
    setFormData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  };

  const updateItem = (i, field, val) => {
    setFormData(p => {
      const items = [...p.items];
      items[i] = { ...items[i], [field]: val };
      if (field === 'productId') {
        const prod = products.find(p => p._id === val || p.id === val);
        if (prod) {
          items[i].productName = prod.name;
          items[i].unitCost = prod.cost || prod.costPrice || 0;
        }
      }
      return { ...p, items };
    });
  };

  const grandTotal = () =>
    formData.items.reduce((s, it) => s + (Number(it.qty) * Number(it.unitCost)), 0);

  const formValid = () =>
    formData.supplierId &&
    formData.items.every(it => it.qty > 0 && it.unitCost >= 0 && (it.productId || it.productName));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formValid()) { showToast('Please fill all required fields', 'error'); return; }
    setSaving(true);
    try {
      const api = getPurchaseApi();
      const payload = {
        supplierId: formData.supplierId,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        expectedDelivery: formData.expectedDelivery,
        items: formData.items.map(it => ({
          productId: it.productId,
          productName: it.productName,
          qty: Number(it.qty),
          unitCost: Number(it.unitCost),
          total: Number(it.qty) * Number(it.unitCost)
        })),
        grandTotal: grandTotal()
      };
      await api.createPurchaseOrder(payload);
      showToast('Purchase order created successfully');
      setShowForm(false);
      setFormData(emptyForm());
      await loadData();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to create purchase order', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await getPurchaseApi().approvePurchaseOrder(id);
      showToast('Purchase order approved');
      await loadData();
    } catch (err) {
      showToast('Failed to approve order', 'error');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this purchase order?')) return;
    try {
      await getPurchaseApi().rejectPurchaseOrder(id);
      showToast('Purchase order rejected');
      await loadData();
    } catch (err) {
      showToast('Failed to reject order', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteOrder) return;
    setSaving(true);
    try {
      await getPurchaseApi().deletePurchaseOrder(deleteOrder._id || deleteOrder.id);
      showToast('Purchase order deleted');
      setDeleteOrder(null);
      await loadData();
    } catch (err) {
      showToast('Failed to delete purchase order', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchStatus = !filters.status || (o.status || '').toLowerCase() === filters.status;
    const matchSearch = !filters.search || [o.supplier?.name, o.notes, o._id]
      .some(v => v?.toLowerCase().includes(filters.search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
          <p className="text-gray-600 text-sm">{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setFormData(emptyForm()); setShowForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
          >
            + New Order
          </button>
          <button onClick={loadData} disabled={loading} className="border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">🔄</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', val: orders.length, color: 'blue' },
          { label: 'Pending', val: orders.filter(o => (o.status||'') === 'pending').length, color: 'yellow' },
          { label: 'Approved', val: orders.filter(o => (o.status||'') === 'approved').length, color: 'green' },
          { label: 'Rejected', val: orders.filter(o => (o.status||'') === 'rejected').length, color: 'red' },
        ].map(s => (
          <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-200 rounded-xl p-4`}>
            <p className={`text-xs text-${s.color}-600 font-medium uppercase tracking-wide`}>{s.label}</p>
            <p className={`text-3xl font-bold text-${s.color}-700 mt-1`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              placeholder="Search by supplier, notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', search: '' })}
              className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-4 rounded-lg text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading orders...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Items</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-14 text-center text-gray-500">
                      <div className="text-4xl mb-3">📋</div>
                      <p className="font-medium">No purchase orders found</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order._id || order.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        {order.supplier?.name || order.supplierId || 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-green-700">
                        {fmt(order.grandTotal || order.totalAmount)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {(order.status || 'PENDING').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setViewOrder(order)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-medium"
                          >
                            👁 View
                          </button>
                          {(order.status || 'pending') === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(order._id || order.id)}
                                className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs font-medium"
                              >
                                ✅ Approve
                              </button>
                              <button
                                onClick={() => handleReject(order._id || order.id)}
                                className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded text-xs font-medium"
                              >
                                ❌ Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setDeleteOrder(order)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-medium"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========== CREATE ORDER MODAL ========== */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">➕ New Purchase Order</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Supplier & Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier <span className="text-red-500">*</span></label>
                  <select
                    value={formData.supplierId}
                    onChange={e => setFormData(p => ({ ...p, supplierId: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map(s => (
                      <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={e => setFormData(p => ({ ...p, paymentMethod: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
                <input
                  type="date"
                  value={formData.expectedDelivery}
                  onChange={e => setFormData(p => ({ ...p, expectedDelivery: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Order Items</label>
                  <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Add Item</button>
                </div>
                <div className="space-y-3">
                  {formData.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-5">
                        {products.length > 0 ? (
                          <select
                            value={item.productId}
                            onChange={e => updateItem(i, 'productId', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                          >
                            <option value="">Select product</option>
                            {products.map(p => (
                              <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={item.productName}
                            onChange={e => updateItem(i, 'productName', e.target.value)}
                            placeholder="Product name"
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                          />
                        )}
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => updateItem(i, 'qty', Math.max(1, Number(e.target.value)))}
                          placeholder="Qty"
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={e => updateItem(i, 'unitCost', Number(e.target.value))}
                          placeholder="Unit cost"
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="col-span-1 text-right text-sm font-semibold text-green-700 pt-2">
                        ${(Number(item.qty) * Number(item.unitCost)).toFixed(2)}
                      </div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          disabled={formData.items.length <= 1}
                          className="text-red-400 hover:text-red-600 disabled:opacity-30 pt-1.5"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-right text-lg font-bold text-gray-800">
                  Grand Total: <span className="text-green-700">{fmt(grandTotal())}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  rows="2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Additional notes or instructions..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">
                  {saving ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== VIEW ORDER MODAL ========== */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">📋 Order Details</h2>
              <button onClick={() => setViewOrder(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-semibold text-gray-600">Supplier:</span><br />{viewOrder.supplier?.name || 'N/A'}</div>
                <div><span className="font-semibold text-gray-600">Status:</span><br />
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(viewOrder.status)}`}>
                    {(viewOrder.status || 'pending').toUpperCase()}
                  </span>
                </div>
                <div><span className="font-semibold text-gray-600">Payment Method:</span><br />{viewOrder.paymentMethod || 'Cash'}</div>
                <div><span className="font-semibold text-gray-600">Date:</span><br />{formatDate(viewOrder.createdAt)}</div>
                {viewOrder.expectedDelivery && (
                  <div><span className="font-semibold text-gray-600">Expected Delivery:</span><br />{formatDate(viewOrder.expectedDelivery)}</div>
                )}
                {viewOrder.notes && (
                  <div className="col-span-2"><span className="font-semibold text-gray-600">Notes:</span><br />{viewOrder.notes}</div>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Items</h3>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Product</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Unit Cost</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(viewOrder.items || []).map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2">{item.product?.name || item.productName || 'N/A'}</td>
                          <td className="px-4 py-2 text-right">{item.qty || item.quantity || 0}</td>
                          <td className="px-4 py-2 text-right">{fmt(item.unitCost)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-700">
                            {fmt((item.qty || item.quantity || 0) * (item.unitCost || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="3" className="px-4 py-2 text-right font-bold text-gray-700">Grand Total</td>
                        <td className="px-4 py-2 text-right font-bold text-green-700 text-base">
                          {fmt(viewOrder.grandTotal || viewOrder.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                {(viewOrder.status || 'pending') === 'pending' && (
                  <>
                    <button
                      onClick={() => { handleApprove(viewOrder._id || viewOrder.id); setViewOrder(null); }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                    >✅ Approve</button>
                    <button
                      onClick={() => { handleReject(viewOrder._id || viewOrder.id); setViewOrder(null); }}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium"
                    >❌ Reject</button>
                  </>
                )}
                <button onClick={() => setViewOrder(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== DELETE CONFIRM ========== */}
      {deleteOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="text-5xl mb-3">🗑️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Order?</h3>
            <p className="text-gray-600 text-sm mb-6">
              Delete purchase order from <strong>{deleteOrder.supplier?.name || 'this supplier'}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteOrder(null)} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium">
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
