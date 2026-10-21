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
  link: '',
  button_testo: 'Contattaci',
  button_link: 'mailto:info.escortbella@gmail.com',
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

  // `link` rende cliccabile tutto il banner; il bottone, se non ha un link
  // suo, porta allo stesso posto. `?? ''` copre un backend non ancora
  // aggiornato che non manda il campo.
  const bannerLink = banner.link ?? '';
  const buttonLink = banner.button_link || bannerLink;
  const showButton = Boolean(banner.button_testo && buttonLink);

  const hasImage = Boolean(banner.immagine);
  const hasText = Boolean(banner.titolo || banner.descrizione);
  // Solo immagine: la grafica ha già il suo testo, la mostro intera senza
  // ritagliarla né scurirla.
  const imageOnly = hasImage && !hasText;

  const button = showButton && (
    <a
      href={buttonLink}
      {...linkProps(buttonLink)}
      className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#E91E8C] transition-colors duration-200 ease-out hover:bg-white/90"
    >
      {banner.button_testo}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );

  return (
    <div
      className={`relative isolate overflow-hidden rounded-2xl shadow-md ${
        bannerLink ? 'transition-shadow duration-200 ease-out hover:shadow-lg' : ''
      }`}
    >
      {/* Link su tutto il banner: sta sopra a immagine e testo, sotto al bottone
          (z-20), così il bottone resta cliccabile col suo link. */}
      {bannerLink && (
        <a
          href={bannerLink}
          {...linkProps(bannerLink)}
          aria-label={banner.titolo || 'Apri il banner pubblicitario'}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        />
      )}

      {imageOnly ? (
        <>
          {/* width/height danno solo la proporzione di partenza (con 0x0 il
              box resta alto zero e il lazy-load non parte mai); caricata
              l'immagine, `h-auto` usa la sua proporzione vera. */}
          <Image
            src={mediaUrl(banner.immagine)}
            alt="Banner pubblicitario"
            width={1216}
            height={240}
            className="block h-auto w-full"
            sizes="(max-width: 1280px) 100vw, 1216px"
          />
          {button && <div className="absolute bottom-4 right-4 z-20 sm:bottom-6 sm:right-6">{button}</div>}
        </>
      ) : (
        <>
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
              {banner.titolo && (
                <h3 className="text-xl font-bold leading-tight drop-shadow-sm sm:text-2xl md:text-3xl">{banner.titolo}</h3>
              )}
              {banner.descrizione && (
                <p className={`text-sm text-white/90 drop-shadow-sm sm:text-base ${banner.titolo ? 'mt-2' : ''}`}>
                  {banner.descrizione}
                </p>
              )}
            </div>

            {button && <div className="relative z-20">{button}</div>}
          </div>
        </>
      )}
    </div>
  );
}

function linkProps(href: string) {
  return href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}
