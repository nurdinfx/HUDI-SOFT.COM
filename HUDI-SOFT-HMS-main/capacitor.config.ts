import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hudisoft.hms',
  appName: 'HUDI SOFT HMS',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'hudi-soft-hms.onrender.com',
      'hudi-soft-com.onrender.com',
      '*.onrender.com',
      'hudisoft.online',
      'localhost',
    ],
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
