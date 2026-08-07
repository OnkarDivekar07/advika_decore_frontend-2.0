import apiClient from '@/utils/apiClient';
import { handleError } from '../utils/errorHandler';

export const fetchHeroBanners = async () => {
  try {
    const response = await apiClient.get(`/api/homepage/banners`);
    return response?.data?.data || [];
  } catch (error) {
    handleError(error)
    return [];
  }
};
