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
        <div className="flex flex-col h-full bg-white relative overflow-hidden font-sans">

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

                <div className="cart-items-list">
                    {cart.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 italic text-sm">
                            No items in cart
                        </div>
                    ) : (
                        cart.map((item, index) => {
                            const productId = item._id || item.product?._id || item.product?.id || item.id;
                            const productName = item.name || item.product?.name || 'Unknown Product';

                            return (
                                <div key={productId} className="cart-item">
                                    <div className="w-5/12 font-bold text-[#0f172a] text-sm leading-tight">
                                        {productName}
                                    </div>
                                    <div className="w-2/12 text-gray-500 font-mono text-xs">${item.price.toFixed(2)}</div>
                                    <div className="w-2/12 flex justify-center">
                                        <div className="flex items-center border border-gray-200 rounded h-8 overflow-hidden bg-white">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-10 text-center text-xs font-bold outline-none border-none"
                                                value={item.quantity}
                                                onChange={(e) => onUpdateQuantity(productId, parseInt(e.target.value) || 1)}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-2/12 text-right font-black text-blue-600 text-sm">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </div>
                                    <div className="w-1/12 text-center">
                                        <button onClick={() => onRemoveItem(productId)} className="text-gray-300 hover:text-red-500 transition-colors">
                                            <FaTrash size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* --- Bottom Responsive Footer --- */}
            <div className="cart-footer-sticky">
                <div className="space-y-1">
                    {/* Row 1: Booked Room & Select Table */}
                    <div className="grid grid-cols-2 gap-1">
                        <select
                            className="bg-gray-50 border border-gray-300 rounded-md p-2 text-xs font-bold outline-none"
                            value={bookedRoom}
                            onChange={(e) => setBookedRoom(e.target.value)}
                        >
                            <option value="">Booked Room</option>
                            <option value="101">Room 101</option>
                            <option value="102">Room 102</option>
                        </select>
                        <select
                            className="bg-gray-50 border border-gray-300 rounded-md p-2 text-xs font-black outline-none"
                            value={tableNumber || ""}
                            onChange={(e) => onTableNumberChange(e.target.value)}
                        >
                            <option value="">Table: None</option>
                            {tables.map(table => (
                                <option key={table._id} value={table._id}>{table.tableNo || table.name || `Table ${table._id}`}</option>
                            ))}
                        </select>
                    </div>
    
                    <select
                        className="w-full bg-gray-50 border border-gray-300 rounded-md p-2 text-xs font-bold outline-none"
                        value={customer ? customer._id : ""}
                        onChange={(e) => onCustomerChange && onCustomerChange(customers.find(c => c._id === e.target.value))}
                    >
                        <option value="">Customer (Walking)</option>
                        {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>

                    <input
                        type="text"
                        placeholder="Remarks / Note..."
                        className="w-full bg-gray-50 border border-gray-300 rounded-md p-2 text-xs outline-none"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onClearCart}
                        className="pos-action-btn pos-btn-danger w-32"
                    >
                        Clear
                    </button>
    
                    <button
                        onClick={() => onPlaceOrder({ servedBy, remarks })}
                        className={`pos-action-btn ${updatingOrderId ? 'pos-btn-update' : 'pos-btn-primary'} flex-1`}
                    >
                        {updatingOrderId ? 'Update Order' : 'Create Order'}
                    </button>
                </div>
            </div>

        </div>
    );
};

export default OrderCart;
