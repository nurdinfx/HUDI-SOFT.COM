// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();

  // Check if system has been activated locally (ONLY for POS Online electron installer)
  const isElectron = navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
  if (isElectron && !localStorage.getItem('pos_license_key')) {
    console.log('🔒 Desktop App not activated, redirecting to activation page');
    return <Navigate to="/activate" replace />;
  }

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <p className="text-gray-500 font-medium">Checking authentication...</p>
      </div>
    );
  }

  // FIXED: Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('🔒 Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check role permissions if required
  if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-1">
            Your role: <strong>{user.role}</strong> | Required: <strong>{requiredRoles.join(', ')}</strong>
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated and has required role
  console.log('✅ Access granted for role:', user?.role);
  return children;
};

export default ProtectedRoute;
