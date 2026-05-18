'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EscortCard from '@/components/EscortCard';
import Carousel from '@/components/Carousel';
import StarRating from '@/components/StarRating';
import PromoBanner from '@/components/PromoBanner';
import { escortApi, recensioniApi } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';

export default function HomePage() {
  const router = useRouter();
  const geo = useGeolocation();
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [distanza, setDistanza] = useState('');
  const [featured, setFeatured] = useState<any[]>([]);
  const [nearby, setNearby] = useState<any[]>([]);
  const [siteReviews, setSiteReviews] = useState<any[]>([]);

  useEffect(() => {
    escortApi.featured().then(setFeatured).catch(() => {});
    recensioniApi.sito().then(setSiteReviews).catch(() => {});
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
      <section className="relative overflow-hidden bg-[#1A1A1A] py-16 text-white sm:py-20 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E91E8C]/20 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 text-left">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Le migliori <span className="text-[#E91E8C]">escort</span><br />a 5 stelle
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/70 sm:mt-4 sm:text-lg">
            Scopri le migliori escort vicino a te. Sfoglia le schede, leggi le recensioni e trova la escort perfetta per te in pochi click!
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
          </div>
          <Button type="submit" className="w-full bg-[#E91E8C] text-white hover:bg-[#D11A7D] sm:w-auto">
            Cerca
          </Button>
        </form>

        {/* CTA — registrazione escort */}
        <div className="mx-auto mt-4 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E91E8C]/25 bg-gradient-to-r from-[#E91E8C]/[0.06] to-transparent px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#E91E8C]/10">
              <Sparkles className="h-5 w-5 text-[#E91E8C]" />
            </div>
            <div>
              <p className="font-semibold text-[#1A1A1A]">Sei un&apos;escort?</p>
              <p className="text-sm text-[#1A1A1A]/65">
                Crea la tua scheda in meno di 3 minuti e fatti trovare da nuovi clienti.
              </p>
            </div>
          </div>
          <Link href="/registrazione">
            <Button className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
              Iscriviti ora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
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
          <Carousel>
            {nearby.map((p) => (
              <div key={p.id} className="w-[260px] flex-shrink-0">
                <EscortCard escort={p} />
              </div>
            ))}
          </Carousel>
        ) : (
          !geo.loading && <p className="text-[#1A1A1A]/40">Nessuna escort trovata.</p>
        )}
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
