'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
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
  center?: [number, number];
  className?: string;
}

const PIN_COLOR = '#E91E8C';

// I server tile di openstreetmap.org sono volontari e la loro usage policy
// non copre un sito come questo: ci hanno bloccati e servono tile "Access blocked" (403).
// Default: basemap CARTO (senza API key). Sovrascrivibili da env per passare
// a un provider con chiave (MapTiler, Thunderforest...) senza toccare il codice.
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

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
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="32" height="44" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35));">
  <path d="M16 0C7.16 0 0 7.16 0 16c0 11.5 16 28 16 28s16-16.5 16-28C32 7.16 24.84 0 16 0z" fill="${PIN_COLOR}" stroke="#ffffff" stroke-width="2" />
  <circle cx="16" cy="16" r="5.5" fill="#ffffff" />
</svg>
`.trim();

export default function MapView({ markers, center = [41.9028, 12.4964], className }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;

      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current).setView(center, markers.length === 1 ? 14 : 6);

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: 'directory-pin',
        html: PIN_SVG,
        iconSize: [32, 44],
        iconAnchor: [16, 44],
        popupAnchor: [0, -40],
      });

      markers.forEach((m) => {
        const marker = L.marker([m.latitudine, m.longitudine], { icon: pinIcon }).addTo(map);

        const nome = escapeHtml(m.nome);

        marker.bindPopup(`
          <div style="display:flex;align-items:center;gap:10px;padding:4px;min-width:180px;">
            <img src="${escapeHtml(mediaUrl(m.foto_profilo))}" alt="${nome}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />
            <div>
              <div style="font-weight:600;font-size:14px;">${nome}</div>
              <div style="font-size:11px;color:#666;">${escapeHtml(m.categoria_nome)} — ${escapeHtml(m.rating)}★</div>
              <a href="/escort/${encodeURIComponent(m.slug)}" style="font-size:11px;color:#E91E8C;">Vedi profilo →</a>
            </div>
          </div>
        `);
      });

      // Fit bounds if multiple markers
      if (markers.length > 1) {
        const bounds = L.latLngBounds(markers.map(m => [m.latitudine, m.longitudine]));
        map.fitBounds(bounds, { padding: [40, 40] });
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
      ref={mapRef}
      className={className || 'h-[500px] w-full rounded-xl'}
      style={{ zIndex: 0 }}
    />
  );
}
