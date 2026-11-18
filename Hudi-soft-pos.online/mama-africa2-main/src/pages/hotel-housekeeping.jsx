import React, { useEffect, useState } from 'react';
import { realApi } from '../api/realApi';
import { Brush, Wrench, Plus, CheckCircle, Clock, AlertTriangle, Hammer } from 'lucide-react';
import toast from 'react-hot-toast';

const HotelHousekeeping = () => {
  const [tasks, setTasks] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('housekeeping'); // 'housekeeping' or 'maintenance'
  
  // Modal / Form state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ room: '', staff: '', taskType: 'cleaning', notes: '' });

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [newRequest, setNewRequest] = useState({ room: '', description: '', priority: 'medium', outOfOrder: false });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [taskRes, maintRes, roomRes] = await Promise.allSettled([
        realApi.hotel.getHousekeeping(),
        realApi.hotel.getMaintenance(),
        realApi.hotel.getRooms()
      ]);

      if (taskRes.status === 'fulfilled' && taskRes.value?.success) {
        setTasks(realApi.extractData(taskRes.value));
      }
      if (maintRes.status === 'fulfilled' && maintRes.value?.success) {
        setMaintenance(realApi.extractData(maintRes.value));
      }
      if (roomRes.status === 'fulfilled' && roomRes.value?.success) {
        setRooms(realApi.extractData(roomRes.value));
      }

      // Employees is optional — if it fails we still show the rest
      try {
        const empRes = await realApi.employees.getEmployees();
        if (empRes?.success) {
          setEmployees(realApi.extractData(empRes));
        }
      } catch (_) {
        // Employees not critical — continue without it
      }
    } catch (error) {
      toast.error('Failed to load housekeeping boards');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await realApi.hotel.createHousekeeping(newTask);
      if (res.success) {
        toast.success('Cleaning task assigned successfully');
        setShowTaskModal(false);
        setNewTask({ room: '', staff: '', taskType: 'cleaning', notes: '' });
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to create cleaning task');
    }
  };

  const handleUpdateTaskStatus = async (id, status) => {
    try {
      const res = await realApi.hotel.updateHousekeeping(id, { status });
      if (res.success) {
        toast.success(`Task status updated to ${status}`);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const handleCreateMaintenance = async (e) => {
    e.preventDefault();
    try {
      const res = await realApi.hotel.createMaintenance(newRequest);
      if (res.success) {
        toast.success('Maintenance ticket created successfully');
        setShowMaintenanceModal(false);
        setNewRequest({ room: '', description: '', priority: 'medium', outOfOrder: false });
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to create maintenance request');
    }
  };

  const handleUpdateMaintenanceStatus = async (id, status) => {
    try {
      const res = await realApi.hotel.updateMaintenance(id, { status });
      if (res.success) {
        toast.success(`Maintenance ticket status updated to ${status}`);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update ticket status');
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
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Housekeeping & Maintenance</h1>
          <p className="mt-2 text-sm text-gray-500">Monitor room status boards, assign cleaning logs, and log facility work orders.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'housekeeping' ? (
            <button
              onClick={() => {
                if (rooms.length === 0) {
                  toast.error('Please create rooms first.');
                  return;
                }
                setNewTask(prev => ({ ...prev, room: rooms[0]._id, staff: employees[0]?._id || '' }));
                setShowTaskModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white shadow-sm"
            >
              <Plus className="h-4 w-4" /> Create Cleaning Task
            </button>
          ) : (
            <button
              onClick={() => {
                if (rooms.length === 0) {
                  toast.error('Please create rooms first.');
                  return;
                }
                setNewRequest(prev => ({ ...prev, room: rooms[0]._id }));
                setShowMaintenanceModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-semibold text-white shadow-sm"
            >
              <Plus className="h-4 w-4" /> Create Maintenance Request
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('housekeeping')}
            className={`py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'housekeeping' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Housekeeping tasks ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'maintenance' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Maintenance Requests ({maintenance.length})
          </button>
        </div>
      </div>

      {/* Housekeeping Tasks */}
      {activeTab === 'housekeeping' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Room Number</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Task Type</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Staff</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                      No housekeeping tasks allocated.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task._id}>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">Room {task.room?.number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 capitalize">{task.taskType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{task.staff?.name || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-gray-500">{task.notes || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          task.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          task.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap space-x-2">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateTaskStatus(task._id, 'in_progress')}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded border border-amber-200"
                          >
                            Start Cleaning
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button
                            onClick={() => handleUpdateTaskStatus(task._id, 'completed')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded border border-emerald-200"
                          >
                            Mark Clean
                          </button>
                        )}
                        {task.status === 'completed' && (
                          <span className="text-gray-400 text-xs flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Done
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Maintenance Requests */}
      {activeTab === 'maintenance' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Room Number</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Problem Description</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Out Of Order</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {maintenance.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                      No maintenance tickets logged.
                    </td>
                  </tr>
                ) : (
                  maintenance.map((m) => (
                    <tr key={m._id}>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">Room {m.room?.number}</td>
                      <td className="px-6 py-4 text-gray-500 max-w-sm">{m.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          m.priority === 'high' ? 'bg-red-100 text-red-800' :
                          m.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {m.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {m.outOfOrder ? (
                          <span className="text-red-600 font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> Out of Order
                          </span>
                        ) : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          m.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          m.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap space-x-2">
                        {m.status !== 'completed' && m.status !== 'cancelled' && (
                          <button
                            onClick={() => handleUpdateMaintenanceStatus(m._id, 'completed')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded border border-emerald-200"
                          >
                            Mark Completed
                          </button>
                        )}
                        {m.status === 'completed' && (
                          <span className="text-gray-400 text-xs flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Fixed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Housekeeping Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900">Create Cleaning Workorder</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Target Room *</label>
                <select
                  required
                  value={newTask.room}
                  onChange={(e) => setNewTask({ ...newTask, room: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-blue-500"
                >
                  {rooms.map(r => (
                    <option key={r._id} value={r._id}>Room {r.number} (Status: {r.status})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Housekeeping Staff</label>
                <select
                  value={newTask.staff}
                  onChange={(e) => setNewTask({ ...newTask, staff: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-blue-500"
                >
                  <option value="">Select Staff</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cleaning Notes</label>
                <textarea
                  placeholder="e.g. Needs towel replacement, extra water bottles"
                  value={newTask.notes}
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Request Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900">Log Maintenance Ticket</h2>
            <form onSubmit={handleCreateMaintenance} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Room *</label>
                <select
                  required
                  value={newRequest.room}
                  onChange={(e) => setNewRequest({ ...newRequest, room: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-blue-500"
                >
                  {rooms.map(r => (
                    <option key={r._id} value={r._id}>Room {r.number} ({r.floor})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                <select
                  value={newRequest.priority}
                  onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-blue-500"
                >
                  <option value="low">🔧 Low priority</option>
                  <option value="medium">🔨 Medium priority</option>
                  <option value="high">🚨 High priority</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Problem Description *</label>
                <textarea
                  required
                  placeholder="e.g. AC leaking water, bathroom light flickering"
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="outOfOrder"
                  checked={newRequest.outOfOrder}
                  onChange={(e) => setNewRequest({ ...newRequest, outOfOrder: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="outOfOrder" className="text-sm font-semibold text-red-600 select-none">
                  ⚠️ Set Room to Out-Of-Order status
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMaintenanceModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                >
                  Log Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelHousekeeping;
