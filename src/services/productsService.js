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

/**
 * Search products by a single query string, with pagination.
 * Thin wrapper around GET /api/products?search=&page=&limit= (see
 * paginateWithCache on the backend) — contract unchanged, this just
 * returns both the items and the pagination meta instead of discarding
 * meta the way fetchAllProducts does.
 *
 * @param {object} params
 * @param {string} params.search
 * @param {number} [params.page=1]
 * @param {number} [params.limit=12]
 * @param {AbortSignal} [params.signal] - to cancel a stale in-flight request
 * @returns {Promise<{ items: object[], meta: { total: number, page: number, limit: number, totalPages: number } }>}
 */
export const searchProducts = async ({ search, page = 1, limit = 12, signal }) => {
  const { data } = await apiClient.get('/api/products', {
    params: { search, page, limit },
    signal,
  });
  return { items: data.data ?? [], meta: data.meta ?? {} };
};

/**
 * Fetch a page of products for the listing page, with optional
 * category / price / stock filters and sorting.
 * Thin wrapper around GET /api/products — only defined params are sent,
 * so an "all filters cleared" call is identical to a plain paginated
 * fetch (and hits the same cache key on the backend).
 *
 * @param {object} params
 * @param {string[]|string} [params.category] - one or more category names
 * @param {number|string} [params.minPrice]
 * @param {number|string} [params.maxPrice]
 * @param {boolean} [params.inStock]
 * @param {'createdAt'|'price'|'name'} [params.sort]
 * @param {'asc'|'desc'} [params.order]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=12]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ items: object[], meta: { total: number, page: number, limit: number, totalPages: number } }>}
 */
export const fetchProducts = async ({
  category,
  minPrice,
  maxPrice,
  inStock,
  sort,
  order,
  page = 1,
  limit = 12,
  signal,
} = {}) => {
  const params = { page, limit };

  const categories = Array.isArray(category) ? category.filter(Boolean) : category;
  if (categories && categories.length > 0) {
    params.category = Array.isArray(categories) ? categories.join(',') : categories;
  }
  if (minPrice !== undefined && minPrice !== null && minPrice !== '') params.minPrice = minPrice;
  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') params.maxPrice = maxPrice;
  if (inStock) params.inStock = 'true';
  if (sort) params.sort = sort;
  if (order) params.order = order;

  const { data } = await apiClient.get('/api/products', { params, signal });
  return { items: data.data ?? [], meta: data.meta ?? {} };
};
