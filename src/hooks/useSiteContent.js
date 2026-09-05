// src/hooks/useSiteContent.js — admin-editable, trilingual storefront text
// (see backend 2.0/prisma/schema.prisma's SiteContent model and
// src/services/contentService.js). Fetches once and exposes a
// `getText(key, lang, fallback)` lookup that always resolves to something
// renderable: the admin-edited value once loaded, or the caller's existing
// static i18n string before it loads / if the row doesn't exist / if the
// fetch failed. Callers never have to special-case "not ready yet" — this
// is what keeps swapping a component over to dynamic content a
// zero-visual-change, fail-safe operation.
//
// Called independently by several components on the same page (e.g.
// HomePage and AdvikaFooter both call it directly, and useBrandPhone calls
// it too, pulling in WhatsAppStrip/StickyBar/SlideMenu/most page
// components) — so the fetch and its result are cached at module scope
// and shared across every hook instance for the life of the page session,
// instead of each mount firing its own GET /api/content.
import { useEffect, useState } from 'react';
import { fetchSiteContent } from '@/services/contentService';

const LANG_FIELD = { en: 'valueEn', hi: 'valueHi', mr: 'valueMr' };

let cachedContentMap = null;
let inFlightRequest = null;

function loadContentMap() {
  if (cachedContentMap) return Promise.resolve(cachedContentMap);
  if (!inFlightRequest) {
    inFlightRequest = fetchSiteContent().then((rows) => {
      const map = {};
      rows.forEach((row) => {
        map[row.key] = row;
      });
      cachedContentMap = map;
      inFlightRequest = null;
      return map;
    });
  }
  return inFlightRequest;
}

export function useSiteContent() {
  const [contentMap, setContentMap] = useState(cachedContentMap || {});

  useEffect(() => {
    if (cachedContentMap) return;
    let cancelled = false;
    loadContentMap().then((map) => {
      if (!cancelled) setContentMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const getText = (key, lang, fallback) => {
    const row = contentMap[key];
    const field = LANG_FIELD[lang] || LANG_FIELD.en;
    return row?.[field] || fallback;
  };

  return { getText };
}
