// src/pages/Review/ReviewPage.jsx
//
// /checkout/review (see AppRoutes.jsx) — the required middle step between
// picking an address and paying. Shows the address that will be delivered
// to and the ONE authoritative rendering of the draft order's items/totals
// (OrderSummaryCard), exactly what the backend priced — no shipping-method
// choice here or anywhere else in checkout; delivery is handled entirely
// by the delivery API behind the draft order's `deliveryCharge`
// (checkout-architecture.md §2).
//
// Route guard: this step needs a selected address with a *ready* draft
// order (canProceedToReview). Without that there's nothing to review, so a
// direct/typed visit, a refresh that lands here before restore has run, or
// someone who deleted their only address from another tab all get sent
// back to /checkout rather than rendering a blank review. "Proceed to
// Payment" is the only place reviewConfirmed is ever set — that's what
// stops /checkout/payment itself from being reachable by skipping this
// step (see CheckoutContext's confirmReview and PaymentPage's own guard).
import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiEdit2, FiArrowLeft, FiTruck } from 'react-icons/fi';
import Spinner from '@/components/Shared/Spinner';
import { useCheckout } from '@/contexts/CheckoutContext';
import OrderSummaryCard from '@/components/Checkout/OrderSummaryCard';
import OrderConflictsNotice from '@/components/Checkout/OrderConflictsNotice';
import ServiceabilityMessage from '@/components/Shipping/ServiceabilityMessage';
import { formatDeliveryDate } from '@/utils/formatDeliveryDate';
import { useServiceabilityCheck } from '@/features/shipping/hooks/useServiceabilityCheck';

// Mirrors shipping.service.js's own DEFAULT_ITEM_WEIGHT_KG fallback — the
// Product model doesn't carry a real weight field yet on either side, so
// this is only ever a best-effort echo of the same constant the backend
// already applies when a weight is missing, never a second source of
// truth for pricing/eligibility. Its only real job here is giving the
// serviceability recheck below a number that moves whenever the draft
// order's item quantities do.
const FALLBACK_ITEM_WEIGHT_KG = 0.5;

