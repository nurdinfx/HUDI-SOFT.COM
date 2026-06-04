import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { Settings as SettingsIcon, Save, Upload, Globe, Phone, Mail, MapPin, CreditCard, Landmark } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/v1/tenant/settings';

const Settings = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    settings: {
      currency: 'USD',
      taxRate: 0,
      zaadAccount: '',
      sahalAccount: '',
      edahabAccount: '',
      mycashAccount: '',
      pharmacyZaad: '',
      pharmacySahal: '',
      pharmacyEdahab: '',
      pharmacyMycash: ''
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      const response = await axios.get(API_URL, config);
      if (response.data.success) {
        const data = response.data.data;
        setFormData({
          name: data.name || '',
          logo: data.logo || '',
          tagline: data.tagline || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          settings: {
            currency: data.settings?.currency || 'USD',
            taxRate: data.settings?.taxRate || 0,
            zaadAccount: data.settings?.zaadAccount || '',
            sahalAccount: data.settings?.sahalAccount || '',
            edahabAccount: data.settings?.edahabAccount || '',
            mycashAccount: data.settings?.mycashAccount || '',
            pharmacyZaad: data.settings?.pharmacyZaad || '',
            pharmacySahal: data.settings?.pharmacySahal || '',
            pharmacyEdahab: data.settings?.pharmacyEdahab || '',
            pharmacyMycash: data.settings?.pharmacyMycash || ''
          }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('settings.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      const response = await axios.put(API_URL, formData, config);
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-teal-600" />
          Hospital Settings
        </h1>
        <p className="text-slate-500 font-medium">Manage hospital information and preferences</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Logo Upload */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-8 self-start">Hospital Logo</h3>
            
            <div className="relative group mb-6">
              <div className="w-48 h-48 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-teal-400">
                {formData.logo ? (
                  <img src={formData.logo} alt="Hospital Logo" className="w-full h-full object-contain" />
                ) : (
                  <Upload className="w-12 h-12 text-slate-300" />
                )}
              </div>
              <button 
                type="button"
                className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-2xl"
              >
                <span className="bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-bold">Change Logo</span>
              </button>
            </div>
            
            <button 
              type="button" 
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              Choose Logo
            </button>
            <p className="mt-4 text-[10px] text-slate-400 font-medium">Recommended: Square PNG/JPG, Max 2MB</p>
          </div>
        </div>

        {/* Right Column - General Info */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-8">General Information</h3>
            
            <div className="space-y-6">
              {/* Hospital Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hospital Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                  placeholder="Enter hospital name"
                />
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tagline</label>
                <input 
                  type="text" 
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                  placeholder="e.g. Care with Excellence"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                    placeholder="Physical address"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                      placeholder="Email address"
                    />
                  </div>
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Website</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* Currency & Tax Rate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Currency</label>
                  <select 
                    name="settings.currency"
                    value={formData.settings.currency}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                  >
                    <option value="USD">USD</option>
                    <option value="SOS">SOS</option>
                    <option value="SLS">SLS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tax Rate (%)</label>
                  <input 
                    type="number" 
                    name="settings.taxRate"
                    value={formData.settings.taxRate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                    placeholder="10"
                  />
                </div>
              </div>

              {/* Hospital Mobile Accounts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">ZAAD Account</label>
                  <input 
                    type="text" 
                    name="settings.zaadAccount"
                    value={formData.settings.zaadAccount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                    placeholder="ZAAD Number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">SAHAL Account</label>
                  <input 
                    type="text" 
                    name="settings.sahalAccount"
                    value={formData.settings.sahalAccount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                    placeholder="SAHAL Number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">EDAHAB Account</label>
                  <input 
                    type="text" 
                    name="settings.edahabAccount"
                    value={formData.settings.edahabAccount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                    placeholder="EDAHAB Number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">MYCASH Account</label>
                  <input 
                    type="text" 
                    name="settings.mycashAccount"
                    value={formData.settings.mycashAccount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                    placeholder="MYCASH Number"
                  />
                </div>
              </div>

              {/* Pharmacy Accounts Section */}
              <div className="pt-8 border-t border-slate-100">
                <h3 className="text-sm font-bold text-teal-600 uppercase tracking-widest mb-8">Pharmacy Accounts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pharmacy ZAAD</label>
                    <input 
                      type="text" 
                      name="settings.pharmacyZaad"
                      value={formData.settings.pharmacyZaad}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                      placeholder="Pharmacy ZAAD"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pharmacy SAHAL</label>
                    <input 
                      type="text" 
                      name="settings.pharmacySahal"
                      value={formData.settings.pharmacySahal}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                      placeholder="Pharmacy SAHAL"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pharmacy EDAHAB</label>
                    <input 
                      type="text" 
                      name="settings.pharmacyEdahab"
                      value={formData.settings.pharmacyEdahab}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                      placeholder="Pharmacy EDAHAB"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pharmacy MYCASH</label>
                    <input 
                      type="text" 
                      name="settings.pharmacyMycash"
                      value={formData.settings.pharmacyMycash}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                      placeholder="Pharmacy MYCASH Number"
                    />
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
              {success && <div className="p-4 bg-teal-50 text-teal-600 rounded-xl text-sm font-bold border border-teal-100">Settings updated successfully!</div>}

              {/* Save Button */}
              <div className="pt-8">
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-10 py-4 bg-teal-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-teal-700 transition-all shadow-xl shadow-teal-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
