// src/contexts/AuthContext.jsx - ONLINE ONLY
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { realApi } from '../api/realApi';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const initializedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initializeAuth = async () => {
      console.log('🔐 Initializing authentication...');

      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
          try {
            const userResponse = await realApi.getMe();
            if (userResponse.success) {
              const userData = realApi.extractData(userResponse);
              setUser(userData);
              setIsAuthenticated(true);
            } else {
              console.warn('Token rejected by server, clearing session');
              clearAuthData();
            }
          } catch (error) {
            console.warn('Auth check failed, clearing session');
            clearAuthData();
          }
        } else {
          clearAuthData();
        }
      } catch (error) {
        console.error('Auth Init Critical Error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();

    setUser(null);
    setIsAuthenticated(false);
  };

  const login = async (identifier, password) => {
    try {
      const result = await realApi.login(identifier, password);

      if (result.success) {
        const { token, user: userData } = result.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true, user: userData };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.warn('Login exception:', error);
      return { success: false, message: 'Connection to server failed. Please ensure you are online.' };
    }
  };

  const logout = async () => {
    try {
      await realApi.logout();
    } catch (e) {
      console.warn('Logout API failed', e);
    }
    clearAuthData();
    try {
      navigate('/login');
    } catch (err) { }
    return { success: true };
  };

  const switchToDemo = async (role = 'manager') => {
    const demoToken = `demo-${role}-${Date.now()}`;
    const demoUser = {
      _id: `demo-${role}`,
      name: `Demo ${role}`,
      role: role,
      isDemo: true,
      email: `${role}@demo.com`
    };

    localStorage.setItem('token', demoToken);
    localStorage.setItem('user', JSON.stringify(demoUser));
    setUser(demoUser);
    setIsAuthenticated(true);
    return { success: true };
  };

  useEffect(() => {
    const handler = (e) => {
      console.log('🔔 auth.logout event received, clearing auth and redirecting to login');
      clearAuthData();
      try {
        navigate('/login');
      } catch (err) { }
    };
    window.addEventListener('auth.logout', handler);
    return () => window.removeEventListener('auth.logout', handler);
  }, [navigate]);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    clearAuthData,
    switchToDemo
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
