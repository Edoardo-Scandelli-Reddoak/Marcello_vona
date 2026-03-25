'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { MapPin, Phone, Heart, Eye, Star, ArrowLeft, Clock, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import StarRating from '@/components/StarRating';
import { professionisteApi, recensioniApi, mediaUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const categoriaStyle: Record<string, { bg: string; text: string }> = {
  massaggi: { bg: 'bg-[#E91E8C]/10', text: 'text-[#E91E8C]' },
  yoga: { bg: 'bg-[#1A1A1A]/8', text: 'text-[#1A1A1A]' },
  relax: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

export default function ProfiloPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [professionista, setProfessionista] = useState<any>(null);
  const [recensioni, setRecensioni] = useState<any[]>([]);
  const [telefono, setTelefono] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Review form
  const [reviewStelle, setReviewStelle] = useState(5);
  const [reviewTesto, setReviewTesto] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Gallery
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      professionisteApi.detail(slug),
      recensioniApi.list(slug),
    ]).then(([p, r]) => {
      setProfessionista(p);
      setRecensioni(r);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  const handleRevealTelefono = async () => {
    if (!slug) return;
    const data = await professionisteApi.revealTelefono(slug);
    setTelefono(data.telefono);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !user) return;
    setSubmitting(true);
    try {
      await recensioniApi.create(slug, { stelle: reviewStelle, testo: reviewTesto });
      const updated = await recensioniApi.list(slug);
      setRecensioni(updated);
      setReviewTesto('');
      setReviewStelle(5);
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E91E8C] border-t-transparent" />
      </div>
    );
  }

  if (!professionista) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-xl text-[#1A1A1A]/40">Professionista non trovata</p>
        <Link href="/professioniste">
          <Button variant="outline">Torna alla lista</Button>
        </Link>
      </div>
    );
  }

  const p = professionista;
  const allImages = [
    { immagine: p.foto_profilo },
    ...(p.galleria || []),
  ];
  const style = categoriaStyle[p.categoria_slug] || categoriaStyle.massaggi;

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      {/* Back button */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <Link href="/professioniste" className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1A]/50 transition-colors hover:text-[#1A1A1A]">
          <ArrowLeft className="h-4 w-4" />
          Torna alla lista
        </Link>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-5">

          {/* Left Column - 3/5 */}
          <div className="lg:col-span-3 space-y-6">
            {/* Gallery */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              {/* Main image — always vertical/portrait */}
              <div className="flex items-center justify-center bg-[#1A1A1A]/[0.03] p-3 sm:p-4">
                <div className="relative overflow-hidden rounded-xl" style={{ width: '100%', maxWidth: '380px', aspectRatio: '3/4' }}>
                  <Image
                    src={mediaUrl(allImages[activeImage]?.immagine)}
                    alt={p.nome}
                    fill
                    className="object-cover"
                    sizes="380px"
                    priority
                  />
                </div>
              </div>

              {/* Thumbnails row */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto px-3 pb-3">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`relative flex-shrink-0 overflow-hidden rounded-xl transition-all ${
                        i === activeImage
                          ? 'ring-2 ring-[#E91E8C] ring-offset-2 opacity-100'
                          : 'opacity-40 hover:opacity-70'
                      }`}
                      style={{ width: '72px', height: '96px' }}
                    >
                      <Image
                        src={mediaUrl(img.immagine)}
                        alt={`Foto ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="72px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bio Section */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-[#1A1A1A]">Chi sono</h2>
              <p className="whitespace-pre-line leading-relaxed text-[#1A1A1A]/70">{p.bio}</p>

              {/* Tags */}
              {p.tags && p.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {p.tags.map((tag: any) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center rounded-full bg-[#F8F7F5] px-3 py-1 text-xs font-medium text-[#1A1A1A]/60 ring-1 ring-inset ring-[#1A1A1A]/[0.08]"
                    >
                      {tag.nome}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Map Section */}
            {p.latitudine && p.longitudine && (
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="p-6 pb-3">
                  <h2 className="text-lg font-bold text-[#1A1A1A]">Dove trovarmi</h2>
                  <p className="mt-1 text-sm text-[#1A1A1A]/50">{p.citta}</p>
                </div>
                <div className="h-64">
                  <MapView
                    markers={[{ ...p, id: p.id }]}
                    center={[p.latitudine, p.longitudine]}
                  />
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-[#E91E8C]" />
                  <h2 className="text-lg font-bold text-[#1A1A1A]">Recensioni</h2>
                  <span className="rounded-full bg-[#E91E8C]/10 px-2.5 py-0.5 text-xs font-semibold text-[#E91E8C]">
                    {recensioni.length}
                  </span>
                </div>
              </div>

              {/* Write Review */}
              {user ? (
                <form onSubmit={handleSubmitReview} className="mb-6 rounded-xl bg-[#F8F7F5] p-4">
                  <p className="mb-3 text-sm font-medium text-[#1A1A1A]">Lascia una recensione</p>
                  <div className="mb-3">
                    <StarRating value={reviewStelle} onChange={setReviewStelle} size="lg" />
                  </div>
                  <Textarea
                    placeholder="Racconta la tua esperienza..."
                    value={reviewTesto}
                    onChange={(e) => setReviewTesto(e.target.value)}
                    required
                    className="mb-3 border-[#1A1A1A]/10 bg-white"
                    rows={3}
                  />
                  <Button
                    type="submit"
                    disabled={submitting || !reviewTesto.trim()}
                    className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]"
                  >
                    {submitting ? 'Invio...' : 'Pubblica recensione'}
                  </Button>
                </form>
              ) : (
                <div className="mb-6 rounded-xl bg-[#E91E8C]/5 p-4 text-center">
                  <p className="text-sm text-[#1A1A1A]/60">
                    <Link href="/login" className="font-medium text-[#E91E8C] hover:underline">Accedi</Link>
                    {' '}per lasciare una recensione
                  </p>
                </div>
              )}

              {/* Review List */}
              <div className="space-y-4">
                {recensioni.map((r: any) => (
                  <div key={r.id} className="border-b border-[#1A1A1A]/[0.06] pb-4 last:border-0 last:pb-0">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E91E8C]/10 text-xs font-bold text-[#E91E8C]">
                          {r.autore_nome?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">{r.autore_nome}</p>
                          <div className="flex items-center gap-1.5">
                            <StarRating value={r.stelle} readonly size="sm" />
                            <span className="text-[10px] text-[#1A1A1A]/40">
                              {new Date(r.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="ml-11 text-sm leading-relaxed text-[#1A1A1A]/70">{r.testo}</p>
                  </div>
                ))}
                {recensioni.length === 0 && (
                  <p className="text-center text-sm text-[#1A1A1A]/40 py-4">Nessuna recensione ancora. Sii il primo!</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sticky Sidebar - 2/5 */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Main Info Card */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                {/* Profile photo */}
                <div className="mb-4 flex justify-center">
                  <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-[#E91E8C]/10">
                    <Image
                      src={mediaUrl(p.foto_profilo)}
                      alt={p.nome}
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  </div>
                </div>

                {/* Name */}
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-[#1A1A1A]">{p.nome}</h1>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
                      {p.categoria_nome}
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div className="mt-4 flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(p.rating)
                            ? 'fill-[#E91E8C] text-[#E91E8C]'
                            : 'fill-[#1A1A1A]/10 text-[#1A1A1A]/10'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-bold text-[#1A1A1A]">{p.rating > 0 ? p.rating.toFixed(1) : '—'}</span>
                  <span className="text-sm text-[#1A1A1A]/40">({p.numero_recensioni})</span>
                </div>

                {/* Divider */}
                <div className="my-5 border-t border-[#1A1A1A]/[0.06]" />

                {/* Info rows */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F8F7F5]">
                      <MapPin className="h-4 w-4 text-[#E91E8C]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#1A1A1A]">{p.citta}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F8F7F5]">
                      <Eye className="h-4 w-4 text-[#1A1A1A]/40" />
                    </div>
                    <p className="text-[#1A1A1A]/50">{p.visualizzazioni} visualizzazioni</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-5 border-t border-[#1A1A1A]/[0.06]" />

                {/* Phone CTA */}
                {telefono ? (
                  <a
                    href={`tel:${telefono}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E91E8C] px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#D11A7D]"
                  >
                    <Phone className="h-5 w-5" />
                    {telefono}
                  </a>
                ) : (
                  <Button
                    onClick={handleRevealTelefono}
                    className="w-full h-auto rounded-xl bg-[#E91E8C] px-4 py-3.5 text-base font-semibold text-white hover:bg-[#D11A7D]"
                  >
                    <Phone className="mr-2 h-5 w-5" />
                    Mostra numero di telefono
                  </Button>
                )}

                {/* Save */}
                <Button variant="outline" className="mt-3 w-full rounded-xl border-[#1A1A1A]/10 py-3 h-auto">
                  <Heart className="mr-2 h-4 w-4 text-[#E91E8C]" />
                  Salva nei preferiti
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
