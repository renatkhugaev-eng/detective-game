import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.detective.game',
  appName: 'Detective Game',
  webDir: 'dist',
  ios: {
    // Только горизонтальная ориентация
    preferredContentMode: 'mobile',
    allowsLinkPreview: false
  },
  android: {
    // Только горизонтальная ориентация  
    allowMixedContent: true
  }
};

export default config;
