'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Tracker minimale di pageview. Ad ogni cambio di route (App Router) manda
 * un beacon al backend con il path corrente. Fire-and-forget: gli errori
 * non vengono mostrati né rilanciati — il tracking non deve mai degradare
 * la UX della navigazione.
 *
 * Niente cookie, niente fingerprint. L'IP è hashato e salato lato server.
 */
export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    // `keepalive: true` permette di completare la POST anche se l'utente
    // chiude il tab / naviga via durante il fetch.
    fetch(`${API_URL}/analytics/pageview/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        referer: typeof document !== 'undefined' ? document.referrer || '' : '',
      }),
      keepalive: true,
    }).catch(() => {
      // Best-effort: ignoro silenziosamente.
    });
  }, [pathname]);

  return null;
}
