import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor is configured but no native platform has been added yet.
 * When you are ready:
 *
 *   npm i @capacitor/android @capacitor/ios
 *   npm run build
 *   npx cap add android      # and/or: npx cap add ios
 *   npx cap sync
 *
 * `vite.config.ts` already sets `base: './'`, which is required — Capacitor
 * serves from capacitor://localhost where absolute asset paths do not resolve.
 */
const config: CapacitorConfig = {
  appId: 'com.wtfcake.circledefense',
  appName: 'Circle Defense',
  webDir: 'dist',

  android: {
    // Wave-defense play is continuous; letting the screen sleep mid-level is
    // the single most-reported bug in ports like this.
    backgroundColor: '#12161f',
  },

  ios: {
    backgroundColor: '#12161f',
    // Required for env(safe-area-inset-*) to report real values: the web view
    // must extend under the status bar rather than being inset by it.
    contentInset: 'never',
  },

  server: {
    androidScheme: 'https',
  },
};

export default config;
