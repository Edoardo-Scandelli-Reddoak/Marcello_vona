'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Heart } from 'lucide-react';
import { mediaUrl, preferitiApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AuthRequiredModal from '@/components/AuthRequiredModal';

export interface EscortCardData {
  id: number;
  nome: string;
  slug: string;
  foto_profilo: string;
  categoria_nome: string;
  categoria_slug: string;
  citta: string;
  zona?: string;
  disponibilita?: '' | 'ricevo' | 'altrui' | 'entrambe';
  provincia?: string;
  latitudine: number | null;
  longitudine: number | null;
  rating: number;
  numero_recensioni: number;
  stato?: string;
}

interface EscortCardProps {
  escort: EscortCardData;
}

const categoriaStyle: Record<string, { bg: string; text: string }> = {
  donna: { bg: 'bg-[#E91E8C]/10', text: 'text-[#E91E8C]' },
  trans: { bg: 'bg-[#1A1A1A]/8', text: 'text-[#1A1A1A]' },
  coppia: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

/** Slug legacy (pre-migrazione) ancora nei JSON in cache → stesso stile delle categorie nuove */
const LEGACY_SLUG_MAP: Record<string, keyof typeof categoriaStyle> = {
  massaggi: 'donna',
  yoga: 'trans',
  relax: 'coppia',
};

const LABEL_LEGACY: Record<string, string> = {
  Massaggi: 'Donna',
  Yoga: 'Trans',
  Relax: 'Coppia',
  massaggi: 'Donna',
  yoga: 'Trans',
  relax: 'Coppia',
};

export default function EscortCard({ escort }: EscortCardProps) {
  const p = escort;
  const { user } = useAuth();
  const [isFav, setIsFav] = useState<boolean>(Boolean((p as EscortCardData & { is_favorite?: boolean }).is_favorite));
  const [favLoading, setFavLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const slugKey = LEGACY_SLUG_MAP[p.categoria_slug] ?? p.categoria_slug;
  const style = categoriaStyle[slugKey] || categoriaStyle.donna;
  const categoriaBadge = LABEL_LEGACY[p.categoria_nome] ?? LABEL_LEGACY[p.categoria_slug] ?? p.categoria_nome;

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
    <Link href={`/escort/${p.slug}`} className="group block">
      <div className="overflow-hidden rounded-2xl bg-white border border-[#1A1A1A]/[0.06] transform-gpu will-change-transform [backface-visibility:hidden] transition-[transform,box-shadow] duration-300 ease-out hover:shadow-xl hover:shadow-[#E91E8C]/[0.06] hover:-translate-y-1">
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
            src={mediaUrl(p.foto_profilo)}
            alt={p.nome}
            fill
            className="object-cover transform-gpu will-change-transform transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

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

          <div className="absolute left-3 top-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase backdrop-blur-sm ${style.bg} ${style.text}`}>
              {categoriaBadge}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="text-lg font-bold leading-tight text-white drop-shadow-sm">
              {p.nome}
            </h3>
            {/* Città — Zona */}
            {p.citta && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-white/90 drop-shadow-sm">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {p.citta}{p.zona ? ` — ${p.zona}` : ''}
              </p>
            )}
            {/* Ricevo / Altrui */}
            {p.disponibilita && (
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-white/85 drop-shadow-sm">
                {p.disponibilita === 'ricevo' && 'Ricevo'}
                {p.disponibilita === 'altrui' && 'Altrui'}
                {p.disponibilita === 'entrambe' && 'Ricevo / Altrui'}
              </p>
            )}
            {p.stato && (
              <p className="mt-1 line-clamp-1 text-xs font-medium text-white/80 drop-shadow-sm">
                {p.stato}
              </p>
            )}
          </div>
        </div>

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
