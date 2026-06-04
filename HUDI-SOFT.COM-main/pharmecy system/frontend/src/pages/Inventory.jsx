import { useEffect, useState } from 'react';
import useInventoryStore from '../store/inventoryStore';
import { Plus, AlertTriangle } from 'lucide-react';

const Inventory = () => {
  const { medicines, categories, fetchMedicines, fetchCategories, createMedicine, isLoading } = useInventoryStore();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', barcode: '', category: '', buyingPrice: '', sellingPrice: '', expiryDate: '', lowStockThreshold: 10
  });

  useEffect(() => {
    fetchCategories();
    fetchMedicines();
  }, [fetchCategories, fetchMedicines]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createMedicine(formData);
    setShowModal(false);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Medicine
        </button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-4">Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Total Stock</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map(med => {
                const totalStock = med.stock.reduce((acc, curr) => acc + curr.quantity, 0);
                const isLowStock = totalStock <= med.lowStockThreshold;

                return (
                  <tr key={med._id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{med.name}</td>
                    <td className="p-4">{med.category?.name || 'N/A'}</td>
                    <td className="p-4">${med.sellingPrice}</td>
                    <td className="p-4">{totalStock}</td>
                    <td className="p-4">
                      {isLowStock ? (
                        <span className="flex items-center text-red-500">
                          <AlertTriangle className="w-4 h-4 mr-1" /> Low Stock
                        </span>
                      ) : (
                        <span className="text-green-500">In Stock</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white rounded max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-xl font-bold">Add New Medicine</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text" placeholder="Name" required
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="text" placeholder="Barcode"
                value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <select
                required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
              </select>
              <input
                type="number" placeholder="Buying Price" required
                value={formData.buyingPrice} onChange={e => setFormData({...formData, buyingPrice: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="number" placeholder="Selling Price" required
                value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="date" placeholder="Expiry Date" required
                value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              
              <div className="flex justify-end space-x-2 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 bg-gray-200 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
