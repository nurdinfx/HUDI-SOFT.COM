import React, { useEffect, useState } from 'react';
import { realApi } from '../api/realApi';
import { Bed, Plus, Trash2, Edit3, Building, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const HotelRooms = () => {
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' or 'types'
  
  // Modals / Form states
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newType, setNewType] = useState({ name: '', description: '', baseRate: '', amenities: '', maxOccupancy: 2 });
  
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoom, setNewRoom] = useState({ number: '', floor: '1st Floor', building: 'Main Building', roomType: '', status: 'available' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typeRes, roomRes] = await Promise.allSettled([
        realApi.hotel.getRoomTypes(),
        realApi.hotel.getRooms()
      ]);
      if (typeRes.status === 'fulfilled' && typeRes.value?.success) {
        setRoomTypes(realApi.extractData(typeRes.value));
      }
      if (roomRes.status === 'fulfilled' && roomRes.value?.success) {
        setRooms(realApi.extractData(roomRes.value));
      }
    } catch (error) {
      toast.error('Failed to load hotel data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoomType = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newType,
        baseRate: parseFloat(newType.baseRate),
        maxOccupancy: parseInt(newType.maxOccupancy),
        amenities: newType.amenities.split(',').map(a => a.trim()).filter(Boolean)
      };

      const res = await realApi.hotel.createRoomType(payload);
      if (res.success) {
        toast.success('Room Type created successfully');
        setShowTypeModal(false);
        setNewType({ name: '', description: '', baseRate: '', amenities: '', maxOccupancy: 2 });
        fetchData();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create room type');
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    try {
      const res = await realApi.hotel.createRoom(newRoom);
      if (res.success) {
        toast.success('Room created successfully');
        setShowRoomModal(false);
        setNewRoom({ number: '', floor: '1st Floor', building: 'Main Building', roomType: '', status: 'available' });
        fetchData();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create room');
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      const res = await realApi.hotel.deleteRoom(id);
      if (res.success) {
        toast.success('Room deleted successfully');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to delete room');
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Property Management</h1>
          <p className="mt-2 text-sm text-gray-500">Configure building rooms, floor details, layouts, rates, and occupancy rules.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTypeModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold bg-white hover:bg-gray-50 text-gray-700"
          >
            <Plus className="h-4 w-4" /> Add Room Type
          </button>
          <button
            onClick={() => {
              if (roomTypes.length === 0) {
                toast.error('Please create at least one Room Type first.');
                return;
              }
              setNewRoom(prev => ({ ...prev, roomType: roomTypes[0]._id }));
              setShowRoomModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Room
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'rooms' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Rooms list ({rooms.length})
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'types' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Room Types ({roomTypes.length})
          </button>
        </div>
      </div>

      {/* Rooms List Grid */}
      {activeTab === 'rooms' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {rooms.length === 0 ? (
            <div className="col-span-full bg-white border rounded-xl py-12 text-center text-gray-400">
              No rooms registered yet. Get started by clicking "Add Room".
            </div>
          ) : (
            rooms.map((room) => (
              <div key={room._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase tracking-wide">
                      {room.building}
                    </span>
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      room.status === 'available' ? 'bg-emerald-500' :
                      room.status === 'occupied' ? 'bg-red-500' :
                      room.status === 'reserved' ? 'bg-blue-500' : 'bg-amber-500'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Room {room.number}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{room.floor}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Bed className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{room.roomType?.name}</span>
                  </div>
                </div>
                <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 capitalize">{room.status}</span>
                  <button 
                    onClick={() => handleDeleteRoom(room._id)} 
                    className="p-1.5 rounded hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Room Types Tab */}
      {activeTab === 'types' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Type Name</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Base Rate</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Occupancy</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Amenities</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roomTypes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-400">
                      No room types created yet. Click "Add Room Type".
                    </td>
                  </tr>
                ) : (
                  roomTypes.map((type) => (
                    <tr key={type._id}>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{type.name}</td>
                      <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{type.description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">${type.baseRate}/night</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">Max {type.maxOccupancy} Guests</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {type.amenities?.map((am, idx) => (
                            <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-100">
                              {am}
                            </span>
                          )) || '-'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Room Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Add Room Type</h2>
            <form onSubmit={handleAddRoomType} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Type Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deluxe Suite"
                  value={newType.name}
                  onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Details about size, beds, etc."
                  value={newType.description}
                  onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Base Rate ($/Night) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="120"
                    value={newType.baseRate}
                    onChange={(e) => setNewType({ ...newType, baseRate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Max Occupancy *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newType.maxOccupancy}
                    onChange={(e) => setNewType({ ...newType, maxOccupancy: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amenities (Comma separated)</label>
                <input
                  type="text"
                  placeholder="WiFi, Air Conditioning, TV, Minibar"
                  value={newType.amenities}
                  onChange={(e) => setNewType({ ...newType, amenities: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white"
                >
                  Save Room Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Add Room</h2>
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="101"
                    value={newRoom.number}
                    onChange={(e) => setNewRoom({ ...newRoom, number: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Room Type *</label>
                  <select
                    value={newRoom.roomType}
                    onChange={(e) => setNewRoom({ ...newRoom, roomType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    {roomTypes.map(type => (
                      <option key={type._id} value={type._id}>{type.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Floor</label>
                  <input
                    type="text"
                    placeholder="1st Floor"
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Building</label>
                  <input
                    type="text"
                    placeholder="Main Building"
                    value={newRoom.building}
                    onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white"
                >
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelRooms;
