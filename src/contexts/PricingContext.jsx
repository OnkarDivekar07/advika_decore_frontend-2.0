// src/contexts/PricingContext.jsx
//
// Single place that knows the backend-configured delivery pricing rule
// (free-delivery threshold + flat delivery charge below it). Fetches it
// once, at app start, from GET /api/shipping/delivery-config — see
// shippingService.getDeliveryConfig — rather than every guest-cart preview
// / product page hardcoding its own copy of these two numbers. That's what
// makes a backend-side config change (an env var edit + restart on the
// backend — see the backend's src/config/env.js) show up on the frontend
// automatically, with no frontend deploy needed.
//
// This is deliberately only ever consulted for a PREVIEW — the product
// page, and an anonymous/guest cart with no backend cart yet to ask (see
// CartContext.jsx's `summary` useMemo). A signed-in cart or a draft/placed
// order already carries its own real subtotal/deliveryCharge/total straight
// off the backend response for that specific cart/order, which always wins
// over anything computed from this context — a cart-level number can
// differ from this generic preview (multiple items, a future promotion,
// etc.), and this context has no way to know that.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getDeliveryConfig } from '@/services/shippingService';
import {
  FREE_DELIVERY_THRESHOLD as DEFAULT_FREE_DELIVERY_THRESHOLD,
  DELIVERY_CHARGE as DEFAULT_DELIVERY_CHARGE,
} from '@/config/pricing';

const PricingContext = createContext(null);

export function PricingProvider({ children }) {
  // Starts on the static fallback (src/config/pricing.js) so every
  // consumer has an immediate, reasonable number to render — no loading
  // spinner needed for what's normally a near-instant background fetch.
  // Overwritten the moment the real backend config comes back.
  const [config, setConfig] = useState({
    freeDeliveryThreshold: DEFAULT_FREE_DELIVERY_THRESHOLD,
    deliveryCharge: DEFAULT_DELIVERY_CHARGE,
  });
  // True once a real backend response has been applied — lets a caller
  // that actually cares about the distinction (vs. just rendering
  // whatever's current) avoid treating the static fallback as confirmed.
  // Most consumers don't need this; the fallback is a fine placeholder for
  // the one request this takes.
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getDeliveryConfig()
      .then((data) => {
        if (cancelled) return;
        // Defensive: only adopt the response if it's actually shaped like
        // the config this expects — a malformed/unexpected backend
        // response should fall back to the static default rather than
        // silently propagate `NaN`/`undefined` into every price shown.
        if (
          typeof data?.freeDeliveryThreshold === 'number' &&
          typeof data?.deliveryCharge === 'number'
        ) {
          setConfig({
            freeDeliveryThreshold: data.freeDeliveryThreshold,
            deliveryCharge: data.deliveryCharge,
          });
        }
        setIsLoaded(true);
      })
      .catch(() => {
        // Best-effort — a failed fetch (offline, backend down) shouldn't
        // block anything from rendering; the static fallback set above
        // stands in. `isLoaded` deliberately stays false so a caller that
        // cares can tell the fetch never actually confirmed anything,
        // rather than this looking identical to a successful load that
        // happened to match the defaults.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const calculateDeliveryCharge = useCallback(
    (subtotal) => (subtotal >= config.freeDeliveryThreshold ? 0 : config.deliveryCharge),
    [config]
  );

  const value = useMemo(
    () => ({
      freeDeliveryThreshold: config.freeDeliveryThreshold,
      deliveryCharge: config.deliveryCharge,
      calculateDeliveryCharge,
      isLoaded,
    }),
    [config, calculateDeliveryCharge, isLoaded]
  );

  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- provider and hook are intentionally colocated
export function usePricing() {
  const ctx = useContext(PricingContext);
  if (!ctx) throw new Error('usePricing must be used within a PricingProvider');
  return ctx;
}