export default function ReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    addresses,
    selectedAddressId,
    draftOrder,
    isRestoring,
    canProceedToReview,
    confirmReview,
    conflicts,
    refreshDraftOrder,
    goToStep,
  } = useCheckout();

  const [isRefreshingOrder, setIsRefreshingOrder] = React.useState(false);

  // Keeps the persisted "current step" hint (see checkoutStorage.js) in
  // sync whenever this step is actually the one on screen.
  useEffect(() => {
    goToStep('review');
  }, [goToStep]);

  // Nothing safe to review yet (no address picked / draft not ready) —
  // wait for a saved-selection restore to settle before deciding that,
  // otherwise a refresh landing directly on this route would bounce back
  // to /checkout even though restore was about to fill everything in.
  useEffect(() => {
    if (isRestoring) return;
    if (!canProceedToReview) {
      navigate('/checkout', { replace: true });
    }
  }, [isRestoring, canProceedToReview, navigate]);

  // Re-syncs with the backend's authoritative draft the moment this screen
  // is actually shown, rather than trusting whatever draftOrder happened to
  // already be sitting in CheckoutContext. That cached value is only ever
  // as fresh as the last time *something* (address selection, an earlier
  // visit's restore, a conflict refresh) fetched it — arriving here via
  // browser Back from Payment, a tab that's been sitting open, or a resumed
  // session all skip that, so without this the review screen could show
  // products/quantities/prices/subtotal/delivery/discount/total that no
  // longer match what the backend would actually charge. refreshDraftOrder
  // is a safe/idempotent upsert (see CheckoutContext), so re-running it here
  // never creates a duplicate draft or double-charges anything — it just
  // re-derives the same order from live cart/address/product data.
  useEffect(() => {
    if (isRestoring || !selectedAddressId) return;
    refreshDraftOrder(selectedAddressId);
    // Deliberately only keyed on the address — a couponCode isn't part of
    // this screen's own state, and re-running this for every draftOrder/
    // draftStatus change it itself causes would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestoring, selectedAddressId]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  // Cart-derived recheck inputs — recomputed from the live draft order
  // (itself already re-synced on arrival here and by "Refresh order"
  // above) any time its items change, so a quantity change picked up mid-
  // checkout (e.g. a stale draft re-synced back to a changed cart) also
  // invalidates and re-runs the shipping check below, not just an address
  // edit. `itemsSignature` is the reliable trigger — it changes on *any*
  // item/quantity edit, including the rare case where a total-weight-based
  // number alone wouldn't (e.g. two lines swapping quantities); weightKg
  // is the actual value forwarded to the backend alongside it.
  const orderItems = useMemo(() => draftOrder?.orderItems ?? [], [draftOrder?.orderItems]);
  const itemsSignature = useMemo(
    () =>
      orderItems
        .map((item) => `${item.productId ?? item.product?.id ?? item.id}:${item.quantity}`)
        .sort()
        .join('|'),
    [orderItems]
  );
  const cartWeightKg = useMemo(
    () => orderItems.reduce((sum, item) => sum + FALLBACK_ITEM_WEIGHT_KG * (item.quantity || 0), 0),
    [orderItems]
  );

  // This is the one shipping check in checkout that's actually load-
  // bearing rather than purely informational (contrast AddressForm's own
  // use of the same hook): the backend's own order-placement gate
  // (order.service.js's detectAddressConflict -> shippingService.
  // checkDeliveryEligibility) runs this exact same check server-side
  // right before COD confirmation / Razorpay order creation and blocks a
  // definitively unserviceable address there — so surfacing "still
  // checking" / "couldn't check, retry" / "not deliverable" here, before
  // the customer ever reaches Payment, avoids sending them forward only
  // to be bounced back by that same rule a step later. debounceMs: 0 since
  // the pincode here is already a saved, validated address, not
  // free-typed input like AddressForm's; subtotal/weightKg/recalcKey tie
  // this to the live draft order so cart changes invalidate it exactly
  // like a pincode/address change would (see useServiceabilityCheck.js).
  const {
    status: shippingStatus,
    data: deliveryEstimate,
    retry: retryShippingCheck,
  } = useServiceabilityCheck(selectedAddress?.pincode, {
    debounceMs: 0,
    enabled: !!selectedAddress?.pincode,
    weightKg: cartWeightKg || undefined,
    subtotal: typeof draftOrder?.subtotal === 'number' ? draftOrder.subtotal : undefined,
    recalcKey: itemsSignature,
  });

  // Definitive negative — the backend would reject this exact address the
  // same way at placement time (see the comment above), so there's
  // nothing a retry against the *same* address/cart would change; the fix
  // is picking a different address, not re-asking Ekart the same
  // question.
  const shippingUnserviceable = shippingStatus === 'ready' && deliveryEstimate?.serviceable === false;
  // The check is either still running or couldn't get an answer at all —
  // both are "we don't yet know if this is deliverable" rather than a
  // confirmed no, so Payment stays blocked until it resolves (or the
  // customer retries) rather than letting a silent gap through.
  const shippingCheckPending = shippingStatus === 'checking';
  const shippingCheckFailed = shippingStatus === 'error';
  const shippingBlocksProceed = shippingCheckPending || shippingCheckFailed || shippingUnserviceable;

  const handleRefreshOrder = async () => {
    if (!selectedAddressId) return;
    setIsRefreshingOrder(true);
    try {
      await refreshDraftOrder(selectedAddressId);
    } finally {
      setIsRefreshingOrder(false);
    }
  };

  const handleProceed = () => {
    if (!canProceedToReview) return;
    confirmReview();
    navigate('/checkout/payment');
  };

  // Full-page spinner only when there's genuinely nothing to show yet
  // (first arrival, still restoring). Once a draft order exists, the
  // background re-sync effect above (and the manual "Refresh order" flow)
  // both flip draftStatus back to 'loading' while they run — blocking on
  // that too would blank out an already-rendered review on every single
  // visit to this screen, which defeats the point of quietly keeping it
  // current. Any conflicts the re-sync turns up still surface via
  // OrderConflictsNotice below.
  if (isRestoring || !draftOrder) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Spinner size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {conflicts && (
        <OrderConflictsNotice
          conflicts={conflicts}
          onRefresh={handleRefreshOrder}
          isRefreshing={isRefreshingOrder}
        />
      )}

      {/* Address recap — the only place in this step the address can be
          changed; going "Change" here drops back to the address step and
          (via selectAddress) resets reviewConfirmed, so a new address
          always has to be reviewed again before payment. */}
      <section className="card p-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-1">
            {t('checkout.deliverTo', 'Deliver to')}
          </h2>
          {selectedAddress ? (
            <>
              <p className="font-semibold text-gray-900">{selectedAddress.name}</p>
              <p className="text-sm text-gray-600">
                {selectedAddress.houseArea}, {selectedAddress.city}, {selectedAddress.state} —{' '}
                {selectedAddress.pincode}
              </p>
              {/* Serviceable + something to say about timing: the normal,
                  happy-path case, unchanged from before. */}
              {(() => {
                if (!(shippingStatus === 'ready' && deliveryEstimate?.serviceable)) return null;
                const formattedDate = formatDeliveryDate(deliveryEstimate.estimatedDeliveryDate);
                const label = formattedDate
                  ? t('checkout.estimatedDeliveryByDate', 'Estimated delivery by {{date}}', {
                      date: formattedDate,
                    })
                  : deliveryEstimate.estimatedDays
                    ? t('checkout.deliversIn', 'Delivers in ~{{days}} days', {
                        days: deliveryEstimate.estimatedDays,
                      })
                    : null;
                if (!label) return null;
                return (
                  <p className="text-sm text-[var(--clr-primary-dark)] mt-1.5 flex items-center gap-1.5">
                    <FiTruck className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    {label}
                  </p>
                );
              })()}
              {/* Checking / failed / definitively unserviceable — unlike
                  the happy path above, these are exactly the states that
                  hold "Proceed to Payment" back (see shippingBlocksProceed
                  below), so they always get a visible, worded status
                  rather than silently disabling the button. The error
                  branch carries the one real backend retry action in this
                  step — re-asks the same check, doesn't just clear the
                  local error and hope. */}
              {shippingCheckPending && (
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                  <Spinner size={12} />
                  {t('checkout.checkingServiceability', 'Checking delivery availability…')}
                </p>
              )}
              {(shippingCheckFailed || shippingUnserviceable) && (
                <ServiceabilityMessage
                  status={shippingStatus}
                  data={deliveryEstimate}
                  onRetry={shippingCheckFailed ? retryShippingCheck : undefined}
                  isRetrying={shippingCheckPending}
                  className="mt-1.5"
                />
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">{t('checkout.addressOnFile', 'Address on file')}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate('/checkout')}
          className="flex items-center gap-1 text-sm font-medium text-primary shrink-0"
        >
          <FiEdit2 className="w-4 h-4" aria-hidden />
          {t('checkout.change', 'Change')}
        </button>
      </section>

      {/* Order review — the ONE authoritative rendering of the draft
          order's items/totals; see OrderSummaryCard.jsx. Deliberately no
          shipping-method control here — delivery charge is already baked
          into this total by the backend's delivery API. */}
      <OrderSummaryCard order={draftOrder} title={t('checkout.reviewOrder', 'Review your order')} />

      {/* Why the button below is disabled, when it's the shipping check
          rather than canProceedToReview/conflicts holding it back —
          those two already explain themselves elsewhere (the spinner
          screen above, and OrderConflictsNotice). Unserviceable points
          at the fix (a different address) rather than a retry, matching
          the ServiceabilityMessage shown in the address card above. */}
      {canProceedToReview && shippingUnserviceable && (
        <p className="text-xs text-amber-600 text-center sm:text-right">
          {t(
            'checkout.cannotProceedUnserviceable',
            "We can't confirm delivery to this address. Choose a different address to continue."
          )}
        </p>
      )}

      {/* Back / Proceed — pinned to the bottom of the viewport on mobile
          so the primary CTA is always reachable without scrolling past
          the full order summary above (see AddressSelectionPage for the
          same pattern used on the previous step). */}
      <div className="pb-24 sm:pb-0" />
      <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-[var(--clr-border)] px-4 py-3 pb-safe flex flex-col gap-2 sm:static sm:inset-auto sm:z-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:px-0 sm:py-0 sm:flex-row sm:mt-4">
        <button
          type="button"
          onClick={() => navigate('/checkout')}
          className="btn btn-outline sm:w-auto px-6 py-3 flex items-center justify-center gap-2 order-2 sm:order-1"
        >
          <FiArrowLeft className="w-4 h-4" aria-hidden />
          {t('checkout.back', 'Back')}
        </button>
        <button
          type="button"
          onClick={handleProceed}
          disabled={!canProceedToReview || !!conflicts || shippingBlocksProceed}
          className="btn btn-primary flex-1 py-3 disabled:opacity-60 disabled:cursor-not-allowed order-1 sm:order-2"
        >
          {shippingCheckPending
            ? t('checkout.checkingServiceability', 'Checking delivery availability…')
            : t('checkout.proceedToPayment', 'Proceed to Payment')}
        </button>
      </div>
    </div>
  );
}
