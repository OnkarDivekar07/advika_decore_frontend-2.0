// src/services/productService.js
import apiClient from '@/utils/apiClient';

export const getProductById = async (id) => {
  const res = await apiClient.get(`/api/products/${id}`);
  return res.data.data;
};

export const getRelatedProducts = async (id) => {
  const res = await apiClient.get(`/api/products/${id}/related`);
  return res.data.data;
};

export const fetchAllProducts = async () => {
  const { data } = await apiClient.get(`/api/products`);
  return data.data;
};

export const fetchNewArrivals = async () => {
  const { data } = await apiClient.get(`/api/homepage/new-arrivals`);
  return data.data;
};
