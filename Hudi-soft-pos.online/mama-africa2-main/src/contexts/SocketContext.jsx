// src/contexts/SocketContext.jsx
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_CONFIG } from '../config/api.config';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    // Fallback for components outside SocketProvider
    return { socket: null, isConnected: false, emit: () => {}, on: () => () => {} };
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef({});

  useEffect(() => {
    // Initialize real socket connection
    const socket = io(API_CONFIG.SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 20000,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setIsConnected(true);

      // Re-join rooms on reconnect
      const user = (() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
      })();
      const branchId = user?.branch?._id || user?.branch?.id;
      if (branchId) {
        socket.emit('join-branch', branchId);
        if (user?.role === 'chef' || user?.role === 'admin' || user?.role === 'manager') {
          socket.emit('join-kitchen', branchId);
        }
        if (user?.role === 'cashier' || user?.role === 'admin' || user?.role === 'manager') {
          socket.emit('join-pos', branchId);
        }
        if (user?.role === 'waiter' || user?.role === 'admin' || user?.role === 'manager') {
          socket.emit('join-waiter', branchId);
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Socket connection error:', err.message);
      setIsConnected(false);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn(`⚠️ Socket not connected — could not emit '${event}'`);
    return false;
  }, []);

  const on = useCallback((event, callback) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, []);

  const off = useCallback((event, callback) => {
    socketRef.current?.off(event, callback);
  }, []);

  const joinRoom = useCallback((room, branchId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(room, branchId);
    }
  }, []);

  const value = {
    socket: socketRef.current,
    isConnected,
    emit,
    on,
    off,
    joinRoom,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
