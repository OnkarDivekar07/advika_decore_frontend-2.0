import { toast } from 'react-toastify';

/**
 * Handles API or app-level errors and shows a consistent toast message
 * @param {any} error - The error object (can be API error, JS error, etc.)
 * @param {string} fallbackMessage - Default message to show if error is unknown
 */
export function handleError(error, fallbackMessage = 'Something went wrong!') {
  let message = fallbackMessage;

  if (error?.response?.data?.message) {
    message = error.response.data.message;
  } else if (error?.message) {
    message = error.message;
  }

  console.error('🌐 Global Error:', error);
  toast.error(message);
}
