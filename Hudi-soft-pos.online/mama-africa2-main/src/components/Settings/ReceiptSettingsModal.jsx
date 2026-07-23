import React, { useState, useEffect } from 'react';
import { realApi } from '../../api/realApi';
import { useAuth } from '../../contexts/AuthContext';

const ReceiptSettingsModal = ({ isOpen, onClose, onSaveSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({
    logoUrl: '',
    taxRate: 10,
    zaad: '',
    sahal: '',
    edahab: '',
    myCash: '',
    receiptHeader: '',
    receiptFooter: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await realApi.getSettings();
      if (response.success) {
        const data = realApi.extractData(response);
        setSettings({
          logoUrl: data.logoUrl || '',
          taxRate: data.taxRate ?? 10,
          zaad: data.zaad || '',
          sahal: data.sahal || '',
          edahab: data.edahab || '',
          myCash: data.myCash || '',
          receiptHeader: data.receiptHeader || '',
          receiptFooter: data.receiptFooter || ''
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load current settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
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
    try {
      const branchId = user?.branch?._id || user?.branch?.id;
      if (!branchId) throw new Error('Branch ID not found');

      const response = await realApi.settings.uploadBranchLogo(branchId, formData);
      if (response.success) {
        setSettings(prev => ({ ...prev, logoUrl: response.data.logo }));
      }
    } catch (err) {
      setError('Failed to upload logo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await realApi.updateSettings(settings);
      if (response.success) {
        if (onSaveSuccess) onSaveSuccess(settings);
        onClose();
      } else {
        throw new Error(response.message || 'Failed to save settings');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1e4c82] px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            ⚙️ Receipt & POS Settings
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">×</button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Logo Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Business Logo</h3>
            <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
              <div className="w-20 h-20 bg-white border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-[10px] text-gray-400 text-center px-1">No Logo</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors">
                  <span>📁 Upload New Logo</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
                <p className="text-[10px] text-gray-400">Recommended: Square PNG/JPG, max 2MB</p>
              </div>
            </div>
          </div>

          {/* VAT Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Taxation (VAT)</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 border border-orange-100 rounded-xl bg-orange-50/30">
                <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.taxRate}
                    onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. 10"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400">%</span>
                </div>
                <p className="mt-2 text-[11px] text-gray-500">This tax will be applied to all newly printed receipts.</p>
              </div>
            </div>
          </div>

          {/* Mobile Payments Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Mobile Payment Accounts</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">📱 Zaad</label>
                <input
                  type="text"
                  value={settings.zaad}
                  onChange={(e) => handleInputChange('zaad', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  placeholder="63XXXXXXX"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">📱 Sahal</label>
                <input
                  type="text"
                  value={settings.sahal}
                  onChange={(e) => handleInputChange('sahal', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  placeholder="68XXXXXXX"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">📱 E-dahab</label>
                <input
                  type="text"
                  value={settings.edahab}
                  onChange={(e) => handleInputChange('edahab', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  placeholder="62XXXXXXX"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">📱 MyCash</label>
                <input
                  type="text"
                  value={settings.myCash}
                  onChange={(e) => handleInputChange('myCash', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  placeholder="65XXXXXXX"
                />
              </div>
            </div>
          </div>

          {/* Receipt Text Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Receipt Text</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Header Text</label>
                <input
                  type="text"
                  value={settings.receiptHeader}
                  onChange={(e) => handleInputChange('receiptHeader', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  placeholder="Restaurant Name / Welcome Message"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Footer Text</label>
                <textarea
                  value={settings.receiptFooter}
                  onChange={(e) => handleInputChange('receiptFooter', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  placeholder="Thank you message"
                  rows="2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-8 py-2 bg-[#1e4c82] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-[#163a63] disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptSettingsModal;
