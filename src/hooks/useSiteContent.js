// src/hooks/useSiteContent.js — admin-editable, trilingual storefront text
// (see backend 2.0/prisma/schema.prisma's SiteContent model and
// src/services/contentService.js). Fetches once and exposes a
// `getText(key, lang, fallback)` lookup that always resolves to something
// renderable: the admin-edited value once loaded, or the caller's existing
// static i18n string before it loads / if the row doesn't exist / if the
// fetch failed. Callers never have to special-case "not ready yet" — this
// is what keeps swapping a component over to dynamic content a
// zero-visual-change, fail-safe operation.
import { useEffect, useState } from 'react';
import { fetchSiteContent } from '@/services/contentService';

const LANG_FIELD = { en: 'valueEn', hi: 'valueHi', mr: 'valueMr' };

export function useSiteContent() {
  const [contentMap, setContentMap] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchSiteContent();
      if (cancelled) return;
      const map = {};
      rows.forEach((row) => {
        map[row.key] = row;
      });
      setContentMap(map);
    })();
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
