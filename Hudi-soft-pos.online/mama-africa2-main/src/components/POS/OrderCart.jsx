import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaSearch } from 'react-icons/fa';

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
    updatingOrderId = null
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
        <div className="flex flex-col h-full bg-[#f8f9fa] border-l border-gray-300 w-full max-w-2xl mx-auto shadow-xl font-sans">

            {/* --- Top Header with Totals --- */}
            {/* Matches the blue bar in the image */}
            {/* Matches the blue bar in the image */}
            <div className="bg-[#4a69bd] text-white p-1 px-2 flex items-center justify-between shadow-sm gap-2">
                <div className="flex items-center gap-3 text-sm flex-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <div className="flex items-center gap-1">
                        <span className="text-gray-200 text-xs">Vat:</span>
                        <span className="font-semibold text-sm">{(totals.taxAmount || totals.tax || totals.vatAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-gray-200 text-xs">Local:</span>
                        <span className="font-semibold text-sm">{totalLocal.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-gray-200 text-xs">Sub:</span>
                        <span className="font-semibold text-sm">{totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-gray-200 text-xs">Total:</span>
                        <span className="font-semibold text-sm">{totals.total.toFixed(2)}</span>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/orders')}
                    className="bg-[#1e3799] hover:bg-[#0c2461] text-white px-3 py-1 rounded shadow-sm text-xs font-semibold transition-colors border border-blue-800 flex-shrink-0"
                >
                    Orders
                </button>
            </div>

            {/* --- Barcode Search --- */}
            <div className="p-1 bg-[#f1f2f6] border-b border-gray-300">
                <div className="flex items-center bg-white border border-gray-300 rounded-sm px-2 py-0.5 shadow-sm h-7">
                    <FaSearch className="text-gray-400 mr-2 text-xs" />
                    <input
                        type="text"
                        placeholder="Barcode"
                        className="w-full bg-transparent outline-none text-xs p-1 text-gray-700 placeholder-gray-400"
                    />
                </div>
            </div>

            {/* --- Product Table Header --- */}
            {/* Image shows "Product Price Quantity Subtotal" headers directly above items, no tabs visible in the cramped view but let's keep it simple */}
            <div className="flex-1 overflow-y-auto bg-white flex flex-col">
                <div className="bg-[#f1f2f6] text-gray-600 font-semibold border-b border-gray-300 text-xs flex flex-shrink-0">
                    <div className="p-2 w-5/12 pl-3">Product</div>
                    <div className="p-2 w-2/12">Price</div>
                    <div className="p-2 w-2/12">Quantity</div>
                    <div className="p-2 w-2/12 text-right pr-3">Subtotal</div>
                    <div className="w-1/12"></div>
                </div>

                <div className="divide-y divide-gray-100 overflow-y-auto flex-1 h-0 scroll-smooth">
                    {cart.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 italic text-sm">
                            No items in cart
                        </div>
                    ) : (
                        cart.map((item, index) => {
                            const productId = item._id || item.product?._id || item.product?.id || item.id;
                            const productName = item.name || item.product?.name || 'Unknown Product';
                            const productCategory = item.category || item.product?.category || 'General';

                            return (
                                <div 
                                    key={productId} 
                                    className={`flex items-center text-[13px] md:text-sm hover:bg-blue-50 transition-colors min-h-[50px] ${index % 2 === 1 ? 'bg-gray-100/30' : 'bg-white'}`}
                                >
                                    <div className="p-3 w-5/12 font-bold text-gray-800 leading-tight">
                                        {productName}
                                        {/* <div className="text-[10px] text-gray-400 font-normal uppercase tracking-wider">{productCategory}</div> */}
                                    </div>
                                    <div className="p-3 w-2/12 text-gray-600 font-mono">${item.price.toFixed(2)}</div>
                                    <div className="p-3 w-2/12 flex items-center justify-center">
                                        <div className="flex items-center border border-gray-300 rounded overflow-hidden h-8">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-12 bg-white text-center text-sm font-bold outline-none border-none p-0"
                                                value={item.quantity}
                                                onChange={(e) => onUpdateQuantity(productId, parseInt(e.target.value) || 1)}
                                            />
                                        </div>
                                    </div>
                                    <div className="p-3 w-2/12 text-right font-black text-blue-600">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </div>
                                    <div className="p-3 w-1/12 text-center">
                                        <button
                                            onClick={() => onRemoveItem(productId)}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <FaTrash size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* --- Bottom Static Footer --- */}
            <div className="bg-white border-t border-gray-300 shadow-xl z-20 flex-shrink-0">
                <div className="bg-[#f1f2f6] p-2 space-y-1">
                    {/* Row 1: Booked Room & Select Table */}
                    <div className="grid grid-cols-2 gap-1">
                        <div className="bg-white border border-gray-400 rounded-md flex items-center px-1 h-8">
                            <select
                                className="w-full bg-transparent p-0 outline-none text-xs text-gray-600 font-medium"
                                value={bookedRoom}
                                onChange={(e) => setBookedRoom(e.target.value)}
                            >
                                <option value="">Booked Room</option>
                                <option value="101">Room 101</option>
                                <option value="102">Room 102</option>
                            </select>
                        </div>
                        <div className="bg-white border border-gray-400 rounded-md flex items-center px-1 pl-2 h-8">
                            <span className="text-gray-500 mr-1 whitespace-nowrap text-xs font-bold">TABLE :</span>
                            <select
                                className="w-full bg-transparent p-0 outline-none text-xs text-gray-600 font-black"
                                value={tableNumber || ""}
                                onChange={(e) => onTableNumberChange(e.target.value)}
                            >
                                <option value="">None</option>
                                {tables.map(table => (
                                    <option key={table._id} value={table._id}>{table.tableNo || table.name || `Table ${table._id}`}</option>
                                ))}
                            </select>
                        </div>
                    </div>
    
                    <div className="bg-white border border-gray-400 rounded-md flex items-center px-1 h-8">
                        <select
                            className="w-full bg-transparent p-0 outline-none text-xs text-gray-600 font-medium"
                            value={customer ? customer._id : ""}
                            onChange={(e) => onCustomerChange && onCustomerChange(customers.find(c => c._id === e.target.value))}
                        >
                            <option value="">Customer (Walking)</option>
                            {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="bg-white border border-gray-400 rounded-md h-8 flex items-center">
                        <input
                            type="text"
                            placeholder="Remarks / Note"
                            className="w-full bg-transparent px-2 outline-none text-xs text-gray-600"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-3 bg-white flex items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
                    <button
                        onClick={onClearCart}
                        className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2.5 rounded-md text-xs font-black uppercase tracking-tighter border border-red-200 transition-all flex-shrink-0"
                    >
                        Clear
                    </button>
    
                    <div className="flex items-center gap-2 flex-shrink-0 hidden md:flex">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">VAT</span>
                        <button
                            onClick={() => setVatEnabled(!vatEnabled)}
                            className={`w-10 h-5 rounded-full p-0.5 transition-all ${vatEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-all ${vatEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
    
                    <button
                        onClick={() => onPlaceOrder({ servedBy, remarks })}
                        className={`${updatingOrderId ? 'bg-[#009432] hover:bg-[#006266] text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} px-8 py-3.5 rounded-md text-sm font-black shadow-lg transition-all active:scale-95 flex-1 text-center uppercase tracking-wider`}
                    >
                        {updatingOrderId ? 'Update Order' : 'Create Order'}
                    </button>
                </div>
            </div>

        </div>
    );
};

export default OrderCart;
