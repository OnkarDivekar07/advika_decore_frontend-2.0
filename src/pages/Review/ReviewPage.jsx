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
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiEdit2, FiArrowLeft } from 'react-icons/fi';
import Spinner from '@/components/Shared/Spinner';
import { useCheckout } from '@/contexts/CheckoutContext';
import OrderSummaryCard from '@/components/Checkout/OrderSummaryCard';
import OrderConflictsNotice from '@/components/Checkout/OrderConflictsNotice';

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

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => navigate('/checkout')}
          className="btn btn-outline sm:w-auto px-6 py-3 flex items-center justify-center gap-2"
        >
          <FiArrowLeft className="w-4 h-4" aria-hidden />
          {t('checkout.back', 'Back')}
        </button>
        <button
          type="button"
          onClick={handleProceed}
          disabled={!canProceedToReview || !!conflicts}
          className="btn btn-primary flex-1 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {t('checkout.proceedToPayment', 'Proceed to Payment')}
        </button>
      </div>
    </div>
  );
}
