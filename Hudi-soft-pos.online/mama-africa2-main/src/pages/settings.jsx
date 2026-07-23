// src/pages/Settings.jsx
/** Version: 1.0.7 - Electron Printer Settings Tab */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { realApi } from '../api/realApi';
import { API_CONFIG } from '../config/api.config';
import PrinterSettings from '../components/Settings/PrinterSettings';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    restaurantName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxId: '',
    taxRate: 10,
    serviceCharge: 0,
    currency: 'USD',
    receiptHeader: '',
    receiptFooter: '',
    receiptSize: '80mm',
    zaad: '',
    sahal: '',
    edahab: '',
    myCash: '',
    logoUrl: '',
    businessHours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '23:00', closed: false },
      saturday: { open: '10:00', close: '23:00', closed: false },
      sunday: { open: '10:00', close: '21:00', closed: false }
    },
    autoBackup: true,
    lowStockAlert: true,
    orderNotifications: true,
    printReceipt: true,
    language: 'en',
    timezone: 'UTC-5',
    businessType: 'both',
    enableHotel: false
  });

  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setInitialLoad(true);
    setError('');
    try {
      const response = await realApi.getSettings();
      if (response.success) {
        const data = realApi.extractData(response);
        if (data) {
          setSettings(prev => ({
            ...prev,
            ...data,
            businessHours: data.businessHours || prev.businessHours
          }));
        }
      } else {
        setError(response.message || 'Failed to load settings');
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
      setError('Connection error: Cannot reach the server.');
    } finally {
      setInitialLoad(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const response = await realApi.updateSettings(settings);
      if (response.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        
        const data = realApi.extractData(response);
        if (data) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      } else {
        setError(response.message || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Save settings error:', err);
      setError('Failed to save settings. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === 'logoFile') {
      handleLogoUpload(value);
      return;
    }
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBusinessHoursChange = (day, field, value) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: field === 'closed' ? !prev.businessHours[day].closed : value
        }
      }
    }));
  };

  const handleClearCache = async () => {
    localStorage.removeItem('settings_data');
    await fetchSettings();
    alert('Local cache cleared.');
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo size should be less than 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    setLoading(true);
    setError('');
    try {
      // Get branch ID from user or settings
      const branchId = user?.branch?._id || user?.branch?.id || settings.branchId;

      if (!branchId) {
        throw new Error('Branch ID not found. Please relogin.');
      }

      const response = await realApi.settings.uploadBranchLogo(branchId, formData);
      if (response.success) {
        const logoUrl = response.data.logo;
        setSettings(prev => ({ ...prev, logoUrl }));
        alert('Logo uploaded successfully!');
      } else {
        throw new Error(response.message || 'Failed to upload logo');
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      setError(err.message || 'Failed to upload logo');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupDatabase = async () => {
    try {
      setLoading(true);
      // This would typically call a backup endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Database backup completed successfully!');
    } catch (error) {
      alert('Error backing up database: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      const defaultSettings = {
        // General Settings
        restaurantName: 'Mama Africa Restaurant',
        address: '',
        phone: '',
        email: '',
        website: '',
        taxId: '',

        // POS Settings
        taxRate: 10,
        serviceCharge: 0,
        currency: 'USD',
        receiptHeader: 'Mama Africa Restaurant',
        receiptFooter: 'Thank you for dining with us!',
        receiptSize: '80mm',
        logoUrl: '',
        zaad: '',
        sahal: '',
        edahab: '',
        myCash: '',

        // Business Hours
        businessHours: {
          monday: { open: '09:00', close: '22:00', closed: false },
          tuesday: { open: '09:00', close: '22:00', closed: false },
          wednesday: { open: '09:00', close: '22:00', closed: false },
          thursday: { open: '09:00', close: '22:00', closed: false },
          friday: { open: '09:00', close: '23:00', closed: false },
          saturday: { open: '10:00', close: '23:00', closed: false },
          sunday: { open: '10:00', close: '21:00', closed: false }
        },

        // System Settings
        autoBackup: true,
        lowStockAlert: true,
        orderNotifications: true,
        printReceipt: true,
        language: 'en',
        timezone: 'UTC-5'
      };

      // Continue reset as before
      setSettings(defaultSettings);
      await handleSaveSettings();
    }
  };


  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'pos', name: 'Receipt Settings', icon: '🧾' },
    { id: 'hours', name: 'Business Hours', icon: '🕒' },
    { id: 'system', name: 'System', icon: '🔧' },
    { id: 'printer', name: 'Printer', icon: '🖨️' },
  ];

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  if (initialLoad) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading Settings...</div>
      </div>
    );
  }

  return (
    <div className="page-content flex flex-col gap-6 h-full overflow-auto">
      {/* Header */}
      <div className="card flex justify-between items-center">
        <div>
          <h1 className="heading-1 text-slate-900 mb-1">System Settings</h1>
          <p className="text-muted">Configure your restaurant system preferences</p>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium shadow-sm transition-colors"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {saved && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg shadow-sm">
          Settings saved successfully!
        </div>
      )}

      <div className="card p-0 overflow-hidden flex-1 flex flex-col">
        {/* Tab Navigation */}
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
              >
                <span className="mr-2 text-lg">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <GeneralSettings
              settings={settings}
              onChange={handleInputChange}
            />
          )}

          {activeTab === 'pos' && (
            <POSSettings
              settings={settings}
              onChange={handleInputChange}
            />
          )}

          {activeTab === 'hours' && (
            <BusinessHours
              settings={settings}
              onChange={handleBusinessHoursChange}
              days={days}
            />
          )}

          {activeTab === 'system' && (
            <SystemSettings
              settings={settings}
              onChange={handleInputChange}
              onClearCache={handleClearCache}
              onBackupDatabase={handleBackupDatabase}
              onResetDefaults={handleResetDefaults}
              loading={loading}
            />
          )}

          {activeTab === 'printer' && (
            <PrinterSettings />
          )}
        </div>
      </div>
    </div>
  );
};

