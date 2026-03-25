'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Search, List, Map, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProfessionistaCard from '@/components/ProfessionistaCard';
import { professionisteApi, provinceApi } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function ProfessionistePage() {
  const searchParams = useSearchParams();
  const geo = useGeolocation();

  const [view, setView] = useState<'list' | 'map'>('list');
  const [results, setResults] = useState<any[]>([]);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter state from URL
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoria, setCategoria] = useState(searchParams.get('categoria') || '');
  const [distanza, setDistanza] = useState(searchParams.get('distanza') || '');
  const [ratingMin, setRatingMin] = useState(searchParams.get('rating_min') || '');
  const [provincia, setProvincia] = useState(searchParams.get('provincia') || '');
  const [ordering, setOrdering] = useState(searchParams.get('ordering') || '');
  const [province, setProvince] = useState<{ provincia: string; count: number }[]>([]);

  const fetchResults = useCallback(async (p: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoria) params.set('categoria', categoria);
      if (ratingMin) params.set('rating_min', ratingMin);
      if (provincia) params.set('provincia', provincia);
      if (ordering) params.set('ordering', ordering);
      if (distanza && geo.lat && geo.lng) {
        params.set('distanza', distanza);
        params.set('lat', String(geo.lat));
        params.set('lng', String(geo.lng));
      } else if (ordering === 'distanza' && geo.lat && geo.lng) {
        params.set('lat', String(geo.lat));
        params.set('lng', String(geo.lng));
      }
      params.set('page', String(p));

      const data = await professionisteApi.list(params.toString());
      setResults(data.results || data);
      setTotalCount(data.count || (data.results ? data.results.length : data.length));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [search, categoria, distanza, ratingMin, provincia, ordering, geo.lat, geo.lng]);

  useEffect(() => {
    provinceApi.list().then(setProvince).catch(() => {});
  }, []);

  useEffect(() => {
    fetchResults(page);
  }, [fetchResults, page]);

  useEffect(() => {
    if (view === 'map') {
      professionisteApi.map().then(setMapMarkers).catch(() => {});
    }
  }, [view]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchResults(1);
  };

  const resetFilters = () => {
    setSearch('');
    setCategoria('');
    setDistanza('');
    setRatingMin('');
    setProvincia('');
    setOrdering('');
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / 12);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <h1 className="mb-6 text-3xl font-bold text-[#1A1A1A]">Professioniste</h1>

      {/* Search & Filters */}
      <form onSubmit={handleSearch} className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#1A1A1A]/10 bg-white px-3">
            <Search className="h-4 w-4 text-[#1A1A1A]/40" />
            <Input
              placeholder="Cerca..."
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
            <option value="">Categoria</option>
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
          <select
            value={ratingMin}
            onChange={(e) => setRatingMin(e.target.value)}
            className="h-10 rounded-lg border border-[#1A1A1A]/10 bg-white px-3 text-sm"
          >
            <option value="">Rating</option>
            <option value="3">3+ stelle</option>
            <option value="4">4+ stelle</option>
            <option value="5">5 stelle</option>
          </select>
          <select
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
            className="h-10 rounded-lg border border-[#1A1A1A]/10 bg-white px-3 text-sm"
          >
            <option value="">Provincia</option>
            {province.map((p) => (
              <option key={p.provincia} value={p.provincia}>
                {p.provincia} ({p.count})
              </option>
            ))}
          </select>
          <Button type="submit" className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
            Cerca
          </Button>
          <Button type="button" variant="ghost" onClick={resetFilters}>
            <RotateCcw className="mr-1 h-4 w-4" /> Reset
          </Button>
        </div>

        {/* Sort + View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#1A1A1A]/60">{totalCount} professioniste trovate</span>
            <select
              value={ordering}
              onChange={(e) => { setOrdering(e.target.value); setPage(1); }}
              className="h-8 rounded border border-[#1A1A1A]/10 bg-white px-2 text-xs"
            >
              <option value="">Più recenti</option>
              <option value="rating">Per rating</option>
              <option value="distanza">Per distanza</option>
            </select>
          </div>
          <div className="flex rounded-lg border border-[#1A1A1A]/10 bg-white">
            <button
              onClick={() => setView('list')}
              className={`rounded-l-lg p-2 ${view === 'list' ? 'bg-[#E91E8C] text-white' : 'text-[#1A1A1A]/40'}`}
              aria-label="Vista lista"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('map')}
              className={`rounded-r-lg p-2 ${view === 'map' ? 'bg-[#E91E8C] text-white' : 'text-[#1A1A1A]/40'}`}
              aria-label="Vista mappa"
            >
              <Map className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-[#1A1A1A]/40">Caricamento...</div>
      ) : view === 'list' ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <ProfessionistaCard key={p.id} professionista={p} userLat={geo.lat} userLng={geo.lng} />
            ))}
          </div>
          {results.length === 0 && (
            <p className="py-20 text-center text-[#1A1A1A]/40">Nessuna professionista trovata.</p>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Precedente
              </Button>
              <span className="text-sm text-[#1A1A1A]/60">
                Pagina {page} di {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Successiva
              </Button>
            </div>
          )}
        </>
      ) : (
        <MapView
          markers={mapMarkers}
          center={geo.lat && geo.lng ? [geo.lat, geo.lng] : undefined}
        />
      )}
    </div>
  );
}
