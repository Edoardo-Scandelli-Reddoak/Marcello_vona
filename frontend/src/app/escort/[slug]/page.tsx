'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { MapPin, Phone, Heart, Star, ArrowLeft, MessageCircle, Lock, Clock, Tag as TagIcon, Home, Car } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import StarRating from '@/components/StarRating';
import { escortApi, recensioniApi, preferitiApi, sblocchiApi, mediaUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AuthRequiredModal from '@/components/AuthRequiredModal';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const categoriaStyle: Record<string, { bg: string; text: string }> = {
  donna: { bg: 'bg-[#E91E8C]/10', text: 'text-[#E91E8C]' },
  trans: { bg: 'bg-[#1A1A1A]/8', text: 'text-[#1A1A1A]' },
  coppia: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

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

export default function SchedaEscortPage() {
  const { slug } = useParams<{ slug: string }>();
  const search = useSearchParams();
  const { user } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [recensioni, setRecensioni] = useState<any[]>([]);
  const [telefono, setTelefono] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState('');

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
      escortApi.detail(slug),
      recensioniApi.list(slug),
    ]).then(([p, r]) => {
      setProfile(p);
      setRecensioni(r);
      setIsFav(Boolean(p?.is_favorite));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [slug, search]);

  const handleFav = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (favLoading || !profile) return;
    setFavLoading(true);
    try {
      const res = await preferitiApi.toggle(profile.id);
      setIsFav(res.is_favorite);
    } finally {
      setFavLoading(false);
    }
  };

  const handleUnlockSocials = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (unlockLoading || !profile) return;
    setUnlockError('');
    setUnlockLoading(true);
    try {
      const res = await sblocchiApi.checkout(profile.id);
      if (res.already_unlocked) {
        // Ricarico il detail per ottenere i link sbloccati
        const refreshed = await escortApi.detail(slug);
        setProfile(refreshed);
        return;
      }
      if (res.redirect_url) {
        window.location.href = res.redirect_url;
      }
    } catch (e: any) {
      setUnlockError(e.message || 'Errore durante il pagamento.');
    } finally {
      setUnlockLoading(false);
    }
  };

  const sanitizeForWa = (raw: string) => raw.replace(/[^\d]/g, '');
  const sanitizeForTel = (raw: string) => raw.replace(/[^\d+]/g, '');

  const ensureTelefono = async (): Promise<string | null> => {
    if (telefono) return telefono;
    if (!slug) return null;
    try {
      const data = await escortApi.revealTelefono(slug);
      setTelefono(data.telefono);
      return data.telefono;
    } catch {
      return null;
    }
  };

  const handleChiamami = async () => {
    const num = await ensureTelefono();
    if (num) window.location.href = `tel:${sanitizeForTel(num)}`;
  };

  const handleScrivimi = async () => {
    const num = await ensureTelefono();
    if (!num) return;
    const waNumber = sanitizeForWa(num);
    const text = encodeURIComponent(`Ciao ${profile?.nome ?? ''}, ti scrivo dal sito Escort Bella!`);
    // Apre l'app WhatsApp se installata, altrimenti web.whatsapp.com
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank', 'noopener,noreferrer');
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

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-xl text-[#1A1A1A]/40">Scheda non trovata</p>
        <Link href="/escort">
          <Button variant="outline">Torna alla lista</Button>
        </Link>
      </div>
    );
  }

  const p = profile;
  const allImages = [
    { immagine: p.foto_profilo },
    ...(p.galleria || []),
  ];
  const slugKey = LEGACY_SLUG_MAP[p.categoria_slug] ?? p.categoria_slug;
  const style = categoriaStyle[slugKey] || categoriaStyle.donna;
  const categoriaBadge =
    LABEL_LEGACY[p.categoria_nome] ?? LABEL_LEGACY[p.categoria_slug] ?? p.categoria_nome;

  return (
    <div className="min-h-screen bg-[#F8F7F5] pb-20 sm:pb-0">
      {/* Back button */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <Link href="/escort" className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1A]/50 transition-colors hover:text-[#1A1A1A]">
          <ArrowLeft className="h-4 w-4" />
          Torna alla lista
        </Link>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-5">

          {/* Left Column - 3/5.
              `min-w-0` è CRUCIALE: senza, il default `min-width: auto` su grid
              child fa sì che la colonna si espanda per contenere figli più
              larghi (la strip thumbnails con flex-shrink-0). Risultato: tutta
              la pagina su mobile guadagna uno scroll orizzontale storto.
              Con min-w-0 la colonna rispetta i 1fr/col-span-3 e la strip
              scrolla SOLO al suo interno (grazie a overflow-x-auto). */}
          <div className="min-w-0 lg:col-span-3 space-y-6">
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

              {/* Thumbnails row — `min-w-0` anche qui per cintura+bretelle,
                  così se in futuro il wrapper esterno cambia non si rompe. */}
              {allImages.length > 1 && (
                <div className="flex min-w-0 gap-2 overflow-x-auto px-3 pb-3">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`relative flex-shrink-0 overflow-hidden rounded-xl transition-opacity duration-200 ease-out ${
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

            {/* Video gallery */}
            {p.video && p.video.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-lg font-bold text-[#1A1A1A]">Video</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {p.video.map((v: any) => (
                    <div key={v.id} className="overflow-hidden rounded-xl bg-[#F8F7F5]">
                      <video
                        src={mediaUrl(v.video)}
                        className="aspect-video w-full object-cover"
                        controls
                        preload="metadata"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bio Section */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-[#1A1A1A]">Chi sono</h2>
              <p className="whitespace-pre-line leading-relaxed text-[#1A1A1A]/70">{p.bio}</p>

              {/* Tags */}
              {p.tags && p.tags.length > 0 && <TagList tags={p.tags} />}

              {/* Social — visibili solo dopo pagamento sblocco (1,90 €) */}
              {p.has_any_social && (
                p.socials_unlocked ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {p.onlyfans_url && (
                      <a
                        href={p.onlyfans_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`OnlyFans di ${p.nome}`}
                        className="inline-flex items-center gap-2 rounded-full bg-[#E91E8C] px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#D11A7D]"
                      >
                        <OnlyFansIcon />
                        OnlyFans
                      </a>
                    )}
                    {p.instagram_url && (
                      <a
                        href={p.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Instagram di ${p.nome}`}
                        className="inline-flex items-center gap-2 rounded-full bg-[#E91E8C] px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#D11A7D]"
                      >
                        <InstagramIcon />
                        Instagram
                      </a>
                    )}
                    {p.facebook_url && (
                      <a
                        href={p.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Facebook di ${p.nome}`}
                        className="inline-flex items-center gap-2 rounded-full bg-[#E91E8C] px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#D11A7D]"
                      >
                        <FacebookIcon />
                        Facebook
                      </a>
                    )}
                    {p.tiktok_url && (
                      <a
                        href={p.tiktok_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`TikTok di ${p.nome}`}
                        className="inline-flex items-center gap-2 rounded-full bg-[#E91E8C] px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#D11A7D]"
                      >
                        <TikTokIcon />
                        TikTok
                      </a>
                    )}
                    {p.telegram_url && (
                      <a
                        href={p.telegram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Telegram di ${p.nome}`}
                        className="inline-flex items-center gap-2 rounded-full bg-[#E91E8C] px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#D11A7D]"
                      >
                        <TelegramIcon />
                        Telegram
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-[#E91E8C]/25 bg-gradient-to-br from-[#E91E8C]/5 to-transparent p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#E91E8C]/10">
                        <Lock className="h-5 w-5 text-[#E91E8C]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#1A1A1A]">Sblocca i canali social</h3>
                        <p className="mt-1 text-sm text-[#1A1A1A]/65">
                          Accedi ai profili OnlyFans, Instagram, Facebook, TikTok e Telegram di {p.nome} pagando una piccola tassa una tantum.
                        </p>
                        {unlockError && (
                          <p className="mt-2 text-sm text-red-600">{unlockError}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={handleUnlockSocials}
                      disabled={unlockLoading}
                      className="mt-4 w-full bg-[#E91E8C] text-white hover:bg-[#D11A7D] sm:w-auto"
                    >
                      {unlockLoading ? (
                        'Avvio pagamento…'
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Sblocca per {((p.sblocco_social_prezzo_centesimi ?? 190) / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
                        </>
                      )}
                    </Button>
                  </div>
                )
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
                  <p className="text-sm text-[#1A1A1A]/70">
                    Per lasciare una recensione devi avere un account.
                  </p>
                  <p className="mt-1 text-sm text-[#1A1A1A]/60">
                    <Link href={`/login?next=/escort/${slug}`} className="font-medium text-[#E91E8C] hover:underline">
                      Accedi
                    </Link>
                    {' '}o{' '}
                    <Link href="/registrati" className="font-medium text-[#E91E8C] hover:underline">
                      registrati gratis
                    </Link>
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
            {/* `max-h-[calc(100vh-7rem)]` + overflow-y-auto: se il contenuto è più alto del viewport
                la sidebar scorre internamente invece di andare sotto al footer. */}
            <div className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
              {/* Main Info Card — layout centrato, dimensioni "via di mezzo" */}
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                {/* Profile photo */}
                <div className="mb-3 flex justify-center">
                  <div className="relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-[#E91E8C]/15">
                    <Image
                      src={mediaUrl(p.foto_profilo)}
                      alt={p.nome}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <h1 className="text-xl font-bold text-[#1A1A1A]">{p.nome}</h1>

                  {/* Città — Zona */}
                  {p.citta && (
                    <p className="mt-1 flex items-center justify-center gap-1 text-sm text-[#1A1A1A]/75">
                      <MapPin className="h-3.5 w-3.5 text-[#E91E8C]" aria-hidden="true" />
                      {p.citta}{p.zona ? ` — ${p.zona}` : ''}
                    </p>
                  )}

                  {/* Disponibilità */}
                  {p.disponibilita && (
                    <p className="mt-1 flex items-center justify-center gap-1 text-xs font-medium text-[#1A1A1A]/65">
                      {p.disponibilita === 'ricevo' && (<><Home className="h-3 w-3 text-[#E91E8C]" /> Ricevo</>)}
                      {p.disponibilita === 'altrui' && (<><Car className="h-3 w-3 text-[#E91E8C]" /> Altrui</>)}
                      {p.disponibilita === 'entrambe' && (<><Home className="h-3 w-3 text-[#E91E8C]" /> Ricevo / Altrui</>)}
                    </p>
                  )}

                  {/* Stato */}
                  {p.stato && (
                    <p className="mt-1.5 text-sm font-medium text-[#E91E8C]">{p.stato}</p>
                  )}

                  {/* Riga compatta: categoria + rating */}
                  <div className="mt-2.5 flex items-center justify-center gap-2 text-xs">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text}`}>
                      {categoriaBadge}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-[#1A1A1A]/75">
                      <Star className="h-3.5 w-3.5 fill-[#E91E8C] text-[#E91E8C]" />
                      <span className="text-sm font-bold text-[#1A1A1A]">{p.rating > 0 ? p.rating.toFixed(1) : '—'}</span>
                      <span className="text-[#1A1A1A]/40">({p.numero_recensioni})</span>
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-4 border-t border-[#1A1A1A]/[0.06]" />

                {/* Contatti — Scrivimi (WhatsApp) + Chiamami (telefono) */}
                <div className="space-y-2">
                  <Button
                    onClick={handleScrivimi}
                    className="h-auto w-full rounded-xl bg-[#E91E8C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D11A7D]"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Scrivimi
                  </Button>
                  <Button
                    onClick={handleChiamami}
                    variant="outline"
                    className="h-auto w-full rounded-xl border-[#E91E8C]/30 px-4 py-2.5 text-sm font-semibold text-[#E91E8C] hover:bg-[#E91E8C]/[0.06]"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Chiamami
                  </Button>
                </div>

                {/* Save */}
                <Button
                  variant="outline"
                  onClick={handleFav}
                  disabled={favLoading}
                  className={`mt-2 h-auto w-full rounded-xl py-2 text-sm ${
                    isFav ? 'border-[#E91E8C] text-[#E91E8C]' : 'border-[#1A1A1A]/10 text-[#1A1A1A]/70'
                  }`}
                >
                  <Heart
                    className="mr-2 h-4 w-4 text-[#E91E8C]"
                    fill={isFav ? '#E91E8C' : 'none'}
                  />
                  {isFav ? 'Salvato nei preferiti' : 'Salva nei preferiti'}
                </Button>
              </div>

              {/* Orari & Tariffe (visibili solo se almeno un valore è presente) */}
              {(p.orari_tipo || p.orari_altro || p.tariffa_30min != null || p.tariffa_1ora != null) && (
                <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#1A1A1A]/70">
                    Orari e tariffe
                  </h2>

                  {(p.orari_tipo || p.orari_altro) && (
                    <div className="mb-3 flex items-start gap-2">
                      <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#E91E8C]" />
                      <p className="text-sm text-[#1A1A1A]/80">
                        {p.orari_tipo === '24_7' && '24/7'}
                        {p.orari_tipo === 'h24' && 'H24'}
                        {p.orari_tipo === 'altro' && p.orari_altro}
                        {!p.orari_tipo && p.orari_altro}
                      </p>
                    </div>
                  )}

                  {(p.tariffa_30min != null || p.tariffa_1ora != null) && (
                    <div className="flex items-start gap-2">
                      <TagIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#E91E8C]" />
                      <ul className="flex-1 space-y-1 text-sm text-[#1A1A1A]/80">
                        {p.tariffa_30min != null && (
                          <li className="flex items-center justify-between">
                            <span>30 minuti</span>
                            <span className="font-semibold text-[#1A1A1A]">{p.tariffa_30min} €</span>
                          </li>
                        )}
                        {p.tariffa_1ora != null && (
                          <li className="flex items-center justify-between">
                            <span>1 ora</span>
                            <span className="font-semibold text-[#1A1A1A]">{p.tariffa_1ora} €</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      <AuthRequiredModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        message={`Per salvare ${profile?.nome ?? 'questa escort'} nei preferiti devi avere un account.`}
      />

      {/* Barra fissa contatti — solo mobile. Sticky sul fondo del viewport
          per tutta la lunghezza della pagina; la pagina ha pb-20 in cima per
          non far coprire il contenuto in fondo. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-[#1A1A1A]/10 bg-white px-3 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] sm:hidden"
        role="region"
        aria-label="Contatti rapidi"
      >
        <button
          type="button"
          onClick={handleScrivimi}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E91E8C] px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#D11A7D]"
          aria-label={`Scrivimi a ${p.nome} su WhatsApp`}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Scrivimi
        </button>
        <button
          type="button"
          onClick={handleChiamami}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E91E8C]/30 bg-white px-4 py-3 text-sm font-semibold text-[#E91E8C] transition-colors duration-200 ease-out hover:bg-[#E91E8C]/[0.06]"
          aria-label={`Chiama ${p.nome}`}
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
          Chiamami
        </button>
      </div>
    </div>
  );
}

function OnlyFansIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="9" cy="12" r="6" />
      <path d="M19 8.5a4 4 0 0 1-4 4" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

function TagList({ tags }: { tags: { id: number; nome: string }[] }) {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE = 5;
  const visible = expanded ? tags : tags.slice(0, VISIBLE);
  const hidden = tags.length - VISIBLE;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        {visible.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center rounded-full bg-[#E91E8C]/8 px-3 py-1 text-xs font-medium text-[#E91E8C] ring-1 ring-inset ring-[#E91E8C]/20"
          >
            {tag.nome}
          </span>
        ))}
        {hidden > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-[#1A1A1A]/70 ring-1 ring-inset ring-[#1A1A1A]/15 transition-colors duration-150 ease-out hover:text-[#E91E8C] hover:ring-[#E91E8C]/40"
          >
            Mostra tutti i tag (+{hidden})
          </button>
        )}
        {expanded && tags.length > VISIBLE && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-[#1A1A1A]/70 ring-1 ring-inset ring-[#1A1A1A]/15 transition-colors duration-150 ease-out hover:text-[#E91E8C] hover:ring-[#E91E8C]/40"
          >
            Mostra meno
          </button>
        )}
      </div>
    </div>
  );
}
