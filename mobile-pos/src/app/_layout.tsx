import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from '@/db/database';
import { useAuthStore } from '@/store/authStore';
import { usePrinterStore } from '@/store/printerStore';
import { useSyncStore } from '@/store/syncStore';
import { SyncManager } from '@/sync/SyncManager';
import { COLORS } from '@/constants';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { licenseValid, token, isLoading, initialize } = useAuthStore();
  const initPrinter = usePrinterStore((state) => state.initialize);
  const initSync = useSyncStore((state) => state.initialize);

  // ─── Initialize stores & DB ─────────────────────────────────────────────────
  useEffect(() => {
    // 1. Initialize SQLite Database tables
    try {
      initDatabase();
      console.log('Local database initialized successfully');
    } catch (err) {
      console.error('Database initialization failed:', err);
    }

    // 2. Initialize Zustand stores
    initialize();
    initPrinter();
    initSync();
  }, []);

  // ─── Route redirection logic based on auth state ──────────────────────────────
  useEffect(() => {
    if (isLoading) return;

    const inAppGroup = segments[0] === '(app)';

    if (!licenseValid) {
      // 1. No license activated -> redirect to activation screen
      if (segments[0] !== 'activation') {
        router.replace('/activation');
      }
    } else if (!token) {
      // 2. License valid, but not logged in -> redirect to login screen
      if (segments[0] !== 'login') {
        router.replace('/login');
      }
    } else {
      // 3. Fully authenticated -> redirect to app dashboard
      if (!inAppGroup) {
        // SyncManager starts real-time sync when user is fully authenticated
        SyncManager.init();
        router.replace('/(app)');
      }
    }
  }, [licenseValid, token, isLoading, segments]);

  // Clean up WebSockets on app unmount
  useEffect(() => {
    return () => {
      SyncManager.destroy();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <Slot />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
