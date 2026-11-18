import { useEffect, useState } from 'react';
import useBranchStore from '../store/branchStore';
import { Plus } from 'lucide-react';

const Branches = () => {
  const { branches, fetchBranches, createBranch, isLoading } = useBranchStore();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createBranch(formData);
    setShowModal(false);
    setFormData({ name: '', address: '', phone: '' });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Branch Management</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Branch
        </button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {branches.map(branch => (
            <div key={branch._id} className="p-6 bg-white rounded shadow border border-gray-100">
              <h2 className="text-xl font-semibold">{branch.name}</h2>
              <p className="mt-2 text-gray-600">{branch.address}</p>
              <p className="text-gray-600">{branch.phone}</p>
              <div className="mt-4 text-sm text-gray-500">
                Status: <span className={branch.isActive ? 'text-green-500' : 'text-red-500'}>
                  {branch.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white rounded">
            <h2 className="mb-4 text-xl font-bold">Add New Branch</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Branch Name"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Address"
                required
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Phone"
                required
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-white bg-blue-600 rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Branches;
