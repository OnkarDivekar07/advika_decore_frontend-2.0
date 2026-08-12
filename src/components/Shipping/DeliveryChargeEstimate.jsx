// src/components/Shipping/DeliveryChargeEstimate.jsx
//
// Shows the flat delivery-charge preview for a given subtotal — "Free
// delivery" once it clears the backend-configured threshold, otherwise the
// charge plus a nudge for how much more closes the gap. Pulls
// freeDeliveryThreshold/calculateDeliveryCharge from usePricing()
// (PricingContext.jsx) itself rather than taking them as props, so every
// caller is guaranteed to use the same backend-configured rule (see
// FREE_DELIVERY_THRESHOLD / DELIVERY_CHARGE in the backend's
// src/config/env.js) with no risk of a stale/hardcoded copy sneaking in at
// a call site.
//
// This is a PREVIEW only — see PricingContext.jsx's own note on that. A
// signed-in cart or draft/placed order always shows its own real
// subtotal/deliveryCharge/total straight from the backend (CartSummary.jsx,
// OrderSummaryCard.jsx) rather than this component, since that already-
// priced number always wins over a client-computed preview.
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiTruck } from 'react-icons/fi';
import { usePricing } from '@/contexts/PricingContext';

export default function DeliveryChargeEstimate({ subtotal, className }) {
  const { t } = useTranslation();
  const { freeDeliveryThreshold, calculateDeliveryCharge } = usePricing();

  const charge = calculateDeliveryCharge(subtotal);
  const isFree = charge === 0;
  const amountToFree = Math.max(freeDeliveryThreshold - subtotal, 0);

  return (
    <div
      className={`flex items-start gap-2 text-sm rounded-lg border border-[var(--clr-border)] bg-gray-50 px-3 py-2.5 ${className}`}
    >
      <FiTruck className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" aria-hidden />
      <div>
        {isFree ? (
          <p className="font-semibold text-green-600">
            {t('productDetail.freeDelivery', 'Free delivery')}
          </p>
        ) : (
          <>
            <p className="font-semibold text-gray-800">
              {t('productDetail.deliveryChargeAt', 'Delivery charge: ₹{{amount}}', {
                amount: charge,
              })}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t(
                'productDetail.freeDeliveryNudge',
                'Add ₹{{amount}} more to this item to get free delivery.',
                { amount: amountToFree.toFixed(2) }
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

DeliveryChargeEstimate.propTypes = {
  // The amount to price delivery against — e.g. price × selected quantity
  // on the product page. Deliberately not a claim about the eventual
  // cart-level charge once other items are added.
  subtotal: PropTypes.number.isRequired,
  className: PropTypes.string,
};

DeliveryChargeEstimate.defaultProps = {
  className: '',
};
