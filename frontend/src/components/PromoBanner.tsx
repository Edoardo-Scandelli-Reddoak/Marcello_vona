'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { bannersApi, mediaUrl, type Banner } from '@/lib/api';

interface PromoBannerProps {
  posizione: string;
  fallback?: Partial<Banner>;
}

const DEFAULT_FALLBACK: Banner = {
  id: 0,
  posizione: '',
  titolo: 'Vuoi pubblicizzarti in questo banner?',
  descrizione:
    'Raggiungi migliaia di utenti che ogni giorno cercano escort sulla nostra piattaforma. Contattaci per scoprire le opportunità pubblicitarie disponibili.',
  immagine: null,
  button_testo: 'Contattaci',
  button_link: 'mailto:supporto@directoryescort.it',
};

export default function PromoBanner({ posizione, fallback }: PromoBannerProps) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bannersApi
      .byPosition(posizione)
      .then((b) => {
        if (cancelled) return;
        setBanner(b ?? { ...DEFAULT_FALLBACK, ...fallback, posizione });
      })
      .catch(() => {
        if (cancelled) return;
        setBanner({ ...DEFAULT_FALLBACK, ...fallback, posizione });
      })
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [posizione, fallback]);

  if (!loaded || !banner) {
    return <div className="h-[180px] rounded-2xl bg-[#1A1A1A]/[0.04]" aria-hidden="true" />;
  }

  const isExternal = banner.button_link.startsWith('http');
  const linkProps = isExternal
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  const hasImage = Boolean(banner.immagine);

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-md">
      {/* Layer 1: pink gradient (visible only when no image is set) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E91E8C] to-[#7A1248]" aria-hidden="true" />

      {/* Layer 2: image covers the whole banner (no fuchsia tint on top) */}
      {hasImage && (
        <Image
          src={mediaUrl(banner.immagine)}
          alt=""
          fill
          priority={false}
          className="object-cover"
          sizes="(max-width: 1280px) 100vw, 1216px"
        />
      )}

      {/* Layer 3: subtle dark gradient ONLY when there is an image, for text readability */}
      {hasImage && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/10"
          aria-hidden="true"
        />
      )}

      {/* Content */}
      <div className="relative grid items-center gap-4 p-5 text-white sm:gap-6 sm:p-8 md:grid-cols-[1fr_auto] md:gap-10 md:p-10">
        <div className="max-w-2xl">
          <h3 className="text-xl font-bold leading-tight drop-shadow-sm sm:text-2xl md:text-3xl">{banner.titolo}</h3>
          {banner.descrizione && (
            <p className="mt-2 text-sm text-white/90 drop-shadow-sm sm:text-base">{banner.descrizione}</p>
          )}
        </div>

        {banner.button_testo && banner.button_link && (
          <div>
            <a
              href={banner.button_link}
              {...linkProps}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#E91E8C] transition-colors duration-200 ease-out hover:bg-white/90"
            >
              {banner.button_testo}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
