import { useState, useEffect } from 'react';
import { fetchHeroBanners } from '@/services/bannerService';

export function useHeroBanners() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const [pause, setPause] = useState(false);

  useEffect(() => {
    const loadBanners = async () => {
      const data = await fetchHeroBanners();
      setBanners(Array.isArray(data) ? data : []);
    };
    loadBanners();
  }, []);

  useEffect(() => {
    if (pause || banners.length === 0) return;
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % banners.length), 3000);
    return () => clearInterval(timer);
  }, [pause, banners.length]);

  return {
    banners,
    current,
    setCurrent,
    pauseHandlers: {
      onMouseEnter: () => setPause(true),
      onMouseLeave: () => setPause(false),
    },
  };
}
