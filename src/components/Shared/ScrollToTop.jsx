// src/components/Shared/ScrollToTop.jsx
//
// React Router doesn't reset scroll position on navigation the way a
// full page load does — clicking a link while scrolled down (e.g. a
// homepage category card) lands on the new page still scrolled to that
// same pixel offset, which can put the visitor at the new page's footer
// instead of its top. Mounted once at the app root (see App.jsx); renders
// nothing, just scrolls to top whenever the route path changes.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
