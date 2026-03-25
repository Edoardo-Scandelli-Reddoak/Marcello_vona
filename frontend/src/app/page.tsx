'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProfessionistaCard from '@/components/ProfessionistaCard';
import Carousel from '@/components/Carousel';
import StarRating from '@/components/StarRating';
import { professionisteApi, recensioniApi } from '@/lib/api';
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
    professionisteApi.featured().then(setFeatured).catch(() => {});
    recensioniApi.sito().then(setSiteReviews).catch(() => {});
  }, []);

  useEffect(() => {
    if (geo.lat && geo.lng) {
      professionisteApi.nearby(geo.lat, geo.lng).then(setNearby).catch(() => {});
    } else if (!geo.loading) {
      professionisteApi.nearby().then(setNearby).catch(() => {});
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
    router.push(`/professioniste?${params.toString()}`);
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#1A1A1A] py-24 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E91E8C]/20 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 text-left">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Le migliori <span className="text-[#E91E8C]">ragazze</span><br />a 5 stelle
          </h1>
          <p className="mt-4 text-lg text-white/70 max-w-2xl">
            Scopri le migliori professioniste di Massaggi, Yoga e Relax vicino a te. Sfoglia i profili, leggi le recensioni e trova la persona giusta per il tuo benessere in pochi click.
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="relative z-10 -mt-8 px-4">
        <form
          onSubmit={handleSearch}
          className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 rounded-2xl border border-[#1A1A1A]/10 bg-white p-4 shadow-lg"
        >
          <div className="flex flex-1 items-center gap-2">
            <Search className="h-5 w-5 text-[#1A1A1A]/40" />
            <Input
              placeholder="Cerca per nome o parola chiave..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </div>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="h-10 rounded-lg border border-[#1A1A1A]/10 bg-white px-3 text-sm"
          >
            <option value="">Tutte le categorie</option>
            <option value="massaggi">Massaggi</option>
            <option value="yoga">Yoga</option>
            <option value="relax">Relax</option>
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
          <Button type="submit" className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
            Cerca
          </Button>
        </form>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="mb-8 text-2xl font-bold text-[#1A1A1A]">Le più apprezzate</h2>
          <Carousel>
            {featured.map((p) => (
              <div key={p.id} className="w-[260px] flex-shrink-0">
                <ProfessionistaCard professionista={p} userLat={geo.lat} userLng={geo.lng} />
              </div>
            ))}
          </Carousel>
        </section>
      )}

      {/* Nearby */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-8 text-2xl font-bold text-[#1A1A1A]">Vicino a te</h2>
        {!geo.lat && !geo.loading && (
          <p className="mb-6 rounded-lg bg-[#E91E8C]/5 p-4 text-sm text-[#1A1A1A]/60">
            Attiva la geolocalizzazione per vedere le professioniste più vicine a te.
          </p>
        )}
        {nearby.length > 0 ? (
          <Carousel>
            {nearby.map((p) => (
              <div key={p.id} className="w-[260px] flex-shrink-0">
                <ProfessionistaCard professionista={p} userLat={geo.lat} userLng={geo.lng} />
              </div>
            ))}
          </Carousel>
        ) : (
          !geo.loading && <p className="text-[#1A1A1A]/40">Nessuna professionista trovata.</p>
        )}
      </section>

      {/* Site Reviews */}
      {siteReviews.length > 0 && (
        <section id="recensioni" className="bg-[#1A1A1A] py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 text-center text-2xl font-bold text-white">Cosa dicono di noi</h2>
            <div className="grid gap-6 md:grid-cols-3">
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
