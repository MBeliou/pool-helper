import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'pool-helper',
  webDir: 'build',
  server: {
    url: "http://192.168.1.15:5001"
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase'
    }
  }
};

export default config;
