import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thiomatch.revela',
  appName: 'Revela',
  webDir: 'dist',
  server: {
    url: 'https://revela-a7d4.vercel.app',
    cleartext: true
  }
};

export default config;