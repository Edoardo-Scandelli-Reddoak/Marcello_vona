'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Heart } from 'lucide-react';
import { mediaUrl, preferitiApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AuthRequiredModal from '@/components/AuthRequiredModal';

interface ProfessionistaCardProps {
  professionista: {
    id: number;
    nome: string;
    slug: string;
    foto_profilo: string;
    categoria_nome: string;
    categoria_slug: string;
    citta: string;
    provincia?: string;
    latitudine: number | null;
    longitudine: number | null;
    rating: number;
    numero_recensioni: number;
    stato?: string;
  };
  userLat?: number | null;
  userLng?: number | null;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const categoriaStyle: Record<string, { bg: string; text: string }> = {
  massaggi: { bg: 'bg-[#E91E8C]/10', text: 'text-[#E91E8C]' },
  yoga: { bg: 'bg-[#1A1A1A]/8', text: 'text-[#1A1A1A]' },
  relax: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

export default function ProfessionistaCard({ professionista, userLat, userLng }: ProfessionistaCardProps) {
  const p = professionista;
  const { user } = useAuth();
  const [isFav, setIsFav] = useState<boolean>(Boolean((p as any).is_favorite));
  const [favLoading, setFavLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const distance =
    userLat && userLng && p.latitudine && p.longitudine
      ? haversine(userLat, userLng, p.latitudine, p.longitudine)
      : null;
  const style = categoriaStyle[p.categoria_slug] || categoriaStyle.massaggi;

  const handleFav = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (favLoading) return;
    setFavLoading(true);
    try {
      const res = await preferitiApi.toggle(p.id);
      setIsFav(res.is_favorite);
    } catch {
      // swallow
    } finally {
      setFavLoading(false);
    }
  };

  return (
    <>
    <Link href={`/professioniste/${p.slug}`} className="group block">
      <div className="overflow-hidden rounded-2xl bg-white border border-[#1A1A1A]/[0.06] transform-gpu will-change-transform [backface-visibility:hidden] transition-[transform,box-shadow] duration-300 ease-out hover:shadow-xl hover:shadow-[#E91E8C]/[0.06] hover:-translate-y-1">
        {/* Image with overlay gradient */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
            src={mediaUrl(p.foto_profilo)}
            alt={p.nome}
            fill
            className="object-cover transform-gpu will-change-transform transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Favorite button */}
          <button
            className="absolute right-3 top-3 rounded-full bg-white/80 p-2 backdrop-blur-sm transform-gpu transition-[transform,background-color] duration-200 ease-out hover:bg-white hover:scale-110 disabled:opacity-50"
            onClick={handleFav}
            disabled={favLoading}
            aria-label={isFav ? 'Rimuovi dai preferiti' : 'Salva nei preferiti'}
            aria-pressed={isFav}
          >
            <Heart
              className="h-4 w-4 text-[#E91E8C]"
              fill={isFav ? '#E91E8C' : 'none'}
            />
          </button>

          {/* Category badge on image */}
          <div className="absolute left-3 top-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase backdrop-blur-sm ${style.bg} ${style.text}`}>
              {p.categoria_nome}
            </span>
          </div>

          {/* Top: name. Bottom row: status (left) + city (right) — same level */}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="text-lg font-bold leading-tight text-white drop-shadow-sm">
              {p.nome}
            </h3>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="line-clamp-1 text-xs font-medium text-white/85 drop-shadow-sm">
                {p.stato || ' '}
              </p>
              {p.citta && (
                <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs text-white/85 drop-shadow-sm">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {p.citta}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < Math.round(p.rating)
                    ? 'fill-[#E91E8C] text-[#E91E8C]'
                    : 'fill-[#1A1A1A]/10 text-[#1A1A1A]/10'
                }`}
              />
            ))}
            <span className="ml-1.5 text-sm font-semibold text-[#1A1A1A]">
              {p.rating > 0 ? p.rating.toFixed(1) : '—'}
            </span>
          </div>
          <span className="text-xs text-[#1A1A1A]/50">
            {p.numero_recensioni} {p.numero_recensioni === 1 ? 'recensione' : 'recensioni'}
          </span>
        </div>
      </div>
    </Link>
    <AuthRequiredModal
      open={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      message={`Per salvare ${p.nome} nei preferiti devi avere un account.`}
    />
    </>
  );
}
