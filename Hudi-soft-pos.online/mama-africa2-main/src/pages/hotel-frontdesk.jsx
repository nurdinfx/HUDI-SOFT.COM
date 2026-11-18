import React, { useEffect, useState } from 'react';
import { realApi } from '../api/realApi';
import { UserCheck, LogOut, DollarSign, Plus, Eye, FileText, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const HotelFrontDesk = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRes, setSelectedRes] = useState(null);
  
  // Charge / Payment modal states
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [newCharge, setNewCharge] = useState({ description: '', amount: '', type: 'other' });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', method: 'cash' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await realApi.hotel.getReservations();
      if (res.success) {
        const data = realApi.extractData(res);
        setReservations(data);
        if (selectedRes) {
          const updated = data.find(r => r._id === selectedRes._id);
          setSelectedRes(updated || null);
        }
      }
    } catch (error) {
      toast.error('Failed to load front desk data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (id) => {
    try {
      const res = await realApi.hotel.checkIn(id);
      if (res.success) {
        toast.success('Guest Checked-In successfully');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to perform check-in');
    }
  };

  const handleCheckOut = async (id) => {
    const balance = calculateRemainingBalance(selectedRes);
    if (balance > 0) {
      toast.error(`Please collect outstanding balance of $${balance} before checking out.`);
      return;
    }

    if (!window.confirm('Confirm checkout? This will set the room to dirty.')) return;

    try {
      const res = await realApi.hotel.checkOut(id);
      if (res.success) {
        toast.success('Guest Checked-Out successfully');
        setSelectedRes(null);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to perform check-out');
    }
  };

  const handleAddCharge = async (e) => {
    e.preventDefault();
    try {
      const res = await realApi.hotel.addCharge(selectedRes._id, {
        ...newCharge,
        amount: parseFloat(newCharge.amount)
      });
      if (res.success) {
        toast.success('Charge posted successfully');
        setShowChargeModal(false);
        setNewCharge({ description: '', amount: '', type: 'other' });
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to post charge');
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      const res = await realApi.hotel.addPayment(selectedRes._id, {
        ...newPayment,
        amount: parseFloat(newPayment.amount)
      });
      if (res.success) {
        toast.success('Payment recorded successfully');
        setShowPaymentModal(false);
        setNewPayment({ amount: '', method: 'cash' });
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const calculateTotalCharges = (res) => {
    if (!res) return 0;
    return res.charges?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
  };

  const calculateTotalPayments = (res) => {
    if (!res) return 0;
    const paidDeposit = res.deposit || 0;
    const directPayments = res.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    return paidDeposit + directPayments;
  };

  const calculateRemainingBalance = (res) => {
    if (!res) return 0;
    return Math.max(0, calculateTotalCharges(res) - calculateTotalPayments(res));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Front Desk</h1>
        <p className="mt-2 text-sm text-gray-500">Manage guest check-ins, check-outs, deposits, and active folio billings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reservation / Occupied List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4 lg:col-span-1">
          <h2 className="text-lg font-bold text-gray-900">Current Guests</h2>
          <div className="divide-y divide-gray-100 overflow-y-auto max-h-[60vh] space-y-3">
            {reservations.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No active bookings.</p>
            ) : (
              reservations.map((res) => (
                <div
                  key={res._id}
                  onClick={() => setSelectedRes(res)}
                  className={`p-3 rounded-lg cursor-pointer border transition-all ${
                    selectedRes?._id === res._id
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-gray-900 text-sm">{res.guestName}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      res.status === 'checked_in' ? 'bg-emerald-100 text-emerald-800' :
                      res.status === 'checked_out' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {res.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Room {res.room?.number || 'Unassigned'}</div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[11px] text-gray-400">
                      {new Date(res.checkInDate).toLocaleDateString()} - {new Date(res.checkOutDate).toLocaleDateString()}
                    </span>
                    {res.status === 'reserved' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckIn(res._id);
                        }}
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-2 py-1 rounded"
                      >
                        <UserCheck className="h-3 w-3" /> Check-In
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Guest Folio */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm lg:col-span-2 p-6 flex flex-col justify-between min-h-[50vh]">
          {selectedRes ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedRes.guestName}</h2>
                  <p className="text-sm text-gray-500">
                    Room {selectedRes.room?.number} ({selectedRes.roomType?.name}) | Floor: {selectedRes.room?.floor}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowChargeModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Post Charge
                  </button>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <DollarSign className="h-3.5 w-3.5" /> Record Payment
                  </button>
                  {selectedRes.status === 'checked_in' && (
                    <button
                      onClick={() => handleCheckOut(selectedRes._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-bold text-white shadow-sm"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Checkout Guest
                    </button>
                  )}
                </div>
              </div>

              {/* Folio Statements */}
              <div className="space-y-4">
                <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" /> Guest Folio Charges & Payments
                </h3>
                <div className="border rounded-lg overflow-hidden divide-y text-sm">
                  {/* Charges List */}
                  <div className="bg-gray-50/50 p-4 space-y-2">
                    <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wider mb-2">Charges</h4>
                    {selectedRes.charges?.map((c, i) => (
                      <div key={i} className="flex justify-between text-gray-600">
                        <span>{c.description} <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded uppercase">{c.type}</span></span>
                        <span className="font-medium text-gray-950">${c.amount}</span>
                      </div>
                    ))}
                    {selectedRes.charges?.length === 0 && <p className="text-xs text-gray-400">No charges posted.</p>}
                  </div>

                  {/* Payments List */}
                  <div className="bg-white p-4 space-y-2">
                    <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wider mb-2">Payments</h4>
                    {selectedRes.deposit > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Initial Booking Deposit</span>
                        <span>${selectedRes.deposit}</span>
                      </div>
                    )}
                    {selectedRes.payments?.map((p, i) => (
                      <div key={i} className="flex justify-between text-emerald-600 font-medium">
                        <span>Folio Payment ({p.method})</span>
                        <span>${p.amount}</span>
                      </div>
                    ))}
                    {selectedRes.deposit === 0 && selectedRes.payments?.length === 0 && (
                      <p className="text-xs text-gray-400">No payments recorded.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Folio Total Balance Summaries */}
              <div className="border-t pt-4 grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 block">Total Charges</span>
                  <span className="text-xl font-bold text-gray-950">${calculateTotalCharges(selectedRes)}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-emerald-600 block">Total Payments</span>
                  <span className="text-xl font-bold text-emerald-700">${calculateTotalPayments(selectedRes)}</span>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-red-600 block">Remaining Balance</span>
                  <span className="text-xl font-bold text-red-700">${calculateRemainingBalance(selectedRes)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <UserCheck className="h-16 w-16 mb-2 text-gray-300" />
              <span>Select a Guest Booking to view Folio Statements & Room Bill.</span>
            </div>
          )}
        </div>
      </div>

      {/* Post Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900">Post Charge to Guest Folio</h2>
            <form onSubmit={handleAddCharge} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Charge Type</label>
                <select
                  value={newCharge.type}
                  onChange={(e) => setNewCharge({ ...newCharge, type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-blue-500"
                >
                  <option value="minibar">🍾 Minibar</option>
                  <option value="laundry">🧺 Laundry Service</option>
                  <option value="room_service">🍽️ Room Service Food</option>
                  <option value="other">🛎️ Other Services</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Minibar - Soft Drinks & Chocolates"
                  value={newCharge.description}
                  onChange={(e) => setNewCharge({ ...newCharge, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount ($) *</label>
                <input
                  type="number"
                  required
                  step="any"
                  min="0.01"
                  placeholder="15"
                  value={newCharge.amount}
                  onChange={(e) => setNewCharge({ ...newCharge, amount: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChargeModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                >
                  Post Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900">Record Folio Payment</h2>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Method</label>
                <select
                  value={newPayment.method}
                  onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-blue-500"
                >
                  <option value="cash">💵 Cash Payment</option>
                  <option value="zaad">📱 ZAAD Service</option>
                  <option value="sahal">📱 Sahal Service</option>
                  <option value="edahab">📱 eDahab</option>
                  <option value="mycash">📱 MyCash</option>
                  <option value="card">💳 Card Terminal</option>
                  <option value="bank">🏦 Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount Paid ($) *</label>
                <input
                  type="number"
                  required
                  step="any"
                  min="0.01"
                  placeholder="50"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelFrontDesk;
