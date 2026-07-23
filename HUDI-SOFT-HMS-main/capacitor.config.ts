import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.hudisoft.hms',
  appName: 'HUDI-SOFT HMS',
  /**
   * webDir points to the Next.js static export folder.
   * The entire /out folder is bundled INTO the APK — no internet needed to load the UI.
   * API calls to the backend still require network.
   */
  webDir: 'out',
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e40af',
    },
  },
};

export default config;
