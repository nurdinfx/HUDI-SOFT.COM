import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { realApi } from '../api/realApi';
import { ShieldAlert } from 'lucide-react';

const HotelRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Retrieve settings cache or fetch from API
        let settings = null;
        const cached = localStorage.getItem('pos_settings');
        if (cached) {
          settings = JSON.parse(cached);
        } else {
          const res = await realApi.getSettings();
          if (res.success) {
            settings = realApi.extractData(res);
          }
        }

        if (settings) {
          const hasHotel = settings.enableHotel === true || settings.businessType === 'both';
          setIsAllowed(hasHotel);
        }
      } catch (err) {
        console.error('Hotel route check failed', err);
      } finally {
        setLoading(false);
      }
    };
    checkAccess();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-gray-50 p-6 text-center">
        <div className="bg-red-50 p-4 rounded-full text-red-600 mb-4">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 max-w-md mb-6">
          The Hotel Management Module is not active for this organization. Please update your subscription settings or select a Hotel-compatible business mode to unlock access.
        </p>
      </div>
    );
  }

  return children;
};

export default HotelRoute;
