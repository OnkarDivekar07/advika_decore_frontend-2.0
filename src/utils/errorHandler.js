import { toast } from 'react-toastify';

/**
 * Handles API or app-level errors and shows a consistent toast message.
 *
 * Distinguishes three shapes of failure, since they need different
 * messages to actually help someone recover:
 *   1. The server answered with an error (`error.response` present) — use
 *      whatever message it sent; that's the most specific thing we have.
 *   2. The request never reached the server at all (offline, DNS failure,
 *      a dropped connection, CORS) — this is a connectivity problem, not
 *      something about what the person was doing, so say that plainly
 *      rather than surfacing axios's raw "Network Error".
 *   3. The request reached the server but timed out waiting for a
 *      response — distinct enough from "offline" (the connection is up,
 *      something was just slow) to warrant its own message.
 *
 * @param {any} error - The error object (can be API error, JS error, etc.)
 * @param {string} fallbackMessage - Default message to show if error is unknown
 */
export function handleError(error, fallbackMessage = 'Something went wrong!') {
  let message = fallbackMessage;

  if (error?.response?.data?.message) {
    message = error.response.data.message;
  } else if (!error?.response && error) {
    // No `response` means axios never got one — the request itself failed,
    // as opposed to the server answering with an error status.
    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
      message = "That took longer than expected. Please check your connection and try again.";
    } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      message = "You're offline. Please check your connection and try again.";
    } else if (error.message && error.message !== 'Network Error') {
      // A specific thrown message from our own code (e.g. "Payment
      // cancelled.", or Razorpay's own script-load failure) — more useful
      // than a generic connectivity message.
      message = error.message;
    } else {
      message = "Couldn't reach the server. Please check your connection and try again.";
    }
  } else if (error?.message) {
    message = error.message;
  }

  console.error('🌐 Global Error:', error);
  toast.error(message);
}
