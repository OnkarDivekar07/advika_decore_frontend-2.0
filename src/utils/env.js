const ENV = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  // Add more env variables here as needed:
  // STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY || '',
  // ANALYTICS_ID: import.meta.env.VITE_ANALYTICS_ID || '',
};

export default ENV;
