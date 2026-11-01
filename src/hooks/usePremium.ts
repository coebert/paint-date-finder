import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Purchases, type PurchasesPackage, type CustomerInfo } from '@revenuecat/purchases-capacitor';

/** RevenueCat public iOS SDK key (safe to ship in the app). Fill in once the RevenueCat project exists. */
export const REVENUECAT_IOS_KEY = '';
/** Entitlement identifier configured in RevenueCat. */
export const PREMIUM_ENTITLEMENT = 'premium';

let configured: Promise<void> | null = null;
function ensureConfigured() {
  if (!configured) configured = Purchases.configure({ apiKey: REVENUECAT_IOS_KEY }).then(() => undefined);
  return configured;
}

const hasPremium = (info: CustomerInfo) => !!info.entitlements.active[PREMIUM_ENTITLEMENT];

/**
 * Premium status. On the website everything is free, so `isPremium` is always true there;
 * premium extras are only locked inside the iPhone app until purchased.
 */
export function usePremium() {
  const native = Capacitor.isNativePlatform();
  const storeReady = native && !!REVENUECAT_IOS_KEY;
  const [isPremium, setIsPremium] = useState(!native);
  const [loading, setLoading] = useState(storeReady);
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    if (!storeReady) return;
    let alive = true;
    (async () => {
      try {
        await ensureConfigured();
        const { customerInfo } = await Purchases.getCustomerInfo();
        const offerings = await Purchases.getOfferings();
        if (!alive) return;
        setIsPremium(hasPremium(customerInfo));
        setPkg(offerings.current?.availablePackages[0] ?? null);
      } catch {
        /* store unavailable — stay locked */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [storeReady]);

  const purchase = useCallback(async () => {
    if (!pkg) throw new Error('Not available yet');
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const ok = hasPremium(customerInfo);
    setIsPremium(ok);
    return ok;
  }, [pkg]);

  const restore = useCallback(async () => {
    await ensureConfigured();
    const { customerInfo } = await Purchases.restorePurchases();
    const ok = hasPremium(customerInfo);
    setIsPremium(ok);
    return ok;
  }, []);

  return { isPremium, loading, price: pkg?.product.priceString ?? null, storeReady, purchase, restore };
}