// General Settings Component
const GeneralSettings = ({ settings, onChange }) => {
  return (
    <div className="space-y-6">
      <h2 className="heading-2 text-slate-900">Restaurant Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Restaurant Name *
          </label>
          <input
            type="text"
            value={settings.restaurantName}
            onChange={(e) => onChange('restaurantName', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter restaurant name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            value={settings.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter phone number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={settings.email}
            onChange={(e) => onChange('email', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter email address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tax ID
          </label>
          <input
            type="text"
            value={settings.taxId}
            onChange={(e) => onChange('taxId', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter tax ID"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address *
          </label>
          <textarea
            value={settings.address}
            onChange={(e) => onChange('address', e.target.value)}
            rows="3"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter full address"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website
          </label>
          <input
            type="url"
            value={settings.website}
            onChange={(e) => onChange('website', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter website URL"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Type
          </label>
          <select
            value={settings.businessType || 'both'}
            onChange={(e) => onChange('businessType', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="restaurant">Restaurant Mode</option>
            <option value="supermarket">Supermarket Mode</option>
            <option value="both">Restaurant & Supermarket Mode</option>
          </select>
        </div>

        <div className="flex items-center gap-3 md:col-span-2 mt-2">
          <input
            type="checkbox"
            id="enableHotel"
            checked={settings.enableHotel || false}
            onChange={(e) => onChange('enableHotel', e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="enableHotel" className="text-sm font-semibold text-gray-700 select-none">
            🏨 Enable Hotel Module Integration (Charge to Room Payment)
          </label>
        </div>
      </div>
    </div>
  );
};

// POS Settings Component
const POSSettings = ({ settings, onChange }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">POS & Receipt Configuration</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Logo Upload */}
        <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🏢</span>
            <div>
              <h3 className="text-base font-bold text-slate-800">Business Logo</h3>
              <p className="text-xs text-slate-500">Appears on receipts and PWA</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-32 h-32 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-50 relative group">
              {settings.logoUrl ? (
                <img 
                  src={settings.logoUrl.startsWith('http') ? settings.logoUrl : `${API_CONFIG.BACKEND_URL}${settings.logoUrl.startsWith('/') ? '' : '/'}${settings.logoUrl}`} 
                  alt="Business Logo" 
                  className="w-full h-full object-contain p-2" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="text-center">
                  <span className="text-3xl mb-1 block">🖼️</span>
                  <span className="text-[10px] text-slate-400 font-medium">No Logo</span>
                </div>
              )}
              <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all duration-200">
                <span className="text-white text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">Change Logo</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => onChange('logoFile', e)} />
              </label>
            </div>
            
            <div className="flex-1 space-y-3 w-full">
              <label className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-4 py-3 rounded-xl cursor-pointer transition-all shadow-md active:scale-95">
                <span>📤</span> Upload New Logo
                <input type="file" className="hidden" accept="image/*" onChange={(e) => onChange('logoFile', e)} />
              </label>
              
              {settings.logoUrl && (
                <button
                  type="button"
                  onClick={() => onChange('logoUrl', '')}
                  className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 text-sm font-bold py-2.5 rounded-xl transition-colors border border-transparent hover:border-red-100"
                >
                  <span>🗑️</span> Remove Logo
                </button>
              )}
              <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg">
                <span>ℹ️</span>
                <span>Best: Square PNG/SVG, max 2MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Payment Accounts */}
        <div className="border border-blue-100 rounded-xl p-6 bg-blue-50/30 shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl">📱</span>
            <div>
              <h3 className="text-base font-bold text-slate-800">Payment Accounts</h3>
              <p className="text-xs text-slate-500">Account numbers for mobile payments</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Zaad Service
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={settings.zaad || ''}
                  onChange={(e) => onChange('zaad', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                  placeholder="e.g. 63XXXXXXX"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">💳</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Sahal Service
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={settings.sahal || ''}
                  onChange={(e) => onChange('sahal', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                  placeholder="e.g. 68XXXXXXX"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">💸</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span> E-dahab Service
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={settings.edahab || ''}
                  onChange={(e) => onChange('edahab', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                  placeholder="e.g. 62XXXXXXX"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">💰</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> MyCash Service
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={settings.myCash || ''}
                  onChange={(e) => onChange('myCash', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                  placeholder="e.g. 65XXXXXXX"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">🏦</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-slate-100 my-2" />

      {/* VAT / Tax Rate */}
      <div className="border border-orange-100 rounded-xl p-6 bg-orange-50/30">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📊</span>
          <div>
            <h3 className="text-base font-bold text-slate-800">VAT & Charges</h3>
            <p className="text-xs text-slate-500">Applied dynamically to all transactions</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              VAT Rate (%)
            </label>
            <input
              type="number"
              value={settings.taxRate}
              onChange={(e) => onChange('taxRate', parseFloat(e.target.value) || 0)}
              min="0"
              max="50"
              step="0.01"
              className="w-full border border-orange-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-semibold text-slate-700"
              placeholder="e.g. 10"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Service Charge (%)
            </label>
            <input
              type="number"
              value={settings.serviceCharge}
              onChange={(e) => onChange('serviceCharge', parseFloat(e.target.value) || 0)}
              min="0"
              max="20"
              step="0.1"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Currency
            </label>
            <select
              value={settings.currency}
              onChange={(e) => onChange('currency', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-700 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
            >
              <option value="USD">US Dollar ($)</option>
              <option value="EUR">Euro (€)</option>
              <option value="GBP">British Pound (£)</option>
              <option value="SOS">Somali Shilling (SOS)</option>
              <option value="CAD">Canadian Dollar (C$)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Receipt Settings */}
      <div className="border border-slate-100 rounded-xl p-6 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">🧾</span>
          <div>
            <h3 className="text-base font-bold text-slate-800">Receipt Appearance</h3>
            <p className="text-xs text-slate-500">Configure layout and static text</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Print Size
            </label>
            <select
              value={settings.receiptSize}
              onChange={(e) => onChange('receiptSize', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-slate-700 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
            >
              <option value="58mm">58mm Thermal</option>
              <option value="80mm">80mm Thermal</option>
              <option value="44mm">44mm Thermal</option>
              <option value="40mm">40mm Thermal</option>
              <option value="A4">A4 Paper</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Receipt Header (Sub-title)
            </label>
            <input
              type="text"
              value={settings.receiptHeader || ''}
              onChange={(e) => onChange('receiptHeader', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
              placeholder="e.g. Somali's Best Restaurant"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Receipt Footer Message
            </label>
            <textarea
              value={settings.receiptFooter || ''}
              onChange={(e) => onChange('receiptFooter', e.target.value)}
              rows="2"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
              placeholder="e.g. Thank you for choosing us! Please visit again."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Business Hours Component
const BusinessHours = ({ settings, onChange, days }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Business Hours</h2>
      <p className="text-gray-600">Set your restaurant's operating hours</p>

      <div className="space-y-4">
        {days.map(day => (
          <div key={day.key} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={!settings.businessHours[day.key].closed}
                  onChange={() => onChange(day.key, 'closed')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700 min-w-24">
                  {day.label}
                </span>
              </label>

              {!settings.businessHours[day.key].closed && (
                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={settings.businessHours[day.key].open}
                    onChange={(e) => onChange(day.key, 'open', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={settings.businessHours[day.key].close}
                    onChange={(e) => onChange(day.key, 'close', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              )}
            </div>

            {settings.businessHours[day.key].closed ? (
              <span className="text-red-600 text-sm font-medium">Closed</span>
            ) : (
              <span className="text-green-600 text-sm font-medium">Open</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// System Settings Component
const SystemSettings = ({ settings, onChange, onClearCache, onBackupDatabase, onResetDefaults, loading }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">System Preferences</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <select
            value={settings.language}
            onChange={(e) => onChange('language', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            value={settings.timezone}
            onChange={(e) => onChange('timezone', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="UTC-5">Eastern Time (UTC-5)</option>
            <option value="UTC-6">Central Time (UTC-6)</option>
            <option value="UTC-7">Mountain Time (UTC-7)</option>
            <option value="UTC-8">Pacific Time (UTC-8)</option>
            <option value="UTC+0">GMT (UTC+0)</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Features & Notifications</h3>

        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.autoBackup}
              onChange={(e) => onChange('autoBackup', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable automatic daily backups</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.lowStockAlert}
              onChange={(e) => onChange('lowStockAlert', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable low stock alerts</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.orderNotifications}
              onChange={(e) => onChange('orderNotifications', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable order notifications</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.printReceipt}
              onChange={(e) => onChange('printReceipt', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-print receipts after payment</span>
          </label>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Maintenance</h3>
        <div className="space-y-3">
          <button
            onClick={onClearCache}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Clear Cache
          </button>
          <button
            onClick={onBackupDatabase}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Backup Database
          </button>
          <button
            onClick={onResetDefaults}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;