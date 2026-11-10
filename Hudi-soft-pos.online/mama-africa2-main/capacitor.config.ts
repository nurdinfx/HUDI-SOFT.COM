import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hudisoft.posonline',
  appName: 'Hudi Soft POS',
  webDir: 'dist',
  androidScheme: 'https',
  server: {
    allowNavigation: ['hudi-pos-online-aetz.onrender.com', 'hudi-soft-com-online-pos.onrender.com', '*.onrender.com']
  }
};

export default config;
