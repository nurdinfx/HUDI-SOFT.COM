import React, { useEffect, useMemo, useState } from 'react';
import { 
  Users as UsersIcon, 
  Banknote, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  Search, 
  Calendar, 
  DollarSign, 
  RefreshCw, 
  UserCheck, 
  ArrowUpRight 
} from 'lucide-react';
import { realApi } from '../api/realApi';
import { useAuth } from '../contexts/AuthContext';
import { useOptimisticData } from '../hooks/useOptimisticData';
import { toast } from 'react-hot-toast';

const SummaryCard = ({ title, value, color, icon: Icon }) => (
  <div className="flex items-center gap-4 rounded-xl p-5 text-white shadow-md transition-transform hover:scale-[1.02]" style={{ backgroundColor: color }}>
    <div className="p-3 bg-white/20 rounded-lg">
      <Icon size={24} />
    </div>
    <div>
      <div className="text-xs font-semibold opacity-90 uppercase tracking-wider">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  </div>
);

const Employees = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' or 'advances'
  const [loading, setLoading] = useState(false);
  
  // Modals state
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    salary: '',
    status: 'active'
  });

  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    employeeId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Dynamic summary stats state
  const [summaryStats, setSummaryStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalPayroll: 0,
    totalOutstandingAdvances: 0
  });

  // Search & Filter state
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('');
  const [advanceSearch, setAdvanceSearch] = useState('');
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState('');

  // 1. Load Employees list
  const {
    data: employees,
    loading: employeesLoading,
    refresh: loadEmployees
  } = useOptimisticData('employees_list', async () => {
    const res = await realApi.getEmployees();
    return res.data || [];
  }, []);

  // 2. Load Advances list
  const [advances, setAdvances] = useState([]);
  const [advancesLoading, setAdvancesLoading] = useState(false);

  const loadAdvances = async () => {
    try {
      setAdvancesLoading(true);
      const res = await realApi.getAdvances();
      if (res.success) {
        setAdvances(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching advances:', err);
    } finally {
      setAdvancesLoading(false);
    }
  };

  const loadSummaryStats = async () => {
    try {
      const res = await realApi.getEmployeeSummary();
      if (res.success) {
        setSummaryStats(res.data);
      }
    } catch (err) {
      console.error('Error fetching summary stats:', err);
    }
  };

  useEffect(() => {
    loadSummaryStats();
    if (activeTab === 'advances') {
      loadAdvances();
    }
  }, [activeTab, employees]);

  // Open modal to add employee
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      name: '',
      position: '',
      phone: '',
      email: '',
      salary: '',
      status: 'active'
    });
    setShowEmployeeModal(true);
  };

  // Open modal to edit employee
  const handleOpenEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      name: emp.name,
      position: emp.position,
      phone: emp.phone || '',
      email: emp.email || '',
      salary: emp.salary,
      status: emp.status || 'active'
    });
    setShowEmployeeModal(true);
  };

  // Save employee
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!employeeForm.name.trim()) return toast.error('Name is required');
    if (!employeeForm.position.trim()) return toast.error('Position is required');
    if (!employeeForm.salary || parseFloat(employeeForm.salary) <= 0) return toast.error('Salary must be greater than zero');

    try {
      setLoading(true);
      let res;
      if (editingEmployee) {
        res = await realApi.updateEmployee(editingEmployee._id, employeeForm);
      } else {
        res = await realApi.createEmployee(employeeForm);
      }

      if (res.success) {
        toast.success(res.message || 'Saved successfully');
        setShowEmployeeModal(false);
        loadEmployees();
        loadSummaryStats();
      } else {
        toast.error(res.message || 'Action failed');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete employee "${name}"? This will delete all their salary advance records as well.`)) return;

    try {
      setLoading(true);
      const res = await realApi.deleteEmployee(id);
      if (res.success) {
        toast.success('Employee deleted');
        loadEmployees();
        loadSummaryStats();
      } else {
        toast.error(res.message || 'Failed to delete');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Open advance modal pre-filled with specific employee
  const handleOpenAddAdvanceForEmployee = (emp) => {
    setAdvanceForm({
      employeeId: emp._id,
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowAdvanceModal(true);
  };

  // Save Salary Advance
  const handleSaveAdvance = async (e) => {
    e.preventDefault();
    if (!advanceForm.employeeId) return toast.error('Please select an employee');
    if (!advanceForm.amount || parseFloat(advanceForm.amount) <= 0) return toast.error('Please enter a valid advance amount');

    try {
      setLoading(true);
      const res = await realApi.createAdvance(advanceForm);
      if (res.success) {
        toast.success('Advance disbursed successfully');
        setShowAdvanceModal(false);
        setAdvanceForm({
          employeeId: '',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        loadAdvances();
        loadSummaryStats();
      } else {
        toast.error(res.message || 'Failed to disburse advance');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Update Advance Status (paid or deducted)
  const handleUpdateAdvanceStatus = async (id, status) => {
    try {
      const res = await realApi.updateAdvanceStatus(id, { status });
      if (res.success) {
        toast.success(`Advance status updated to ${status}`);
        loadAdvances();
        loadSummaryStats();
      } else {
        toast.error(res.message || 'Failed to update');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    }
  };

  // Delete Advance
  const handleDeleteAdvance = async (id) => {
    if (!window.confirm('Are you sure you want to delete this advance record?')) return;
    try {
      const res = await realApi.deleteAdvance(id);
      if (res.success) {
        toast.success('Advance record deleted');
        loadAdvances();
        loadSummaryStats();
      } else {
        toast.error(res.message || 'Failed to delete');
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    }
  };

  // Filters for Directory
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                            emp.position.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                            (emp.phone && emp.phone.includes(employeeSearch));
      const matchesStatus = employeeStatusFilter === '' || emp.status === employeeStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employees, employeeSearch, employeeStatusFilter]);

  // Filters for Advances
  const filteredAdvances = useMemo(() => {
    return advances.filter(adv => {
      const empName = adv.employee?.name || '';
      const matchesSearch = empName.toLowerCase().includes(advanceSearch.toLowerCase()) ||
                            (adv.description && adv.description.toLowerCase().includes(advanceSearch.toLowerCase()));
      const matchesStatus = advanceStatusFilter === '' || adv.status === advanceStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [advances, advanceSearch, advanceStatusFilter]);

  return (
    <div className="page-content flex flex-col gap-6 h-full overflow-auto p-6 bg-slate-50">
      
      {/* Header Panel */}
      <div className="card bg-gradient-to-r from-indigo-600 to-indigo-800 text-white border-0 shadow-lg p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1 tracking-tight">Employee Management</h1>
            <p className="text-indigo-100 text-sm">Manage employee accounts, monthly salaries, and salary advances</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                loadEmployees();
                if (activeTab === 'advances') loadAdvances();
                loadSummaryStats();
              }}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={employeesLoading || advancesLoading ? 'animate-spin' : ''} />
            </button>
            {activeTab === 'directory' ? (
              <button
                onClick={handleOpenAddEmployee}
                className="flex items-center gap-2 bg-white text-indigo-700 font-bold px-4 py-2.5 rounded-lg shadow hover:bg-indigo-50 transition-colors text-sm"
              >
                <Plus size={16} />
                Add Employee
              </button>
            ) : (
              <button
                onClick={() => setShowAdvanceModal(true)}
                className="flex items-center gap-2 bg-white text-indigo-700 font-bold px-4 py-2.5 rounded-lg shadow hover:bg-indigo-50 transition-colors text-sm"
              >
                <Plus size={16} />
                Disburse Advance
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Employees" value={summaryStats.totalEmployees} color="#6366f1" icon={UsersIcon} />
        <SummaryCard title="Active Employees" value={summaryStats.activeEmployees} color="#10b981" icon={UserCheck} />
        <SummaryCard title="Monthly Payroll" value={`$${(summaryStats.totalPayroll || 0).toFixed(2)}`} color="#ec4899" icon={Banknote} />
        <SummaryCard title="Outstanding Advances" value={`$${(summaryStats.totalOutstandingAdvances || 0).toFixed(2)}`} color="#f59e0b" icon={DollarSign} />
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-200 bg-white p-2 rounded-xl shadow-sm gap-2">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex-1 md:flex-initial text-center py-2.5 px-6 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'directory' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          Employee Directory
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`flex-1 md:flex-initial text-center py-2.5 px-6 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'advances' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          Salary Advances
        </button>
      </div>

      {/* Tab Contents: Employee Directory */}
      {activeTab === 'directory' && (
        <div className="flex flex-col gap-4">
          
          {/* Filters Bar */}
          <div className="card bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, role, phone..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Filter Status</label>
                <select
                  value={employeeStatusFilter}
                  onChange={(e) => setEmployeeStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none w-full md:w-40"
                >
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Directory Table Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Position</th>
                    <th className="px-6 py-4">Salary</th>
                    <th className="px-6 py-4">Phone / Email</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Join Date</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employeesLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500 text-sm">
                        <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-indigo-600" />
                        Loading directory...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                        No employees found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-900">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{emp.position}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">${(emp.salary || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-gray-700 font-medium">{emp.phone || '-'}</div>
                          <div className="text-xs text-gray-400">{emp.email || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            emp.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {emp.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleOpenAddAdvanceForEmployee(emp)}
                              className="px-2 py-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-lg font-semibold transition-colors flex items-center gap-1"
                              title="Add Salary Advance"
                            >
                              <DollarSign size={13} />
                              Advance
                            </button>
                            <button
                              onClick={() => handleOpenEditEmployee(emp)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit Employee"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp._id, emp.name)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Employee"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Salary Advances */}
      {activeTab === 'advances' && (
        <div className="flex flex-col gap-4">
          
          {/* Filters Bar */}
          <div className="card bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by employee name or description..."
                  value={advanceSearch}
                  onChange={(e) => setAdvanceSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Filter Status</label>
                <select
                  value={advanceStatusFilter}
                  onChange={(e) => setAdvanceStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none w-full md:w-40"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="deducted">Deducted</option>
                  <option value="paid">Paid/Settled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Advances Table Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Position</th>
                    <th className="px-6 py-4">Advance Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Remarks / Description</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {advancesLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500 text-sm">
                        <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-indigo-600" />
                        Loading advances...
                      </td>
                    </tr>
                  ) : filteredAdvances.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                        No advance records found.
                      </td>
                    </tr>
                  ) : (
                    filteredAdvances.map((adv) => (
                      <tr key={adv._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {adv.date ? new Date(adv.date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-950">
                          {adv.employee?.name || 'Deleted Employee'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{adv.employee?.position || '-'}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">${(adv.amount || 0).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            adv.status === 'pending' 
                              ? 'bg-amber-100 text-amber-800' 
                              : adv.status === 'deducted' 
                              ? 'bg-indigo-100 text-indigo-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {adv.status === 'pending' ? 'Pending' : adv.status === 'deducted' ? 'Deducted' : 'Settled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm max-w-xs truncate">{adv.description || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center items-center gap-2">
                            {adv.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateAdvanceStatus(adv._id, 'deducted')}
                                  className="px-2 py-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded font-semibold transition-colors flex items-center gap-1"
                                  title="Mark as Deducted from Salary"
                                >
                                  Deduct
                                </button>
                                <button
                                  onClick={() => handleUpdateAdvanceStatus(adv._id, 'paid')}
                                  className="px-2 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded font-semibold transition-colors flex items-center gap-1"
                                  title="Mark as Settled/Paid"
                                >
                                  Settle
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteAdvance(adv._id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Employee Modal: Add / Edit */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-100 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{editingEmployee ? 'Edit Employee Info' : 'Register New Employee'}</h3>
              
              <form onSubmit={handleSaveEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter employee name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Position / Job Title *</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.position}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Head Chef, Cashier, Waiter"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Monthly Salary ($) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={employeeForm.salary}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Salary amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      value={employeeForm.status}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter phone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter email"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEmployeeModal(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Advance Modal: Disburse Advance */}
      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-100 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Disburse Salary Advance</h3>
              
              <form onSubmit={handleSaveAdvance} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Select Employee *</label>
                  <select
                    required
                    value={advanceForm.employeeId}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, employeeId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.filter(e => e.status === 'active').map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.position} - ${emp.salary.toFixed(0)}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Advance Amount ($) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={advanceForm.amount}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Amount to disburse"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={advanceForm.date}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks / Description</label>
                  <textarea
                    value={advanceForm.description}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter purpose of advance"
                    rows="3"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAdvanceModal(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Disbursing...' : 'Disburse Advance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Employees;
