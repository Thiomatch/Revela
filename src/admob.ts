import {
  AdMob,
  BannerAdOptions,
  BannerAdSize,
  BannerAdPosition,
  BannerAdPluginEvents,
} from '@capacitor-community/admob';
import type { AdMobError } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

const USE_TEST_ADS = true;
const TEST_BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';
const PRODUCTION_BANNER_AD_UNIT_ID = '';

function getBannerAdUnitId() {
  if (USE_TEST_ADS) return TEST_BANNER_AD_UNIT_ID;
  if (!PRODUCTION_BANNER_AD_UNIT_ID) {
    throw new Error('Set PRODUCTION_BANNER_AD_UNIT_ID before disabling test ads.');
  }
  return PRODUCTION_BANNER_AD_UNIT_ID;
}

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
    initializeForTesting: USE_TEST_ADS,
  });
}

export async function showBottomBanner() {
  if (!Capacitor.isNativePlatform()) return;

  const options: BannerAdOptions = {
    adId: getBannerAdUnitId(),
    adSize: BannerAdSize.BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 16,
    isTesting: USE_TEST_ADS,
  };

  await AdMob.showBanner(options);
}

export async function hideBottomBanner() {
  if (!Capacitor.isNativePlatform()) return;
  await AdMob.hideBanner();
}