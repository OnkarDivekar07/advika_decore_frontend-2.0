// src/components/Checkout/PaymentStatusNotice.jsx
//
// Persistent banner shown on PaymentPage after a definite online-payment
// attempt that didn't end in success — see PaymentPage.jsx's
// handlePlaceOrder and paymentService.openRazorpayCheckout's
// RazorpayCheckoutError. Two variants, both UI-only (no money moved
// either way, and the draft order underneath is untouched — see
// payment.controller.js's createOrderid reuse-or-reconcile logic, which
// safely reuses the same Razorpay order id on the next attempt):
//
//  - 'failed'    Razorpay itself reported the attempt failed (card
//                declined, UPI rejected, etc. — reason: 'gateway_failed').
//                Something went wrong; styled as an actual alert.
//  - 'cancelled' The customer closed the checkout modal themselves before
//                attempting anything (reason: 'cancelled'). Nothing went
//                wrong — styled neutrally rather than as an error, so it
//                doesn't read as if something broke or as though they did
//                something wrong.
//
// Deliberately never shown for the reconciliation-in-progress case
// (ambiguous network/tab-close failures) — PaymentPage only turns a
// *definite* outcome into this banner; anything ambiguous stays a plain
// toast (see handlePlaceOrder).
import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiXCircle, FiInfo } from 'react-icons/fi';

const VARIANTS = {
  failed: {
    icon: FiXCircle,
    section: 'border-rose-300 bg-rose-50',
    icon_color: 'text-rose-500',
    title_color: 'text-rose-800',
    body_color: 'text-rose-700',
    dismiss_color: 'text-rose-400 hover:text-rose-600',
    titleKey: ['checkout.paymentFailedTitle', 'Payment failed'],
    bodyKey: [
      'checkout.paymentFailedBody',
      "We couldn't complete that payment. No amount was charged — you can try again, or pay with Cash on Delivery instead.",
    ],
  },
  cancelled: {
    icon: FiInfo,
    section: 'border-gray-300 bg-gray-50',
    icon_color: 'text-gray-500',
    title_color: 'text-gray-800',
    body_color: 'text-gray-600',
    dismiss_color: 'text-gray-500 hover:text-gray-600',
    titleKey: ['checkout.paymentCancelledTitle', 'Payment cancelled'],
    bodyKey: [
      'checkout.paymentCancelledBody',
      "You closed the payment window before it finished. No amount was charged — pick up right here whenever you're ready.",
    ],
  },
};

export default function PaymentStatusNotice({ variant, message, onDismiss }) {
  const { t } = useTranslation();
  const config = VARIANTS[variant] || VARIANTS.failed;
  const Icon = config.icon;

  return (
    <section
      role={variant === 'failed' ? 'alert' : 'status'}
      className={`card p-4 flex items-start gap-2 ${config.section}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.icon_color}`} aria-hidden />
      <div className="flex flex-col gap-1 flex-1">
        <p className={`text-sm font-semibold ${config.title_color}`}>{t(...config.titleKey)}</p>
        <p className={`text-sm ${config.body_color}`}>{message || t(...config.bodyKey)}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('checkout.dismiss', 'Dismiss')}
          className={`text-lg leading-none px-1 ${config.dismiss_color}`}
        >
          ×
        </button>
      )}
    </section>
  );
}

PaymentStatusNotice.propTypes = {
  variant: PropTypes.oneOf(['failed', 'cancelled']).isRequired,
  message: PropTypes.string,
  onDismiss: PropTypes.func,
};
