'use client';

import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mediaUrl } from '@/lib/api';

interface MapMarker {
  id: number;
  nome: string;
  slug: string;
  foto_profilo: string;
  categoria_slug: string;
  categoria_nome: string;
  rating: number;
  latitudine: number;
  longitudine: number;
}

interface MapViewProps {
  markers: MapMarker[];
  /** [lat, lng], come si leggono di solito le coordinate. */
  center?: [number, number];
  className?: string;
}

const PIN_COLOR = '#E91E8C';

// Storia dei provider: i server tile di openstreetmap.org sono volontari e la
// loro usage policy non copre un sito come questo (ci hanno bloccati, tile 403);
// le basemap CARTO senza chiave ora arrivano marchiate "API KEY REQUIRED".
// OpenFreeMap non chiede registrazione ne' chiave e consente l'uso commerciale.
// Per passare a un provider a pagamento basta NEXT_PUBLIC_MAP_STYLE_URL con
// l'URL del suo style JSON: nessuna modifica al codice.
const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

// I dati di profilo finiscono in una stringa HTML: vanno sempre passati da qui,
// altrimenti un nome con del markup dentro esegue codice nel browser di chi visita.
function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="32" height="44" style="display:block;filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35));">
  <path d="M16 0C7.16 0 0 7.16 0 16c0 11.5 16 28 16 28s16-16.5 16-28C32 7.16 24.84 0 16 0z" fill="${PIN_COLOR}" stroke="#ffffff" stroke-width="2" />
  <circle cx="16" cy="16" r="5.5" fill="#ffffff" />
</svg>
`.trim();

export default function MapView({ markers, center = [41.9028, 12.4964], className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    (async () => {
      const { Map, Marker, Popup, NavigationControl, LngLatBounds } = await import('maplibre-gl');

      if (cancelled || !containerRef.current) return;

      const map = new Map({
        container: containerRef.current,
        style: STYLE_URL,
        // MapLibre vuole [lng, lat], al contrario di come arriva la prop.
        center: [center[1], center[0]],
        zoom: markers.length === 1 ? 13 : 5,
        attributionControl: { compact: true, customAttribution: ATTRIBUTION },
      });

      map.addControl(new NavigationControl({ showCompass: false }), 'top-left');

      markers.forEach((m) => {
        const el = document.createElement('div');
        el.innerHTML = PIN_SVG;
        el.style.cursor = 'pointer';

        const nome = escapeHtml(m.nome);

        const popup = new Popup({ offset: 28, closeButton: false }).setHTML(`
          <div style="display:flex;align-items:center;gap:10px;padding:4px;min-width:180px;">
            <img src="${escapeHtml(mediaUrl(m.foto_profilo))}" alt="${nome}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />
            <div>
              <div style="font-weight:600;font-size:14px;">${nome}</div>
              <div style="font-size:11px;color:#666;">${escapeHtml(m.categoria_nome)} — ${escapeHtml(m.rating)}★</div>
              <a href="/escort/${encodeURIComponent(m.slug)}" style="font-size:11px;color:${PIN_COLOR};">Vedi profilo →</a>
            </div>
          </div>
        `);

        new Marker({ element: el, anchor: 'bottom' })
          .setLngLat([m.longitudine, m.latitudine])
          .setPopup(popup)
          .addTo(map);
      });

      if (markers.length > 1) {
        const bounds = new LngLatBounds();
        markers.forEach((m) => bounds.extend([m.longitudine, m.latitudine]));
        map.fitBounds(bounds, { padding: 40, maxZoom: 14, animate: false });
      }

      mapInstanceRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className || 'h-[500px] w-full rounded-xl'}
      style={{ zIndex: 0 }}
    />
  );
}
