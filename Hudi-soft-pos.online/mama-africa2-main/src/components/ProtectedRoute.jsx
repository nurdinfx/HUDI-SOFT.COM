// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Helper to determine role defaults if effectivePermissions is not yet attached
const getRolePermissionDefault = (role, permissionKey) => {
  const r = (role || 'cashier').toLowerCase();
  if (['admin', 'manager', 'accountant', 'owner'].includes(r)) {
    return true;
  }
  return false;
};

const ProtectedRoute = ({ children, requiredRoles = [], requiredPermission = null }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const hasLocalActivation = Boolean(
    localStorage.getItem('pos_license_key') || localStorage.getItem('pos_license_data')
  );

  // Check if system has been activated locally (ONLY for POS Online electron installer)
  const isElectron = navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
  if (isElectron && !hasLocalActivation) {
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

  // Check feature permission first if required
  if (requiredPermission && user) {
    const custom = user.permissions || {};
    let hasAccess = false;

    if (custom[requiredPermission] !== undefined && custom[requiredPermission] !== null) {
      hasAccess = Boolean(custom[requiredPermission]);
    } else if (user.effectivePermissions && user.effectivePermissions[requiredPermission] !== undefined) {
      hasAccess = Boolean(user.effectivePermissions[requiredPermission]);
    } else {
      hasAccess = getRolePermissionDefault(user.role, requiredPermission);
    }

    if (!hasAccess) {
      const pageTitle = requiredPermission === 'equityFinance' ? 'Equity & Financial Management' : 'AI Business Assistant';
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
              🔒
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You do not have permission to access <strong className="text-gray-900">{pageTitle}</strong>.
            </p>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500 mb-6">
              Your role is <strong className="capitalize text-gray-800">{user.role}</strong>. Please contact an authorized administrator to grant you access.
            </div>
            <a
              href="#/pos"
              className="inline-block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-md"
            >
              Return to POS
            </a>
          </div>
        </div>
      );
    }
  }

  // Check role permissions if required
  if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-md border border-red-100 max-w-sm">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">
            Your role: <strong className="capitalize">{user.role}</strong> | Required: <strong>{requiredRoles.join(', ')}</strong>
          </p>
          <a href="#/pos" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Return to POS</a>
        </div>
      </div>
    );
  }

  // User is authenticated and has required role and permission
  return children;
};

export default ProtectedRoute;
