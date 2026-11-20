import {
  AdMob,
  BannerAdOptions,
  BannerAdSize,
  BannerAdPosition,
  BannerAdPluginEvents,
} from '@capacitor-community/admob';
import type { AdMobError } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export async function registerBannerAdListeners(
  onLoaded: () => void,
  onFailedToLoad: (error: AdMobError) => void,
): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};

  const loadedListener = await AdMob.addListener(BannerAdPluginEvents.Loaded, onLoaded);
  try {
    const failedListener = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, onFailedToLoad);
    return () => {
      void loadedListener.remove();
      void failedListener.remove();
    };
  } catch (error) {
    await loadedListener.remove();
    throw error;
  }
}

export async function initializeAdMob() {
  if (!Capacitor.isNativePlatform()) return;

  await AdMob.initialize({
    initializeForTesting: true,
  });
}

export async function showBottomBanner() {
  if (!Capacitor.isNativePlatform()) return;

  const options: BannerAdOptions = {
    adId: 'ca-app-pub-3940256099942544/6300978111',
    adSize: BannerAdSize.BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 16,
    isTesting: true,
  };

  await AdMob.showBanner(options);
}

export async function hideBottomBanner() {
  if (!Capacitor.isNativePlatform()) return;
  await AdMob.hideBanner();
}