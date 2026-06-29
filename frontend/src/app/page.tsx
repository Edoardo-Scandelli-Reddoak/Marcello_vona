'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EscortCard from '@/components/EscortCard';
import Carousel from '@/components/Carousel';
import StarRating from '@/components/StarRating';
import PromoBanner from '@/components/PromoBanner';
import { escortApi, recensioniApi, bannersApi, provinceApi, type HeroSettings } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';

export default function HomePage() {
  const router = useRouter();
  const geo = useGeolocation();
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [distanza, setDistanza] = useState('');
  const [provincia, setProvincia] = useState('');
  const [province, setProvince] = useState<{ provincia: string; count: number }[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [nearby, setNearby] = useState<any[]>([]);
  const [siteReviews, setSiteReviews] = useState<any[]>([]);
  const [hero, setHero] = useState<HeroSettings | null>(null);

  useEffect(() => {
    escortApi.featured().then(setFeatured).catch(() => {});
    recensioniApi.sito().then(setSiteReviews).catch(() => {});
    bannersApi.hero().then(setHero).catch(() => {});
    provinceApi.list().then(setProvince).catch(() => {});
  }, []);

  useEffect(() => {
    if (geo.lat && geo.lng) {
      escortApi.nearby(geo.lat, geo.lng).then(setNearby).catch(() => {});
    } else if (!geo.loading) {
      escortApi.nearby().then(setNearby).catch(() => {});
    }
  }, [geo.lat, geo.lng, geo.loading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoria) params.set('categoria', categoria);
    if (provincia) params.set('provincia', provincia);
    if (distanza && geo.lat && geo.lng) {
      params.set('distanza', distanza);
      params.set('lat', String(geo.lat));
      params.set('lng', String(geo.lng));
    }
    router.push(`/escort?${params.toString()}`);
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#1A1A1A] py-24 text-white sm:py-32 md:py-40">
        <Image
          src={hero?.immagine || '/hero-home.png'}
          alt="Escort Bella - directory italiana di escort, trans e coppie"
          fill
          priority
          sizes="100vw"
          // Mobile: image shiftata a destra (il soggetto resta visibile sul lato dx).
          // Desktop: centrata.
          className="object-cover object-right sm:object-center"
        />
        {/* Mobile (default): gradiente verticale "a fascia" — trasparente in alto,
            scuro al centro (dove sta il testo), trasparente in basso. Desktop (sm+):
            gradiente orizzontale left→right (scuro a sx, soggetto visibile a dx).
            Entrambe le varianti garantiscono leggibilità del testo. */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1A1A1A]/75 to-transparent
                     sm:bg-gradient-to-r sm:from-[#1A1A1A]/85 sm:via-[#1A1A1A]/55 sm:to-transparent"
        />
        <div className="relative mx-auto max-w-7xl px-4 text-left">
          <h1 className="text-3xl font-bold tracking-tight drop-shadow-md sm:text-5xl md:text-6xl">
            {hero?.titolo?.trim() ? (
              hero.titolo
            ) : (
              <>Le migliori <span className="text-[#E91E8C]">escort</span><br />a 5 stelle</>
            )}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/80 drop-shadow sm:mt-4 sm:text-lg">
            {hero?.sottotitolo?.trim()
              || 'Scopri le migliori escort vicino a te. Sfoglia le schede, leggi le recensioni e trova la escort perfetta per te in pochi click!'}
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="relative z-10 -mt-8 px-4">
        <form
          onSubmit={handleSearch}
          className="mx-auto max-w-4xl space-y-3 rounded-2xl border border-[#1A1A1A]/10 bg-white p-4 shadow-lg sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:space-y-0"
        >
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#1A1A1A]/10 bg-white px-3 sm:border-0 sm:px-0">
            <Search className="h-5 w-5 flex-shrink-0 text-[#1A1A1A]/40" />
            <Input
              placeholder="Cerca per nome o parola chiave..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="h-10 rounded-lg border border-[#1A1A1A]/10 bg-white px-3 text-sm"
            >
              <option value="">Tutte le categorie</option>
              <option value="donna">Donna</option>
              <option value="trans">Trans</option>
              <option value="coppia">Coppia</option>
            </select>
            <select
              value={distanza}
              onChange={(e) => setDistanza(e.target.value)}
              className="h-10 rounded-lg border border-[#1A1A1A]/10 bg-white px-3 text-sm"
            >
              <option value="">Distanza</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="25">25 km</option>
              <option value="50">50 km</option>
            </select>
            <select
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              className="col-span-2 h-10 rounded-lg border border-[#1A1A1A]/10 bg-white px-3 text-sm sm:col-span-1"
            >
              <option value="">Provincia</option>
              {province.map((p) => (
                <option key={p.provincia} value={p.provincia}>
                  {p.provincia} ({p.count})
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full bg-[#E91E8C] text-white hover:bg-[#D11A7D] sm:w-auto">
            Cerca
          </Button>
        </form>

        {/* CTA — registrazione escort. Layout:
            - mobile (< sm): stacked verticalmente (icona+testo sopra, bottone sotto)
            - sm in su: orizzontale, testo a sinistra (va a capo dentro al suo
              blocco se manca spazio), bottone sempre fissato a destra grazie a
              flex-shrink-0. */}
        <div className="mx-auto mt-4 flex max-w-4xl flex-col gap-3 rounded-2xl border border-[#E91E8C]/25 bg-gradient-to-r from-[#E91E8C]/[0.08] to-transparent px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <div className="flex flex-1 items-start gap-3 sm:items-center">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#E91E8C]/10">
              <Sparkles className="h-5 w-5 text-[#E91E8C]" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[#1A1A1A]">Sei un&apos;escort?</p>
              <p className="text-sm text-[#1A1A1A]/70">
                Crea la tua scheda in meno di 3 minuti. Con il piano{' '}
                <span className="font-semibold text-[#E91E8C]">Evidenza</span> appari in cima ai risultati e ti fai vedere prima da nuovi clienti.
              </p>
            </div>
          </div>
          <Link href="/registrazione" className="flex-shrink-0">
            <Button className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
              Iscriviti ora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Banner pubblicitario sotto al CTA "Sei un'escort?" — stessa larghezza
          (max-w-7xl) degli altri 2 banner pubblicitari della home, così sono
          tutti coerenti visivamente. */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:pt-10">
        <PromoBanner posizione="homepage_after_cta" />
      </section>

      {/* Paragrafo descrittivo visibile per indicizzazione SEO.
          I crawler considerano il testo on-page con peso maggiore rispetto
          alle sole meta tag — questo `<p>` serve a far indicizzare meglio
          il sito su Google per le query rilevanti. */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:pt-10">
        <p className="text-center text-sm text-[#1A1A1A]/70 sm:text-base">
          Escort Bella è la directory italiana di escort, trans e coppie.
          Sfoglia profili verificati, leggi recensioni reali e trova la persona
          giusta nella tua zona in pochi click.
        </p>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:py-12 md:py-16">
          <h2 className="mb-6 text-xl font-bold text-[#1A1A1A] sm:mb-8 sm:text-2xl">Le più apprezzate</h2>
          <Carousel>
            {featured.map((p) => (
              <div key={p.id} className="w-[260px] xl:w-[330px] flex-shrink-0">
                <EscortCard escort={p} />
              </div>
            ))}
          </Carousel>
        </section>
      )}

      {/* Promo banner (modificabile da Django admin) */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <PromoBanner posizione="homepage_middle" />
      </section>

      {/* Nearby */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:py-12 md:py-16">
        <h2 className="mb-6 text-xl font-bold text-[#1A1A1A] sm:mb-8 sm:text-2xl">Vicino a te</h2>
        {!geo.lat && !geo.loading && (
          <p className="mb-6 rounded-lg bg-[#E91E8C]/5 p-4 text-sm text-[#1A1A1A]/60">
            Attiva la geolocalizzazione per vedere le escort più vicine a te.
          </p>
        )}
        {nearby.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {nearby.map((p) => (
              <EscortCard key={p.id} escort={p} />
            ))}
          </div>
        ) : (
          !geo.loading && <p className="text-[#1A1A1A]/40">Nessuna escort trovata.</p>
        )}
      </section>

      {/* Banner pubblicitario "sopra le recensioni" — mostrato sempre, anche
          se la sezione recensioni è vuota (così rimangono i 3 banner attesi
          dall'admin in homepage). */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <PromoBanner posizione="homepage_before_reviews" />
      </section>

      {/* Site Reviews */}
      {siteReviews.length > 0 && (
        <section id="recensioni" className="bg-[#1A1A1A] py-10 sm:py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-6 text-center text-xl font-bold text-white sm:mb-8 sm:text-2xl">Cosa dicono di noi</h2>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
              {siteReviews.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-6">
                  <StarRating value={r.stelle} readonly size="sm" />
                  <p className="mt-3 text-sm text-white/80">&ldquo;{r.testo}&rdquo;</p>
                  <p className="mt-3 text-xs font-medium text-[#E91E8C]">{r.nome}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
