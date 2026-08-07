// src/services/apiClient.js
import axios from 'axios';
import env from '@/utils/env';

const apiClient = axios.create({
  baseURL: env.API_URL,
  timeout: 10000,
});

export default apiClient;
