import { useEffect, useState } from 'react';
import usePosStore from '../store/posStore';
import useInventoryStore from '../store/inventoryStore';
import { Search, ShoppingCart, Trash2 } from 'lucide-react';

const POS = () => {
  const { cart, addToCart, removeFromCart, updateQuantity, discount, setDiscount, checkout, isLoading } = usePosStore();
  const { medicines, fetchMedicines } = useInventoryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const filteredMedicines = medicines.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (med.barcode && med.barcode.includes(searchTerm))
  );

  const subTotal = cart.reduce((acc, item) => acc + item.total, 0);
  const grandTotal = subTotal - discount;

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty');
    try {
      const receipt = await checkout(paymentMethod, {});
      alert(`Checkout successful! Receipt: ${receipt.receiptNumber}`);
    } catch (error) {
      alert('Checkout failed: ' + error.message);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-100">
      {/* Products Section */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center mb-6 space-x-4">
          <div className="relative flex-1">
            <Search className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search by name or barcode..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-3 pl-10 pr-4 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filteredMedicines.map(med => (
            <div 
              key={med._id} 
              onClick={() => addToCart(med)}
              className="p-4 transition-shadow bg-white border border-gray-100 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300"
            >
              <div className="flex flex-col h-full justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 line-clamp-2">{med.name}</h3>
                  <p className="text-sm text-gray-500">{med.category?.name}</p>
                </div>
                <div className="mt-4 font-bold text-blue-600">${med.sellingPrice}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="flex flex-col w-1/3 bg-white border-l border-gray-200 shadow-xl">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="flex items-center text-xl font-bold text-gray-800">
            <ShoppingCart className="w-6 h-6 mr-2 text-blue-600" /> Current Sale
          </h2>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Cart is empty
            </div>
          ) : (
            <ul className="space-y-3">
              {cart.map(item => (
                <li key={item.medicine} className="flex items-center justify-between p-3 border border-gray-100 rounded bg-gray-50">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{item.name}</h4>
                    <div className="text-sm text-gray-500">${item.price}</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="number" 
                      min="1" 
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.medicine, e.target.value)}
                      className="w-16 p-1 text-center border rounded focus:ring focus:ring-blue-200"
                    />
                    <div className="font-semibold w-14 text-right">${item.total.toFixed(2)}</div>
                    <button onClick={() => removeFromCart(item.medicine)} className="p-1 text-red-500 rounded hover:bg-red-50">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Checkout Summary */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <input 
                type="number" 
                value={discount} 
                onChange={(e) => setDiscount(e.target.value)}
                className="w-20 p-1 text-right border rounded"
              />
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl font-bold text-gray-800">Total</span>
              <span className="text-2xl font-bold text-blue-600">${grandTotal.toFixed(2)}</span>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-sm text-gray-600">Payment Method</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 border rounded focus:ring-blue-500"
              >
                <option value="Cash">Cash</option>
                <option value="Zaad">Zaad</option>
                <option value="E-Dahab">E-Dahab</option>
                <option value="Sahal">Sahal</option>
                <option value="Bank">Bank</option>
              </select>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={isLoading || cart.length === 0}
              className="w-full py-4 text-lg font-bold text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isLoading ? 'Processing...' : 'Pay & Checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
