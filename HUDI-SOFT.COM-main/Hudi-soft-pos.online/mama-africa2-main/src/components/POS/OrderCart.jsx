import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, Search, X } from 'lucide-react';

const OrderCart = ({
    cart,
    onUpdateQuantity,
    onRemoveItem,
    totals, // { subtotal, tax, total }
    orderType, // 'dine-in', 'takeaway'
    onOrderTypeChange,
    tableNumber,
    onTableNumberChange,
    customer,
    onPlaceOrder,
    onClearCart,
    vatEnabled,
    setVatEnabled,
    users = [],
    customers = [],
    tables = [],
    onCustomerChange,
    paymentMethod = 'cash',
    onPaymentMethodChange,
    updatingOrderId = null,
    settings = null,
    onCloseMobileCart
}) => {
    const navigate = useNavigate();
    // Local state for form fields
    const [bookedRoom, setBookedRoom] = useState('');
    const [remarks, setRemarks] = useState('');
    const [servedBy, setServedBy] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    // Calculate specific totals
    const localCurrencyRate = 12000;
    const totalLocal = totals.total * localCurrencyRate;

    // Set default served by if users load
    useEffect(() => {
        if (users.length > 0 && !servedBy) {
            setServedBy(users[0]._id);
        }
    }, [users, servedBy]);

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] border-l border-gray-300 shadow-sm overflow-hidden">
            {/* Cart Tabs */}
            <div className="flex shrink-0 bg-[#e9ecef] border-b border-gray-300 items-center">
                <button className="flex-1 py-2 text-sm font-bold text-[#1e4c82] border-b-2 border-[#1e4c82] bg-white">
                    Cart Products
                </button>
                <button className="flex-1 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100">
                    Stock
                </button>
                {onCloseMobileCart && (
                    <button 
                        onClick={onCloseMobileCart}
                        className="md:hidden px-4 h-full text-gray-500 hover:text-red-500 hover:bg-gray-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Cart Table Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex bg-[#f1f3f5] border-b border-gray-300 text-[11px] font-bold text-gray-600 px-3 py-1.5 uppercase">
                    <div className="w-5/12">Product</div>
                    <div className="w-2/12 text-center">Price</div>
                    <div className="w-2/12 text-center">QTY</div>
                    <div className="w-3/12 text-right">Subtotal</div>
                </div>

                <div className="flex-1 overflow-y-auto bg-white no-scrollbar">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                            <ShoppingCart size={40} className="mb-2" />
                            <span className="text-xs">Cart is empty</span>
                        </div>
                    ) : (
                        cart.map((item) => {
                            const productId = item._id || item.product?._id || item.product?.id || item.id;
                            return (
                                <div key={productId} className="flex px-3 py-1 border-b border-gray-100 items-center hover:bg-blue-50/50 group transition-colors">
                                    <div className="w-5/12 flex flex-col">
                                        <span className="text-[11px] font-bold text-gray-800 truncate">{item.name}</span>
                                        <button onClick={() => onRemoveItem(productId)} className="text-[9px] text-red-400 hover:text-red-600 transition-colors w-fit cursor-pointer">Remove</button>
                                    </div>
                                    <div className="w-2/12 text-center text-xs text-gray-600 font-medium">{item.price.toFixed(2)}</div>
                                    <div className="w-2/12 flex justify-center">
                                        <div className="flex items-center border border-gray-300 rounded overflow-hidden h-6 bg-white shadow-sm">
                                            <button onClick={() => onUpdateQuantity(productId, item.quantity - 1)} className="px-1 hover:bg-gray-100 text-gray-500">-</button>
                                            <input 
                                                type="text" 
                                                value={item.quantity} 
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (!isNaN(val)) onUpdateQuantity(productId, val);
                                                }}
                                                className="w-8 text-center text-xs font-bold outline-none border-x border-gray-200"
                                            />
                                            <button onClick={() => onUpdateQuantity(productId, item.quantity + 1)} className="px-1 hover:bg-gray-100 text-gray-500">+</button>
                                        </div>
                                    </div>
                                    <div className="w-3/12 text-right text-xs font-bold text-blue-900">
                                        {(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Form Fields Area */}
            <div className="bg-[#f1f3f5] p-2 border-t border-gray-300 space-y-1.5 shrink-0">
                <div className="grid grid-cols-2 gap-2">
                    <select className="w-full h-8 border border-gray-300 rounded px-2 text-xs bg-white outline-none focus:border-blue-500" value={bookedRoom} onChange={(e) => setBookedRoom(e.target.value)}>
                        <option value="">Booked Room</option>
                        <option value="room1">Room 101</option>
                        <option value="room2">Room 102</option>
                    </select>
                    
                    <select className="w-full h-8 border border-gray-300 rounded px-2 text-xs bg-white outline-none focus:border-blue-500" value={tableNumber || ""} onChange={(e) => onTableNumberChange(e.target.value)}>
                        <option value="">Select Table: None</option>
                        {tables.map(table => <option key={table._id} value={table._id}>Table {table.name}</option>)}
                    </select>

                    <input 
                        type="date" 
                        className="w-full h-8 border border-gray-300 rounded px-2 text-xs bg-white outline-none focus:border-blue-500 pr-2" 
                        value={paymentDate} 
                        onChange={(e) => setPaymentDate(e.target.value)} 
                    />

                    <select className="w-full h-8 border border-gray-300 rounded px-2 text-xs bg-white outline-none focus:border-blue-500" value={servedBy} onChange={(e) => setServedBy(e.target.value)}>
                        <option value="">Served By</option>
                        {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                    </select>
                </div>

                <select 
                    className="w-full h-8 border border-gray-300 rounded px-2 text-xs bg-white outline-none focus:border-blue-500" 
                    value={customer ? customer._id : ""} 
                    onChange={(e) => onCustomerChange(customers.find(c => c._id === e.target.value))}
                >
                    <option value="">Customer</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>

                <textarea 
                    className="w-full h-10 border border-gray-300 rounded p-1.5 text-xs bg-white outline-none focus:border-blue-500 resize-none" 
                    placeholder="Remarks" 
                    value={remarks} 
                    onChange={(e) => setRemarks(e.target.value)}
                />
            </div>

            <div className="bg-white p-3 border-t border-gray-300 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                        <button onClick={onClearCart} className="bg-[#e55353] hover:bg-red-600 text-white px-6 py-1.5 rounded text-xs font-bold transition-all shadow-sm">
                            Clear
                        </button>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-gray-500">Vat {settings?.taxRate || 5}%</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={vatEnabled} 
                                    onChange={(e) => setVatEnabled(e.target.checked)} 
                                    className="sr-only peer" 
                                />
                                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2c3e50]"></div>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-xs font-bold border border-gray-300 transition-all">
                            Discount
                        </button>
                        <button 
                            onClick={() => onPlaceOrder({ servedBy, remarks, paymentDate, bookedRoom })}
                            disabled={cart.length === 0}
                            className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-1.5 rounded text-xs font-bold border border-gray-300 shadow-sm transition-all disabled:opacity-50"
                        >
                            Create Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};



export default OrderCart;
