import { useState, useEffect, useRef } from 'react';
import { fetchHeroBanners } from '@/services/bannerService';

// Respect the OS/browser-level "reduce motion" preference — a hero banner
// that keeps auto-advancing every few seconds is exactly the kind of
// motion that setting is meant to suppress, so autoplay never starts at
// all for someone who's asked for it, rather than requiring them to also
// find and use the pause button below.
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

export function useHeroBanners() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  // Two independent reasons autoplay can be paused: the user is
  // hovering/focusing the banner (pauseHandlers below), or they've
  // explicitly hit the pause button (isUserPaused) — either one alone is
  // enough to stop the timer, see the effect below.
  const [pause, setPause] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(prefersReducedMotion());
  const focusCountRef = useRef(0);

  useEffect(() => {
    const loadBanners = async () => {
      const data = await fetchHeroBanners();
      setBanners(Array.isArray(data) ? data : []);
    };
    loadBanners();
  }, []);

  useEffect(() => {
    if (pause || isUserPaused || banners.length === 0) return;
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % banners.length), 3000);
    return () => clearInterval(timer);
  }, [pause, isUserPaused, banners.length]);

  // Tracks how many descendants currently have focus (a ref rather than a
  // boolean, since Tab-ing between the pagination dots fires blur-then-
  // focus on consecutive elements — a plain boolean would flicker
  // "resume" for a frame between them and briefly restart the timer).
  const handleFocusIn = () => {
    focusCountRef.current += 1;
    setPause(true);
  };
  const handleFocusOut = () => {
    focusCountRef.current = Math.max(0, focusCountRef.current - 1);
    if (focusCountRef.current === 0) setPause(false);
  };

  return {
    banners,
    current,
    setCurrent,
    isPlaying: !isUserPaused,
    togglePlay: () => setIsUserPaused((v) => !v),
    pauseHandlers: {
      onMouseEnter: () => setPause(true),
      onMouseLeave: () => setPause(false),
      // WCAG 2.2.2 (Pause, Stop, Hide): content that auto-advances needs
      // a way to stop it that doesn't depend on having a mouse — a
      // keyboard user tabbing onto a pagination dot pauses it exactly
      // like a mouse hover does, and it resumes once focus leaves.
      onFocus: handleFocusIn,
      onBlur: handleFocusOut,
    },
  };
}
