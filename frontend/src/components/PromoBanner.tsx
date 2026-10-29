'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { bannersApi, mediaUrl, type Banner, type BannerSlide } from '@/lib/api';

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

  // Il contenuto del banner è la prima slide. `?? []` copre un backend non
  // ancora aggiornato che non manda il campo.
  const slides: BannerSlide[] = [banner, ...(banner.slides ?? [])];

  if (slides.length === 1) {
    return (
      <div
        className={`relative isolate overflow-hidden rounded-2xl shadow-md ${
          banner.link ? 'transition-shadow duration-200 ease-out hover:shadow-lg' : ''
        }`}
      >
        <Slide slide={banner} />
      </div>
    );
  }

  return <Slideshow slides={slides} secondi={banner.intervallo_secondi ?? 6} />;
}

/**
 * Le slide stanno tutte nella stessa cella di una griglia (così il banner è
 * alto quanto la più alta e non salta al cambio) e si alternano in dissolvenza.
 * Si ferma col mouse sopra o col focus dentro, e riparte da dove era: il timer
 * conserva il tempo che manca, la barra del pallino attivo (solo grafica) si
 * mette in pausa insieme a lui.
 */
function Slideshow({ slides, secondi }: { slides: BannerSlide[]; secondi: number }) {
  const [attiva, setAttiva] = useState(0);
  const [inPausa, setInPausa] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = slides.length;

  const vai = (i: number) => setAttiva(((i % n) + n) % n);

  // Millisecondi che mancano al cambio di slide. Il timer non usa la fine
  // dell'animazione CSS: Chrome non la segnala nelle schede in background.
  const restante = useRef(secondi * 1000);
  useEffect(() => {
    restante.current = secondi * 1000;
  }, [attiva, secondi]);
  useEffect(() => {
    if (inPausa) return;
    const inizio = Date.now();
    const timer = setTimeout(() => setAttiva((a) => (a + 1) % n), restante.current);
    return () => {
      clearTimeout(timer);
      restante.current -= Date.now() - inizio;
    };
  }, [attiva, inPausa, n]);

  return (
    <div
      role="region"
      aria-roledescription="carosello"
      aria-label="Banner pubblicitari"
      className={`relative isolate overflow-hidden rounded-2xl shadow-md ${
        slides[attiva].link ? 'transition-shadow duration-200 ease-out hover:shadow-lg' : ''
      }`}
      onMouseEnter={() => setInPausa(true)}
      onMouseLeave={() => setInPausa(false)}
      onFocus={() => setInPausa(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setInPausa(false);
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) vai(attiva + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="grid">
        {slides.map((s, i) => (
          <div
            key={`${s.id}-${i}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} di ${n}`}
            aria-hidden={i !== attiva}
            // inert: le slide nascoste non prendono né click né Tab.
            ref={(el) => {
              el?.toggleAttribute('inert', i !== attiva);
            }}
            // La nuova slide compare in dissolvenza SOPRA la vecchia, che
            // sparisce solo a dissolvenza finita: i testi non si mescolano.
            className={`transition-opacity ease-out [grid-area:1/1] ${
              i === attiva
                ? 'z-10 opacity-100 duration-700'
                : 'pointer-events-none z-0 opacity-0 delay-700 duration-0'
            }`}
          >
            <Slide slide={s} conPallini />
          </div>
        ))}
      </div>

      {/* Il pallino si vede piccolo ma il bottone è alto 24px: da telefono
          un tocco impreciso non deve finire sul link della pubblicità. */}
      <div className="absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 items-center rounded-full bg-black/25 px-1.5 backdrop-blur-sm">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => vai(i)}
            aria-label={`Vai alla slide ${i + 1}`}
            aria-current={i === attiva}
            className="group/pallino flex h-6 items-center px-1"
          >
            <span
              className={`relative block h-1.5 overflow-hidden rounded-full transition-all duration-300 ease-out ${
                i === attiva ? 'w-7 bg-white/40' : 'w-1.5 bg-white/60 group-hover/pallino:bg-white'
              }`}
            >
              {i === attiva && (
                <span
                  // key: al cambio di slide l'animazione riparte da zero.
                  key={attiva}
                  className="absolute inset-0 origin-left rounded-full bg-white"
                  style={{
                    animation: `banner-progress ${secondi}s linear forwards`,
                    animationPlayState: inPausa ? 'paused' : 'running',
                  }}
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Slide({ slide, conPallini = false }: { slide: BannerSlide; conPallini?: boolean }) {
  // `link` rende cliccabile tutta la slide; il bottone, se non ha un link
  // suo, porta allo stesso posto.
  const slideLink = slide.link ?? '';
  const buttonLink = slide.button_link || slideLink;
  const showButton = Boolean(slide.button_testo && buttonLink);

  const hasImage = Boolean(slide.immagine);
  const hasText = Boolean(slide.titolo || slide.descrizione);
  // Solo immagine: la grafica ha già il suo testo, la mostro intera senza
  // ritagliarla né scurirla.
  const imageOnly = hasImage && !hasText;

  const button = showButton && (
    <a
      href={buttonLink}
      {...linkProps(buttonLink)}
      className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#E91E8C] transition-colors duration-200 ease-out hover:bg-white/90"
    >
      {slide.button_testo}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );

  return (
    <div className="relative h-full">
      {/* Link su tutta la slide: sta sopra a immagine e testo, sotto al bottone
          (z-20), così il bottone resta cliccabile col suo link. */}
      {slideLink && (
        <a
          href={slideLink}
          {...linkProps(slideLink)}
          aria-label={slide.titolo || 'Apri il banner pubblicitario'}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        />
      )}

      {imageOnly ? (
        <>
          {/* In uno slideshow una slide di testo può essere più alta della
              grafica (succede su telefono): la grafica resta intera e
              centrata (object-contain) e lo spazio intorno lo riempie la
              stessa immagine sfocata. Quando la grafica è la più alta, la
              copia sfocata resta coperta. */}
          <Image
            src={mediaUrl(slide.immagine)}
            alt=""
            fill
            aria-hidden="true"
            className="scale-110 object-cover blur-2xl"
            sizes="(max-width: 1280px) 100vw, 1216px"
          />
          {/* width/height danno solo la proporzione di partenza (con 0x0 il
              box resta alto zero e il lazy-load non parte mai); caricata
              l'immagine, l'altezza segue la sua proporzione vera. */}
          <Image
            src={mediaUrl(slide.immagine)}
            alt="Banner pubblicitario"
            width={1216}
            height={240}
            className="relative block h-full w-full object-contain"
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
              src={mediaUrl(slide.immagine)}
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
          <div className={`relative grid h-full items-center gap-4 p-5 text-white sm:gap-6 sm:p-8 md:grid-cols-[1fr_auto] md:gap-10 md:p-10 ${
              // spazio per i pallini dello slideshow, su telefono dove il padding è stretto
              conPallini ? 'pb-9 sm:pb-10' : ''
            }`}
          >
            <div className="max-w-2xl">
              {slide.titolo && (
                <h3 className="text-xl font-bold leading-tight drop-shadow-sm sm:text-2xl md:text-3xl">{slide.titolo}</h3>
              )}
              {slide.descrizione && (
                <p className={`text-sm text-white/90 drop-shadow-sm sm:text-base ${slide.titolo ? 'mt-2' : ''}`}>
                  {slide.descrizione}
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
