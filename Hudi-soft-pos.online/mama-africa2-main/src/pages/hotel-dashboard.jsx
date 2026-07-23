import React, { useEffect, useState } from 'react';
import { realApi } from '../api/realApi';
import { 
  Building, 
  Bed, 
  DollarSign, 
  Percent, 
  Brush, 
  Wrench, 
  CalendarCheck, 
  UserCheck,
  TrendingUp,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

const HotelDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentReservations, setRecentReservations] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const metricRes = await realApi.hotel.getMetrics();
      if (metricRes.success) {
        setMetrics(realApi.extractData(metricRes));
      }

      const resList = await realApi.hotel.getReservations();
      if (resList.success) {
        setRecentReservations(realApi.extractData(resList).slice(0, 5));
      }
    } catch (error) {
      toast.error('Failed to load hotel metrics');
    } finally {
      setLoading(false);
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
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Hotel Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">Real-time overview of hotel occupancy, revenue, and guest services.</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics?.occupancyRate || 0}%</p>
            <p className="text-xs text-gray-400 mt-1">
              {metrics?.occupiedRooms || 0} / {metrics?.totalRooms || 0} Rooms occupied
            </p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
            <Percent className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Room Revenue Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">${metrics?.roomRevenueToday || 0}</p>
            <p className="text-xs text-gray-400 mt-1">Live active folio rates</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Average Daily Rate (ADR)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">${metrics?.adr || 0}</p>
            <p className="text-xs text-gray-400 mt-1">Avg rate per occupied room</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-purple-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">RevPAR</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">${metrics?.revpar || 0}</p>
            <p className="text-xs text-gray-400 mt-1">Revenue per available room</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg text-amber-600">
            <Activity className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Housekeeping & Maintenance Tasks Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Brush className="h-5 w-5 text-blue-600" /> Housekeeping Status
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {metrics?.pendingHousekeeping || 0} Pending
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Keep track of rooms to be cleaned or inspected before check-ins.
          </p>
          <div className="mt-4">
            <a href="#/hotel/housekeeping" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
              Manage Housekeeping Board →
            </a>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-600" /> Maintenance Status
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {metrics?.pendingMaintenance || 0} Open Requests
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Manage room maintenance work orders to minimize downtime.
          </p>
          <div className="mt-4">
            <a href="#/hotel/housekeeping?tab=maintenance" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
              Manage Maintenance Workorders →
            </a>
          </div>
        </div>
      </div>

      {/* Recent Bookings List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-blue-600" /> Recent Bookings
          </h2>
          <a href="#/hotel/reservations" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
            View All Bookings
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Guest Name</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentReservations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-400">
                    No reservations recorded.
                  </td>
                </tr>
              ) : (
                recentReservations.map((res) => (
                  <tr key={res._id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{res.guestName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      Room {res.room?.number || 'Unassigned'} ({res.roomType?.name})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(res.checkInDate).toLocaleDateString()} - {new Date(res.checkOutDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">${res.dailyRate}/night</td>
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
    </div>
  );
};

export default HotelDashboard;
