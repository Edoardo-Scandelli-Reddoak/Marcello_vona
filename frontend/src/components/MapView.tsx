'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
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

const pinColors: Record<string, string> = {
  massaggi: '#E91E8C',
  yoga: '#1A1A1A',
  relax: '#888888',
};

export default function MapView({ markers, center = [41.9028, 12.4964], className }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;

      // Import CSS by adding link tag
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current).setView(center, markers.length === 1 ? 14 : 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      markers.forEach((m) => {
        const color = pinColors[m.categoria_slug] || '#E91E8C';
        const circle = L.circleMarker([m.latitudine, m.longitudine], {
          radius: 10,
          fillColor: color,
          color: m.categoria_slug === 'relax' ? '#1A1A1A' : color,
          weight: 2,
          fillOpacity: 0.9,
        }).addTo(map);

        circle.bindPopup(`
          <div style="display:flex;align-items:center;gap:10px;padding:4px;min-width:180px;">
            <img src="${mediaUrl(m.foto_profilo)}" alt="${m.nome}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />
            <div>
              <div style="font-weight:600;font-size:14px;">${m.nome}</div>
              <div style="font-size:11px;color:#666;">${m.categoria_nome} — ${m.rating}★</div>
              <a href="/professioniste/${m.slug}" style="font-size:11px;color:#E91E8C;">Vedi profilo →</a>
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
