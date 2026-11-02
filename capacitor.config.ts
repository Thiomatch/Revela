import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thiomatch.revela',
  appName: 'Revela',
  webDir: 'dist',
  server: {
    url: 'https://revela-nine.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;