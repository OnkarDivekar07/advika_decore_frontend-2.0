// src/components/Shared/OfflineBanner.jsx
//
// Per-request failures already get a toast via errorHandler.js ("You're
// offline…"), but that's a one-off notice tied to whatever the person
// happened to be doing when the connection dropped — it disappears after
// a few seconds and says nothing about *now*. This is the complementary,
// persistent signal: for as long as the browser reports no connectivity,
// a fixed banner stays up so it's obvious why things aren't working,
// across navigation, without depending on any particular request having
// been made. It clears itself the moment the browser reports 'online'
// again — no page reload or dismiss action needed.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiWifiOff } from 'react-icons/fi';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false
  );

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-[100] bg-amber-500 text-white text-sm font-medium py-2 px-4 flex items-center justify-center gap-2"
    >
      <FiWifiOff className="w-4 h-4 shrink-0" aria-hidden />
      {t('common.offline', "You're offline. Some things may not work until your connection is back.")}
    </div>
  );
}
