import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.norva.app',
  appName: 'NORVA',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
