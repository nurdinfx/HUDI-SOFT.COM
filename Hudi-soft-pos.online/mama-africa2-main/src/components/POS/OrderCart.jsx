import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, Search, X, AlertCircle, User, CreditCard } from 'lucide-react';
import { realApi } from '../../api/realApi';

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
    onCloseMobileCart,
    activeContext = 'restaurant'
}) => {
    const navigate = useNavigate();
    // Local state for form fields
    const [bookedRoom, setBookedRoom] = useState('');
    const [remarks, setRemarks] = useState('');
    const [servedBy, setServedBy] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [hotelGuests, setHotelGuests] = useState([]);

    // Calculate specific totals
    const localCurrencyRate = 12000;
    const totalLocal = totals.total * localCurrencyRate;

    // Set default served by if users load
    useEffect(() => {
        if (users.length > 0 && !servedBy) {
            setServedBy(users[0]._id);
        }
    }, [users, servedBy]);

    // Load active checked-in hotel guests and rooms for POS dropdown
    useEffect(() => {
        const fetchHotelGuests = async () => {
            try {
                const [guestRes, roomRes] = await Promise.allSettled([
                    realApi.hotel.getCheckedInGuests(),
                    realApi.hotel.getRooms()
                ]);

                let optionsList = [];

                // 1. Checked-in guests (e.g. Nuur - Room 101)
                if (guestRes.status === 'fulfilled' && guestRes.value?.success) {
                    const checkedIn = realApi.extractData(guestRes.value) || [];
                    checkedIn.forEach(g => {
                        const roomNum = g.room?.number || g.roomNumber || g.room || '—';
                        optionsList.push({
                            value: `Room ${roomNum} - ${g.guestName}`,
                            label: `🏨 Room ${roomNum} (${g.guestName})`
                        });
                    });
                }

                // 2. Database rooms from getRooms()
                if (roomRes.status === 'fulfilled' && roomRes.value?.success) {
                    const roomData = realApi.extractData(roomRes.value) || [];
                    roomData.forEach(r => {
                        const num = String(r.number || r.roomNumber || r.room || '');
                        if (num) {
                            const valueStr = `Room ${num}`;
                            if (!optionsList.some(o => o.value.includes(num))) {
                                optionsList.push({
                                    value: valueStr,
                                    label: `🏨 Room ${num} (${r.status === 'occupied' ? 'Occupied' : 'Available'})`
                                });
                            }
                        }
                    });
                }

                // 3. Fallback standard room numbers if list is empty
                if (optionsList.length === 0) {
                    ['101', '102', '103', '104', '105', '201', '202', '203'].forEach(num => {
                        optionsList.push({
                            value: `Room ${num}`,
                            label: `🏨 Room ${num}`
                        });
                    });
                }

                setHotelGuests(optionsList);
            } catch (e) {
                console.error('Failed to load hotel rooms in POS', e);
            }
        };
        fetchHotelGuests();
    }, [settings]);

    // Determine if credit is selected with no customer — show warning
    const isCreditMode = paymentMethod === 'credit';
    const creditNeedsCustomer = isCreditMode && !customer;

    // Hotel room integration state checks
    const isRoomMode = paymentMethod === 'room';
    const roomNeedsSelection = isRoomMode && !bookedRoom;

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
                    {(settings?.enableHotel || settings?.businessType === 'both' || settings?.businessType === 'hotel' || true) && (
                        <select
                            className={`w-full h-8 border rounded px-2 text-xs bg-white outline-none focus:border-blue-500 ${
                                roomNeedsSelection
                                    ? 'border-red-400 bg-red-50 text-red-700 font-semibold animate-pulse'
                                    : isRoomMode && bookedRoom
                                        ? 'border-green-400 bg-green-50 text-green-800 font-semibold'
                                        : 'border-gray-300'
                            }`}
                            value={bookedRoom}
                            onChange={(e) => setBookedRoom(e.target.value)}
                        >
                            <option value="">{isRoomMode ? '⚠ Select Guest Room' : 'Hotel Guest / Room (Optional)'}</option>
                            {hotelGuests.map((opt, idx) => (
                                <option key={idx} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    )}

                    {activeContext !== 'supermarket' && (
                        <select
                            className="w-full h-8 border border-gray-300 rounded px-2 text-xs bg-white outline-none focus:border-blue-500"
                            value={tableNumber?._id || tableNumber || ""}
                            onChange={(e) => onTableNumberChange(tables.find(t => t._id === e.target.value) || null)}
                        >
                            <option value="">Select Table: None</option>
                            {tables.map(table => <option key={table._id} value={table._id}>Table {table.name || table.number}</option>)}
                        </select>
                    )}

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

                    {/* Customer Dropdown */}
                    <select
                        className={`w-full h-8 border rounded px-2 text-xs bg-white outline-none focus:border-blue-500 ${
                            creditNeedsCustomer
                                ? 'border-red-400 bg-red-50 text-red-700 font-semibold animate-pulse'
                                : isCreditMode && customer
                                    ? 'border-green-400 bg-green-50 text-green-800 font-semibold'
                                    : 'border-gray-300'
                        }`}
                        value={customer ? customer._id : ""}
                        onChange={(e) => {
                            const found = customers.find(c => c._id === e.target.value);
                            onCustomerChange(found || null);
                        }}
                    >
                        <option value="">{isCreditMode ? '⚠ Select Customer for Credit' : 'Customer (Optional)'}</option>
                        {customers.map(c => <option key={c._id} value={c._id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>)}
                    </select>

                    {/* Payment Method Dropdown */}
                    <select
                        className={`w-full h-8 border rounded px-2 text-xs bg-white outline-none focus:border-blue-500 font-semibold ${
                            paymentMethod === 'credit'
                                ? 'border-orange-400 bg-orange-50 text-orange-800'
                                : paymentMethod === 'card'
                                    ? 'border-blue-400 bg-blue-50 text-blue-800'
                                    : paymentMethod === 'room'
                                        ? 'border-green-400 bg-green-50 text-green-800'
                                        : ['zaad', 'sahal', 'edahab', 'mycash'].includes(paymentMethod)
                                            ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                                            : 'border-gray-300'
                        }`}
                        value={paymentMethod}
                        onChange={(e) => onPaymentMethodChange(e.target.value)}
                    >
                        <option value="cash">💵 Cash</option>
                        <option value="zaad">📱 ZAAD</option>
                        <option value="sahal">📱 Sahal</option>
                        <option value="edahab">📱 e-Dahab</option>
                        <option value="mycash">📱 MyCash</option>
                        <option value="card">💳 Card</option>
                        <option value="credit">📋 Customer Credit (Ledger)</option>
                        {(settings?.enableHotel || settings?.businessType === 'both' || settings?.businessType === 'hotel') && (
                            <option value="room">🏨 Charge to Hotel Room</option>
                        )}
                    </select>
                </div>

                {/* Credit Warning Banner */}
                {creditNeedsCustomer && (
                    <div className="flex items-center gap-2 bg-red-100 border border-red-300 text-red-700 rounded px-2 py-1.5 text-[10px] font-semibold">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>Select a customer above to use Credit (Ledger) payment</span>
                    </div>
                )}

                {/* Credit Info Banner when customer selected */}
                {isCreditMode && customer && (
                    <div className="flex items-center gap-2 bg-green-100 border border-green-300 text-green-800 rounded px-2 py-1.5 text-[10px] font-semibold">
                        <User size={12} className="shrink-0" />
                        <span>Credit will be added to <strong>{customer.name}</strong>'s ledger account</span>
                    </div>
                )}

                {/* Room Warning Banner */}
                {roomNeedsSelection && (
                    <div className="flex items-center gap-2 bg-red-100 border border-red-300 text-red-700 rounded px-2 py-1.5 text-[10px] font-semibold">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>Select a Booked Room above to charge to room</span>
                    </div>
                )}

                {/* Room Info Banner when room selected */}
                {isRoomMode && bookedRoom && (
                    <div className="flex items-center gap-2 bg-green-100 border border-green-300 text-green-800 rounded px-2 py-1.5 text-[10px] font-semibold">
                        <User size={12} className="shrink-0" />
                        <span>Transaction will be charged to guest room <strong>{bookedRoom}</strong></span>
                    </div>
                )}

                <textarea
                    className="w-full h-10 border border-gray-300 rounded p-1.5 text-xs bg-white outline-none focus:border-blue-500 resize-none"
                    placeholder="Remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                />
            </div>

            {/* Totals & Buttons */}
            <div className="bg-white p-3 border-t border-gray-300 shrink-0">
                {/* Totals summary */}
                <div className="mb-2 space-y-0.5 text-[11px]">
                    <div className="flex justify-between text-gray-500">
                        <span>Subtotal</span>
                        <span className="font-bold text-gray-800">${totals.subtotal.toFixed(2)}</span>
                    </div>
                    {vatEnabled && (
                        <div className="flex justify-between text-gray-500">
                            <span>VAT ({settings?.taxRate || 5}%)</span>
                            <span className="font-bold text-gray-800">${totals.vatAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-blue-900 border-t border-dashed border-gray-300 pt-1 mt-1">
                        <span>TOTAL</span>
                        <span>${totals.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Local (×12,000)</span>
                        <span>{Math.round(totals.total * 12000).toLocaleString()} SOS</span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
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
                            disabled={cart.length === 0 || creditNeedsCustomer || roomNeedsSelection}
                            className={`px-4 py-1.5 rounded text-xs font-bold border shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                (isCreditMode && customer) || (isRoomMode && bookedRoom)
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-400'
                                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                            }`}
                        >
                            {isCreditMode && customer
                                ? '📋 Add to Ledger'
                                : isRoomMode && bookedRoom
                                    ? '🏨 Charge to Room'
                                    : updatingOrderId
                                        ? 'Update Order'
                                        : 'Create Order'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};



export default OrderCart;
