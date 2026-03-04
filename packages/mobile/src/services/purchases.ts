/**
 * RevenueCat Purchases Service
 *
 * Manages subscription purchases via RevenueCat SDK.
 * Handles iOS App Store and Google Play Store subscriptions.
 */

import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

let isInitialized = false;

/**
 * Initialize RevenueCat SDK.
 * Call once at app startup.
 */
export async function initPurchases(userId?: string): Promise<void> {
  if (isInitialized) return;

  const apiKey = Platform.OS === 'ios'
    ? Constants.expoConfig?.extra?.revenueCatApiKeyIos
    : Constants.expoConfig?.extra?.revenueCatApiKeyAndroid;

  if (!apiKey || apiKey.includes('xxx')) {
    console.log('[Purchases] RevenueCat API key not configured, skipping init');
    return;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    Purchases.configure({ apiKey, appUserID: userId });
    isInitialized = true;
    console.log('[Purchases] RevenueCat initialized');
  } catch (error) {
    console.error('[Purchases] Init failed:', error);
  }
}

/**
 * Get available subscription packages.
 */
export async function getPackages(): Promise<PurchasesPackage[]> {
  if (!isInitialized) return [];

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages || [];
  } catch (error) {
    console.error('[Purchases] Failed to get offerings:', error);
    return [];
  }
}

/**
 * Purchase a subscription package.
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  if (!isInitialized) {
    return { success: false, error: 'Purchases not initialized' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (error: unknown) {
    const err = error as { userCancelled?: boolean; message?: string };
    if (err.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: err.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases.
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  if (!isInitialized) {
    return { success: false, error: 'Purchases not initialized' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: true, customerInfo };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Get current customer subscription info.
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isInitialized) return null;

  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

/**
 * Check if user has active Pro or Premium subscription.
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const info = await getCustomerInfo();
  if (!info) return false;

  return (
    Object.keys(info.entitlements.active).length > 0
  );
}
