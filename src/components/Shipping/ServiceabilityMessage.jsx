// src/components/Shipping/ServiceabilityMessage.jsx
//
// Renders the result of a serviceability check — the
// checking/deliverable/not-serviceable/error message block that used to be
// hand-duplicated (with tiny copy/markup drift) in both ProductDetails and
// AddressForm. Takes the exact `{ status, data }` shape
// useServiceabilityCheck (features/shipping/hooks/useServiceabilityCheck.js)
// returns, so the two are meant to be used together — see
// <PincodeServiceabilityCheck> below for the common case of "input +
// message" bundled as one widget.
//
// Deliberately dumb: never calls the API or computes a date itself — the
// wording rules (INVALID_PINCODE vs AREA_NOT_COVERED, date vs day-count vs
// generic "we deliver here") live in serviceabilityReason.js /
// formatDeliveryDate.js, which this just calls, so every place a
// serviceability result is shown reads the same way.
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { formatDeliveryDate } from '@/utils/formatDeliveryDate';
import { getNotServiceableMessage } from '@/utils/serviceabilityReason';

export default function ServiceabilityMessage({
  status,
  data,
  showCodNote,
  onRetry,
  isRetrying,
  className,
}) {
  const { t } = useTranslation();

  if (status === 'checking') {
    return (
      <p className={`text-xs text-gray-400 ${className}`}>
        {t('checkout.checkingServiceability', 'Checking delivery availability…')}
      </p>
    );
  }

  if (status === 'ready' && data?.serviceable) {
    return (
      <p className={`text-xs text-green-600 flex items-center gap-1 ${className}`}>
        <FiCheckCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {(() => {
          // Prefer the concrete date the backend computed (see the
          // backend's shipping.service.js#checkServiceability) over the
          // raw day-count — falls back to the day-count phrasing only if
          // the backend didn't send a usable date, and to a generic "we
          // deliver here" if it sent neither.
          const formattedDate = formatDeliveryDate(data.estimatedDeliveryDate);
          if (formattedDate) {
            return t('checkout.deliversByDate', 'Delivers by {{date}}', { date: formattedDate });
          }
          if (data.estimatedDays) {
            return t('checkout.deliversIn', 'Delivers in ~{{days}} days', {
              days: data.estimatedDays,
            });
          }
          return t('checkout.deliverable', 'We deliver to this pincode');
        })()}
        {showCodNote &&
          data.codAvailable === false &&
          ` — ${t('checkout.codUnavailable', 'Cash on delivery not available here')}`}
      </p>
    );
  }

  if (status === 'ready' && !data?.serviceable) {
    return (
      <p className={`text-xs text-amber-600 flex items-center gap-1 ${className}`}>
        <FiAlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {getNotServiceableMessage(t, data?.reason)}
      </p>
    );
  }

  if (status === 'error') {
    // Unlike the other statuses, this one carries a real backend retry
    // action (see useServiceabilityCheck.js's retry()) rather than just
    // being informational — a failed check is the one state a caller
    // (e.g. ReviewPage.jsx) may block progression on, so it always needs a
    // clear, actionable way out of it rather than a dead end.
    return (
      <p className={`text-xs text-amber-600 flex items-center gap-1.5 flex-wrap ${className}`}>
        <span className="flex items-center gap-1">
          <FiAlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {t('checkout.shipmentCheckFailed', "Couldn't check delivery for this pincode.")}
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline disabled:opacity-60 disabled:cursor-not-allowed disabled:no-underline"
          >
            <FiRefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden />
            {isRetrying ? t('checkout.retrying', 'Retrying…') : t('checkout.retry', 'Retry')}
          </button>
        )}
      </p>
    );
  }

  // status === 'idle' — nothing to show yet (no pincode entered, or one
  // that isn't a well-formed 6-digit value yet).
  return null;
}

ServiceabilityMessage.propTypes = {
  status: PropTypes.oneOf(['idle', 'checking', 'ready', 'error']).isRequired,
  data: PropTypes.shape({
    serviceable: PropTypes.bool,
    reason: PropTypes.string,
    estimatedDays: PropTypes.number,
    estimatedDeliveryDate: PropTypes.string,
    codAvailable: PropTypes.bool,
  }),
  // Whether to append the "Cash on delivery not available here" note when
  // applicable. On by default; callers that already show payment-mode
  // availability elsewhere (or don't care, e.g. a product-page pincode
  // check before any payment mode is chosen) can turn it off.
  showCodNote: PropTypes.bool,
  // Wires the error state's "Retry" button to a real recheck (typically
  // useServiceabilityCheck's own `retry`). Omit to render the error
  // message with no action — e.g. a caller that already offers its own
  // retry affordance elsewhere.
  onRetry: PropTypes.func,
  // Disables the Retry button and swaps its label/spinner while a retry
  // (or any check) is already in flight, so a second tap can't queue a
  // duplicate request.
  isRetrying: PropTypes.bool,
  className: PropTypes.string,
};

ServiceabilityMessage.defaultProps = {
  data: null,
  showCodNote: true,
  onRetry: null,
  isRetrying: false,
  className: '',
};
