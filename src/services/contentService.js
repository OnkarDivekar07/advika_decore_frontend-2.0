// src/services/contentService.js — admin-editable, trilingual storefront
// text (ticker, category labels, footer info, ...). See
// backend 2.0/prisma/schema.prisma's SiteContent model.
//
// Deliberately does NOT use utils/errorHandler's handleError (unlike
// bannerService.js) — every caller of this already has a static i18n
// fallback for exactly this failure case (see useSiteContent.js), so a
// fetch failure here is invisible-by-design, not something to interrupt
// the visit with an error toast over.
import apiClient from '@/utils/apiClient';

export const fetchSiteContent = async () => {
  try {
    const response = await apiClient.get('/api/content');
    return response?.data?.data || [];
  } catch (error) {
    console.warn('Site content fetch failed, falling back to static text:', error);
    return [];
  }
};
