// src/services/apiClient.js
import axios from 'axios';
import env from '@/utils/env';

// Key under which the JWT is stored in localStorage after login.
export const AUTH_TOKEN_KEY = 'authToken';

const apiClient = axios.create({
  baseURL: env.API_URL,
  timeout: 10000,
});

// Attach the JWT to every outgoing request, if one is present.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Globally handle expired/invalid sessions: clear the stored token and
// send the user to login, so individual pages don't each have to check
// for a 401 themselves.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      if (typeof window !== 'undefined' && window.location.pathname !== '/otp-verification') {
        window.location.href = '/otp-verification';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
