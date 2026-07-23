import React, { useEffect, useState } from 'react';
import { realApi } from '../api/realApi';
import { CalendarCheck, Plus, Search, Calendar, User, Phone, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const HotelReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Form states
  const [showModal, setShowModal] = useState(false);
  const [newRes, setNewRes] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    room: '',
    roomType: '',
    checkInDate: '',
    checkOutDate: '',
    dailyRate: '',
    deposit: '0'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resList, roomRes, typeRes] = await Promise.allSettled([
        realApi.hotel.getReservations(),
        realApi.hotel.getRooms(),
        realApi.hotel.getRoomTypes()
      ]);
      if (resList.status === 'fulfilled' && resList.value?.success) {
        setReservations(realApi.extractData(resList.value));
      }
      if (roomRes.status === 'fulfilled' && roomRes.value?.success) {
        setRooms(realApi.extractData(roomRes.value).filter(r => r.status === 'available'));
      }
      if (typeRes.status === 'fulfilled' && typeRes.value?.success) {
        setRoomTypes(realApi.extractData(typeRes.value));
      }
    } catch (error) {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomTypeChange = (typeId) => {
    const selectedType = roomTypes.find(t => t._id === typeId);
    setNewRes(prev => ({
      ...prev,
      roomType: typeId,
      dailyRate: selectedType ? String(selectedType.baseRate) : '',
      room: '' // reset room selection
    }));
  };

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newRes,
        dailyRate: parseFloat(newRes.dailyRate),
        deposit: parseFloat(newRes.deposit || 0)
      };

      const res = await realApi.hotel.createReservation(payload);
      if (res.success) {
        toast.success('Reservation created successfully');
        setShowModal(false);
        setNewRes({
          guestName: '',
          guestPhone: '',
          guestEmail: '',
          room: '',
          roomType: '',
          checkInDate: '',
          checkOutDate: '',
          dailyRate: '',
          deposit: '0'
        });
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to create reservation');
    }
  };

  // Filter reservations based on search
  const filteredReservations = reservations.filter(res => 
    res.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.guestPhone.includes(searchQuery) ||
    (res.room?.number && res.room.number.includes(searchQuery))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reservations</h1>
          <p className="mt-2 text-sm text-gray-500">Record, organize, and monitor guest bookings, deposits, and reservations.</p>
        </div>
        <button
          onClick={() => {
            if (roomTypes.length === 0 || rooms.length === 0) {
              toast.error('Ensure Room Types and Rooms are created before booking.');
              return;
            }
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white shadow-sm self-start md:self-auto"
        >
          <Plus className="h-4 w-4" /> New Booking
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex bg-white rounded-lg border border-gray-200 shadow-sm p-3 max-w-md">
        <Search className="h-5 w-5 text-gray-400 mr-2 self-center" />
        <input
          type="text"
          placeholder="Search by Guest Name, Phone or Room..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-sm outline-none border-none"
        />
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Guest Details</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Room Assigned</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Check-in / Check-out</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Rate / Deposit</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-400">
                    No matching bookings found.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => (
                  <tr key={res._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{res.guestName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{res.guestPhone} | {res.guestEmail || 'No Email'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">Room {res.room?.number || 'Unassigned'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{res.roomType?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      <div>In: {new Date(res.checkInDate).toLocaleDateString()}</div>
                      <div>Out: {new Date(res.checkOutDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">${res.dailyRate}/night</div>
                      <div className="text-xs text-emerald-600 font-semibold mt-0.5">Paid Dep: ${res.deposit}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        res.status === 'checked_in' ? 'bg-emerald-100 text-emerald-800' :
                        res.status === 'checked_out' ? 'bg-gray-100 text-gray-800' :
                        res.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {res.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">New Guest Reservation</h2>
            <form onSubmit={handleCreateReservation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Guest Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={newRes.guestName}
                    onChange={(e) => setNewRes({ ...newRes, guestName: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+1 234 567 89"
                    value={newRes.guestPhone}
                    onChange={(e) => setNewRes({ ...newRes, guestPhone: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="john.doe@example.com"
                  value={newRes.guestEmail}
                  onChange={(e) => setNewRes({ ...newRes, guestEmail: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Room Type *</label>
                  <select
                    required
                    value={newRes.roomType}
                    onChange={(e) => handleRoomTypeChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-blue-500"
                  >
                    <option value="">Select Type</option>
                    {roomTypes.map(t => (
                      <option key={t._id} value={t._id}>{t.name} (${t.baseRate}/night)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Available Room *</label>
                  <select
                    required
                    value={newRes.room}
                    onChange={(e) => setNewRes({ ...newRes, room: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-blue-500"
                  >
                    <option value="">Select Room</option>
                    {rooms
                      .filter(r => r.roomType?._id === newRes.roomType)
                      .map(r => (
                        <option key={r._id} value={r._id}>Room {r.number} ({r.floor})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Check-in Date *</label>
                  <input
                    type="date"
                    required
                    value={newRes.checkInDate}
                    onChange={(e) => setNewRes({ ...newRes, checkInDate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Check-out Date *</label>
                  <input
                    type="date"
                    required
                    value={newRes.checkOutDate}
                    onChange={(e) => setNewRes({ ...newRes, checkOutDate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Daily Rate ($) *</label>
                  <input
                    type="number"
                    required
                    value={newRes.dailyRate}
                    onChange={(e) => setNewRes({ ...newRes, dailyRate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Initial Deposit ($)</label>
                  <input
                    type="number"
                    value={newRes.deposit}
                    onChange={(e) => setNewRes({ ...newRes, deposit: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white shadow-sm"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelReservations;
