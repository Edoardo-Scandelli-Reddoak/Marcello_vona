'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StarRating from '@/components/StarRating';
import { escortApi, recensioniApi, abbonamentiApi, notificheApi, tagsApi, mediaUrl, MAX_VIDEO_PER_ESCORT, MAX_FOTO_GALLERIA, type Abbonamento, type Notifica, type EscortVideo, type EscortFoto } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Phone, Edit2, Save, Sparkles, AlertCircle, Calendar, MapPin, Loader2, Bell, X, Video, Image as ImageIcon, Trash2, Plus, Pause, Play, AlertTriangle } from 'lucide-react';

const statusBadge: Record<string, { label: string; className: string }> = {
  in_attesa: { label: 'In attesa di verifica', className: 'bg-yellow-100 text-yellow-800' },
  approvata: { label: 'Approvata', className: 'bg-green-100 text-green-800' },
  rifiutata: { label: 'Rifiutata', className: 'bg-red-100 text-red-800' },
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profilo, setProfilo] = useState<any>(null);
  const [recensioni, setRecensioni] = useState<any[]>([]);
  const [abbonamenti, setAbbonamenti] = useState<Abbonamento[]>([]);
  const [notifiche, setNotifiche] = useState<Notifica[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    nome: '',
    bio: '',
    stato: '',
    telefono: '',
    via: '',
    cap: '',
    citta: '',
    zona: '',
    provincia: '',
    nazione: 'Italia',
    disponibilita: '',
    orari_tipo: '',
    orari_altro: '',
    tariffa_30min: '',
    tariffa_1ora: '',
    onlyfans_url: '',
    instagram_url: '',
    facebook_url: '',
    tiktok_url: '',
    telegram_url: '',
  });

  // Video
  const [videoList, setVideoList] = useState<EscortVideo[]>([]);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Foto galleria
  const [fotoList, setFotoList] = useState<EscortFoto[]>([]);
  const [fotoUploading, setFotoUploading] = useState(false);
  const [fotoError, setFotoError] = useState('');
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // Tag (modificabili anche dopo la registrazione)
  const [availableTags, setAvailableTags] = useState<Array<{ id: number; nome: string }>>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    tagsApi.list().then(setAvailableTags).catch(() => {});
  }, []);

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Pausa & cancellazione
  const [pausaLoading, setPausaLoading] = useState(false);
  const [pausaError, setPausaError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Mi trovo qui
  const [miTrovoIndirizzo, setMiTrovoIndirizzo] = useState('');
  const [miTrovoLoading, setMiTrovoLoading] = useState(false);
  const [miTrovoError, setMiTrovoError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && user?.user_type !== 'escort') {
      router.replace('/dashboard/utente');
      return;
    }
    if (user) {
      Promise.all([
        escortApi.dashboard().catch(() => null),
        abbonamentiApi.miei().catch(() => [] as Abbonamento[]),
        notificheApi.list().catch(() => [] as Notifica[]),
      ])
        .then(([data, abbs, notifs]) => {
          if (data) {
            setProfilo(data);
            setEditData({
              nome: data.nome,
              bio: data.bio,
              stato: data.stato || '',
              telefono: data.telefono || '',
              via: data.via || '',
              cap: data.cap || '',
              citta: data.citta,
              zona: data.zona || '',
              provincia: data.provincia || '',
              nazione: data.nazione || 'Italia',
              disponibilita: data.disponibilita || '',
              orari_tipo: data.orari_tipo || '',
              orari_altro: data.orari_altro || '',
              tariffa_30min: data.tariffa_30min != null ? String(data.tariffa_30min) : '',
              tariffa_1ora: data.tariffa_1ora != null ? String(data.tariffa_1ora) : '',
              onlyfans_url: data.onlyfans_url || '',
              instagram_url: data.instagram_url || '',
              facebook_url: data.facebook_url || '',
              tiktok_url: data.tiktok_url || '',
              telegram_url: data.telegram_url || '',
            });
            setVideoList(Array.isArray(data.video) ? data.video : []);
            setFotoList(Array.isArray(data.galleria) ? data.galleria : []);
            // I tag arrivano come array di {id, nome}. Pre-popolo il Set per
            // mostrare i chip già attivi nel form di modifica.
            if (Array.isArray(data.tags)) {
              setSelectedTagIds(new Set(data.tags.map((t: any) => t.id)));
            }
            if (data.slug) {
              recensioniApi.list(data.slug).then(setRecensioni).catch(() => {});
            }
          }
          setAbbonamenti(abbs || []);
          setNotifiche(notifs || []);
        })
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <div className="py-20 text-center text-[#1A1A1A]/40">Caricamento...</div>;
  }

  if (!profilo) {
    return <div className="py-20 text-center text-[#1A1A1A]/40">Scheda non trovata.</div>;
  }

  const status = statusBadge[profilo.stato_approvazione] || statusBadge.in_attesa;
  const abbStandard = abbonamenti.find((a) => a.is_attivo && a.piano.tipo === 'standard');
  const abbEvidenza = abbonamenti.find((a) => a.is_attivo && a.piano.tipo === 'evidenza');
  const abbAttivo = abbStandard || abbEvidenza;
  const profiloVisibile = Boolean(abbAttivo);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1A1A1A] sm:text-3xl">Scheda personale</h1>
        <Badge className={status.className}>{status.label}</Badge>
      </div>

      {/* Notifiche non lette */}
      {notifiche.filter((n) => !n.letta).length > 0 && (
        <div className="mb-6 space-y-3">
          {notifiche.filter((n) => !n.letta).map((n) => (
            <div
              key={n.id}
              className="flex flex-wrap items-start gap-3 rounded-2xl border border-[#E91E8C]/25 bg-[#E91E8C]/[0.06] p-4 sm:flex-nowrap"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#E91E8C]/10">
                <Bell className="h-4 w-4 text-[#E91E8C]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#1A1A1A]">{n.titolo}</h3>
                <p className="mt-1 text-sm text-[#1A1A1A]/75">{n.messaggio}</p>
                <p className="mt-1 text-xs text-[#1A1A1A]/40">
                  {new Date(n.created_at).toLocaleString('it-IT')}
                </p>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                {n.link && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      await notificheApi.marcaLetta(n.id).catch(() => {});
                      router.push(n.link);
                    }}
                    className="flex-1 bg-[#E91E8C] text-white hover:bg-[#D11A7D] sm:flex-none"
                  >
                    Apri
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Segna come letta"
                  onClick={async () => {
                    await notificheApi.marcaLetta(n.id).catch(() => {});
                    setNotifiche((prev) => prev.map((x) => x.id === n.id ? { ...x, letta: true } : x));
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Banner pausa attiva */}
      {profilo.in_pausa && (
        <div className="mb-6 flex flex-wrap items-start gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:flex-nowrap">
          <Pause className="h-6 w-6 flex-shrink-0 text-amber-700" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">Scheda in pausa</h3>
            <p className="mt-1 text-sm text-amber-800">
              La tua scheda è nascosta dalle ricerche e dalla mappa. Puoi riattivarla in qualsiasi momento.
            </p>
            {pausaError && (
              <p className="mt-2 text-sm text-red-600">{pausaError}</p>
            )}
          </div>
          <Button
            disabled={pausaLoading}
            onClick={async () => {
              setPausaError('');
              setPausaLoading(true);
              try {
                await escortApi.setPausa(false);
                const refreshed = await escortApi.dashboard();
                setProfilo(refreshed);
              } catch (e: any) {
                setPausaError(e.message || 'Errore.');
              } finally {
                setPausaLoading(false);
              }
            }}
            className="w-full bg-[#E91E8C] text-white hover:bg-[#D11A7D] sm:w-auto"
          >
            {pausaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Play className="mr-2 h-4 w-4" /> Riattiva scheda</>)}
          </Button>
        </div>
      )}

      {/* Subscription banner */}
      {!profiloVisibile ? (
        <div className="mb-6 flex flex-wrap items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-nowrap">
          <AlertCircle className="h-6 w-6 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">Scheda non ancora pubblicata</h3>
            <p className="mt-1 text-sm text-amber-800">
              Per rendere la tua scheda visibile agli utenti, acquista un abbonamento.
            </p>
          </div>
          <Button
            onClick={() => router.push('/abbonamento')}
            className="w-full bg-[#E91E8C] text-white hover:bg-[#D11A7D] sm:w-auto"
          >
            Vedi i piani
          </Button>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-[#1A1A1A]/10 bg-white p-5">
          <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap sm:gap-4">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${abbEvidenza ? 'bg-[#E91E8C]/10' : 'bg-green-100'}`}>
              {abbEvidenza ? (
                <Sparkles className="h-5 w-5 text-[#E91E8C]" />
              ) : (
                <Calendar className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#1A1A1A]">
                Abbonamento attivo
                {abbEvidenza && <span className="ml-2 text-sm text-[#E91E8C]">— in Evidenza</span>}
              </h3>
              <ul className="mt-1 space-y-1 text-sm text-[#1A1A1A]/70">
                {abbStandard && (
                  <li>
                    Standard: <strong>{abbStandard.piano.nome}</strong> — fino al{' '}
                    {abbStandard.scadenza && new Date(abbStandard.scadenza).toLocaleDateString('it-IT')}
                  </li>
                )}
                {abbEvidenza && (
                  <li>
                    Evidenza: <strong>{abbEvidenza.piano.nome}</strong> — fino al{' '}
                    {abbEvidenza.scadenza && new Date(abbEvidenza.scadenza).toLocaleDateString('it-IT')}
                  </li>
                )}
              </ul>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/abbonamento')}
              className="w-full sm:w-auto"
            >
              Rinnova / Acquista
            </Button>
          </div>
        </div>
      )}

      {/* Scheda personale */}
      <div className="mb-8 rounded-2xl border border-[#1A1A1A]/10 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full sm:h-20 sm:w-20">
            <Image
              src={mediaUrl(profilo.foto_profilo)}
              alt={profilo.nome}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={editData.nome} onChange={(e) => setEditData({ ...editData, nome: e.target.value })} />
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea value={editData.bio} onChange={(e) => setEditData({ ...editData, bio: e.target.value })} rows={3} />
                </div>
                <div>
                  <Label>Stato</Label>
                  <Input
                    value={editData.stato}
                    onChange={(e) => setEditData({ ...editData, stato: e.target.value })}
                    maxLength={80}
                    placeholder='Es. "Sempre disponibile", "Contattami subito"…'
                  />
                  <p className="mt-1 text-xs text-[#1A1A1A]/55">
                    Frase breve mostrata sotto il tuo nome nelle card.
                  </p>
                </div>
                <div>
                  <Label>Telefono</Label>
                  <Input value={editData.telefono} onChange={(e) => setEditData({ ...editData, telefono: e.target.value })} />
                </div>
                <div>
                  <Label>Via / Indirizzo</Label>
                  <Input
                    value={editData.via}
                    onChange={(e) => setEditData({ ...editData, via: e.target.value })}
                    placeholder='Es. "Via Roma 42"'
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CAP</Label>
                    <Input
                      value={editData.cap}
                      onChange={(e) => setEditData({ ...editData, cap: e.target.value })}
                      maxLength={5}
                      placeholder="20121"
                    />
                  </div>
                  <div>
                    <Label>Città</Label>
                    <Input value={editData.citta} onChange={(e) => setEditData({ ...editData, citta: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Provincia (sigla)</Label>
                    <Input
                      value={editData.provincia}
                      onChange={(e) => setEditData({ ...editData, provincia: e.target.value.toUpperCase() })}
                      maxLength={2}
                      placeholder="MI"
                    />
                  </div>
                  <div>
                    <Label>Stato</Label>
                    <Input
                      value={editData.nazione}
                      onChange={(e) => setEditData({ ...editData, nazione: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Tag</Label>
                  <p className="mb-2 text-xs text-[#1A1A1A]/55">
                    Seleziona o deseleziona i tag che ti rappresentano. Aiutano gli utenti a trovarti.
                  </p>
                  {availableTags.length === 0 ? (
                    <p className="text-xs text-[#1A1A1A]/40">Caricamento…</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((t) => {
                        const active = selectedTagIds.has(t.id);
                        return (
                          <button
                            type="button"
                            key={t.id}
                            onClick={() => toggleTag(t.id)}
                            className={`rounded-full px-3 py-1.5 text-sm transition-colors duration-150 ease-out ${
                              active
                                ? 'bg-[#E91E8C] text-white ring-1 ring-[#E91E8C]'
                                : 'bg-white text-[#1A1A1A]/70 ring-1 ring-[#1A1A1A]/15 hover:ring-[#E91E8C]/40 hover:text-[#1A1A1A]'
                            }`}
                            aria-pressed={active}
                          >
                            {t.nome}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedTagIds.size > 0 && (
                    <p className="mt-2 text-xs text-[#1A1A1A]/50">
                      {selectedTagIds.size} {selectedTagIds.size === 1 ? 'tag selezionato' : 'tag selezionati'}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Zona (opzionale)</Label>
                  <Input
                    value={editData.zona}
                    onChange={(e) => setEditData({ ...editData, zona: e.target.value })}
                    placeholder='Es. "Centro", "Navigli"'
                  />
                  <p className="mt-1 text-xs text-[#1A1A1A]/55">
                    Mostrata accanto alla città sotto al tuo nome. Se cambi via/cap/città/provincia, la posizione sulla mappa si aggiorna automaticamente al salvataggio.
                  </p>
                </div>
                <div>
                  <Label>Disponibilità</Label>
                  <select
                    value={editData.disponibilita}
                    onChange={(e) => setEditData({ ...editData, disponibilita: e.target.value })}
                    className="w-full h-10 rounded-lg border border-[#1A1A1A]/10 px-3 text-sm"
                  >
                    <option value="">Non specificato</option>
                    <option value="ricevo">Ricevo (incall)</option>
                    <option value="altrui">Altrui (outcall)</option>
                    <option value="entrambe">Ricevo / Altrui</option>
                  </select>
                </div>
                <div>
                  <Label>Orari disponibilità</Label>
                  <select
                    value={editData.orari_tipo}
                    onChange={(e) => setEditData({ ...editData, orari_tipo: e.target.value })}
                    className="w-full h-10 rounded-lg border border-[#1A1A1A]/10 px-3 text-sm"
                  >
                    <option value="">Non specificato</option>
                    <option value="24_7">24/7</option>
                    <option value="h24">H24</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
                {editData.orari_tipo === 'altro' && (
                  <div>
                    <Label>Specifica orari</Label>
                    <Input
                      value={editData.orari_altro}
                      onChange={(e) => setEditData({ ...editData, orari_altro: e.target.value })}
                      maxLength={200}
                      placeholder='Es. "Lun-Ven 10-22"'
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tariffa 30 min (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editData.tariffa_30min}
                      onChange={(e) => setEditData({ ...editData, tariffa_30min: e.target.value })}
                      placeholder="Es. 100"
                    />
                  </div>
                  <div>
                    <Label>Tariffa 1 ora (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editData.tariffa_1ora}
                      onChange={(e) => setEditData({ ...editData, tariffa_1ora: e.target.value })}
                      placeholder="Es. 200"
                    />
                  </div>
                </div>
                <div>
                  <Label>Link OnlyFans</Label>
                  <Input
                    type="url"
                    value={editData.onlyfans_url}
                    onChange={(e) => setEditData({ ...editData, onlyfans_url: e.target.value })}
                    placeholder="https://onlyfans.com/tuo_profilo"
                  />
                </div>
                <div>
                  <Label>Link Instagram</Label>
                  <Input
                    type="url"
                    value={editData.instagram_url}
                    onChange={(e) => setEditData({ ...editData, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/tuo_profilo"
                  />
                </div>
                <div>
                  <Label>Link Facebook</Label>
                  <Input
                    type="url"
                    value={editData.facebook_url}
                    onChange={(e) => setEditData({ ...editData, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/tuo_profilo"
                  />
                </div>
                <div>
                  <Label>Link TikTok</Label>
                  <Input
                    type="url"
                    value={editData.tiktok_url}
                    onChange={(e) => setEditData({ ...editData, tiktok_url: e.target.value })}
                    placeholder="https://tiktok.com/@tuo_profilo"
                  />
                </div>
                <div>
                  <Label>Link Telegram</Label>
                  <Input
                    type="url"
                    value={editData.telegram_url}
                    onChange={(e) => setEditData({ ...editData, telegram_url: e.target.value })}
                    placeholder="https://t.me/tuo_profilo"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setEditing(false)} variant="outline">Annulla</Button>
                  <Button
                    onClick={async () => {
                      const fd = new FormData();
                      Object.entries(editData).forEach(([k, v]) => {
                        // Tariffe vuote → non inviare il campo (resta null sul DB)
                        if ((k === 'tariffa_30min' || k === 'tariffa_1ora') && !v) return;
                        fd.append(k, v);
                      });
                      // Tag: FormData supporta più valori per la stessa chiave;
                      // DRF PrimaryKeyRelatedField(many=True) li accetta come lista.
                      // Se l'escort ha deselezionato tutto, mando comunque la chiave
                      // (con valore "") per forzare lo svuotamento — altrimenti DRF
                      // non vedrebbe il campo e i vecchi tag resterebbero.
                      if (selectedTagIds.size === 0) {
                        fd.append('tags', '');
                      } else {
                        selectedTagIds.forEach((id) => fd.append('tags', String(id)));
                      }
                      try {
                        const updated = await escortApi.updateDashboard(fd);
                        setProfilo(updated);
                        setEditing(false);
                      } catch (e: any) {
                        // Niente più catch muto: mostra l'errore così l'utente sa che il
                        // salvataggio è fallito (prima sembrava ok ma non salvava niente).
                        alert(`Errore nel salvataggio: ${e?.message || 'riprova tra un attimo'}`);
                      }
                    }}
                    className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]"
                  >
                    <Save className="mr-2 h-4 w-4" /> Salva
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{profilo.nome}</h2>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1 text-sm text-[#1A1A1A]/60">{profilo.categoria_nome}</p>
                {profilo.stato && (
                  <p className="mt-1 text-sm font-medium text-[#E91E8C]">{profilo.stato}</p>
                )}
                <p className="mt-2 text-sm text-[#1A1A1A]/70">{profilo.bio}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Indirizzo pubblico (modificabile) */}
      <div className="mb-8 rounded-2xl border border-[#E91E8C]/20 bg-gradient-to-br from-[#E91E8C]/5 to-transparent p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#E91E8C]/10">
            <MapPin className="h-5 w-5 text-[#E91E8C]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[#1A1A1A]">Indirizzo pubblico</h3>
            <p className="mt-1 text-sm text-[#1A1A1A]/60">
              È l&apos;indirizzo mostrato sulla tua scheda pubblica e sulla mappa. Aggiornalo ogni volta che ti sposti — la mappa si aggiornerà al volo. Il tuo indirizzo privato non cambia.
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-white p-4 text-sm ring-1 ring-[#1A1A1A]/[0.06]">
          <p className="text-[#1A1A1A]/55">Indirizzo pubblico attuale</p>
          <p className="mt-0.5 font-medium text-[#1A1A1A]">
            {profilo.via}, {profilo.cap} {profilo.citta} ({profilo.provincia})
          </p>
          {profilo.indirizzo_pubblico_aggiornato_at && (
            <p className="mt-0.5 text-xs text-[#1A1A1A]/40">
              Aggiornato: {new Date(profilo.indirizzo_pubblico_aggiornato_at).toLocaleString('it-IT')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[260px]">
            <Label>Nuovo indirizzo pubblico</Label>
            <Input
              placeholder='Es. "Via Roma 42, Milano" o "Hotel Bellavista, Verona"'
              value={miTrovoIndirizzo}
              onChange={(e) => setMiTrovoIndirizzo(e.target.value)}
              disabled={miTrovoLoading}
            />
          </div>
          <Button
            disabled={miTrovoLoading || !miTrovoIndirizzo.trim()}
            onClick={async () => {
              setMiTrovoError('');
              setMiTrovoLoading(true);
              try {
                await escortApi.setMiTrovoQui(miTrovoIndirizzo.trim());
                const refreshed = await escortApi.dashboard();
                setProfilo(refreshed);
                setMiTrovoIndirizzo('');
              } catch (e: any) {
                setMiTrovoError(e.message || 'Indirizzo non riconosciuto.');
              } finally {
                setMiTrovoLoading(false);
              }
            }}
            className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]"
          >
            {miTrovoLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Aggiorna
              </>
            )}
          </Button>
        </div>
        {miTrovoError && (
          <p className="mt-3 text-sm text-red-600">{miTrovoError}</p>
        )}
      </div>

      {/* Gestione foto galleria */}
      <div className="mb-8 rounded-2xl border border-[#1A1A1A]/10 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#E91E8C]/10">
            <ImageIcon className="h-5 w-5 text-[#E91E8C]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[#1A1A1A]">La tua galleria foto</h3>
            <p className="mt-1 text-sm text-[#1A1A1A]/60">
              Puoi caricare fino a {MAX_FOTO_GALLERIA} foto nella tua galleria pubblica. La foto profilo (mostrata in cima alla scheda) si modifica separatamente.
            </p>
          </div>
        </div>

        {fotoError && (
          <p className="mb-3 text-sm text-red-600">{fotoError}</p>
        )}

        {fotoList.length === 0 ? (
          <p className="mb-3 text-sm text-[#1A1A1A]/50">Nessuna foto in galleria.</p>
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {fotoList.map((f) => (
              <div key={f.id} className="relative overflow-hidden rounded-xl border border-[#1A1A1A]/10 bg-[#F8F7F5]">
                <div className="relative aspect-[3/4] w-full">
                  <Image
                    src={mediaUrl(f.immagine)}
                    alt="Foto galleria"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Elimina foto"
                  onClick={async () => {
                    if (!confirm('Vuoi eliminare questa foto dalla galleria?')) return;
                    try {
                      await escortApi.deleteFoto(f.id);
                      setFotoList((prev) => prev.filter((x) => x.id !== f.id));
                    } catch (e: any) {
                      setFotoError(e.message || 'Errore durante l\'eliminazione.');
                    }
                  }}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-600 shadow-sm transition-colors hover:bg-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {fotoList.length < MAX_FOTO_GALLERIA && (
          <div>
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFotoError('');
                setFotoUploading(true);
                try {
                  const created = await escortApi.addFoto(file);
                  setFotoList((prev) => [...prev, created]);
                } catch (err: any) {
                  setFotoError(err.message || 'Caricamento fallito.');
                } finally {
                  setFotoUploading(false);
                  if (fotoInputRef.current) fotoInputRef.current.value = '';
                }
              }}
            />
            <Button
              onClick={() => fotoInputRef.current?.click()}
              disabled={fotoUploading}
              className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]"
            >
              {fotoUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Caricamento…
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" /> Aggiungi foto
                </>
              )}
            </Button>
            <p className="mt-2 text-xs text-[#1A1A1A]/55">
              {fotoList.length}/{MAX_FOTO_GALLERIA} foto caricate.
            </p>
          </div>
        )}
      </div>

      {/* Gestione video */}
      <div className="mb-8 rounded-2xl border border-[#1A1A1A]/10 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#E91E8C]/10">
            <Video className="h-5 w-5 text-[#E91E8C]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[#1A1A1A]">I tuoi video</h3>
            <p className="mt-1 text-sm text-[#1A1A1A]/60">
              Puoi caricare fino a {MAX_VIDEO_PER_ESCORT} video brevi sulla tua scheda. Sono mostrati insieme alla galleria foto.
            </p>
          </div>
        </div>

        {videoError && (
          <p className="mb-3 text-sm text-red-600">{videoError}</p>
        )}

        {videoList.length === 0 ? (
          <p className="mb-3 text-sm text-[#1A1A1A]/50">Nessun video caricato.</p>
        ) : (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {videoList.map((v) => (
              <div key={v.id} className="relative overflow-hidden rounded-xl border border-[#1A1A1A]/10 bg-[#F8F7F5]">
                <video
                  src={mediaUrl(v.video)}
                  className="aspect-video w-full object-cover"
                  controls
                  preload="metadata"
                />
                <button
                  type="button"
                  aria-label="Elimina video"
                  onClick={async () => {
                    if (!confirm('Vuoi eliminare questo video?')) return;
                    try {
                      await escortApi.deleteVideo(v.id);
                      setVideoList((prev) => prev.filter((x) => x.id !== v.id));
                    } catch (e: any) {
                      setVideoError(e.message || 'Errore durante l\'eliminazione.');
                    }
                  }}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-600 shadow-sm transition-colors hover:bg-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {videoList.length < MAX_VIDEO_PER_ESCORT && (
          <div>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setVideoError('');
                setVideoUploading(true);
                try {
                  const created = await escortApi.addVideo(file);
                  setVideoList((prev) => [...prev, created]);
                } catch (err: any) {
                  setVideoError(err.message || 'Caricamento fallito.');
                } finally {
                  setVideoUploading(false);
                  if (videoInputRef.current) videoInputRef.current.value = '';
                }
              }}
            />
            <Button
              onClick={() => videoInputRef.current?.click()}
              disabled={videoUploading}
              className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]"
            >
              {videoUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Caricamento…
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" /> Aggiungi video
                </>
              )}
            </Button>
            <p className="mt-2 text-xs text-[#1A1A1A]/55">
              {videoList.length}/{MAX_VIDEO_PER_ESCORT} video caricati.
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#1A1A1A]/10 bg-white p-5 text-center">
          <Phone className="mx-auto mb-2 h-6 w-6 text-[#E91E8C]" />
          <p className="text-2xl font-bold">{profilo.click_telefono || 0}</p>
          <p className="text-xs text-[#1A1A1A]/60">Click telefono</p>
        </div>
        <div className="rounded-xl border border-[#1A1A1A]/10 bg-white p-5 text-center">
          <div className="mx-auto mb-2 flex justify-center">
            <StarRating value={Math.round(profilo.rating || 0)} readonly size="sm" />
          </div>
          <p className="text-2xl font-bold">{profilo.rating || 0}</p>
          <p className="text-xs text-[#1A1A1A]/60">{profilo.numero_recensioni || 0} recensioni</p>
        </div>
      </div>

      {/* Gestione scheda: pausa / cancellazione */}
      <div className="mb-8 rounded-2xl border border-[#1A1A1A]/10 bg-white p-5 sm:p-6">
        <h3 className="mb-1 font-semibold text-[#1A1A1A]">Gestione scheda</h3>
        <p className="mb-4 text-sm text-[#1A1A1A]/60">
          Puoi mettere temporaneamente in pausa la tua scheda (massimo una pausa al mese) oppure cancellarla definitivamente.
        </p>

        {pausaError && !profilo.in_pausa && (
          <p className="mb-3 text-sm text-red-600">{pausaError}</p>
        )}

        <div className="flex flex-wrap gap-3">
          {!profilo.in_pausa && (
            <Button
              variant="outline"
              disabled={pausaLoading}
              onClick={async () => {
                if (!confirm('Vuoi davvero mettere in pausa la tua scheda? Sarà nascosta dalle ricerche fino alla riattivazione. Potrai riattivarla quando vuoi, ma potrai metterla in pausa di nuovo solo dopo 30 giorni.')) return;
                setPausaError('');
                setPausaLoading(true);
                try {
                  await escortApi.setPausa(true);
                  const refreshed = await escortApi.dashboard();
                  setProfilo(refreshed);
                } catch (e: any) {
                  setPausaError(e.message || 'Errore.');
                } finally {
                  setPausaLoading(false);
                }
              }}
              className="border-amber-400 text-amber-700 hover:bg-amber-50"
            >
              {pausaLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Pause className="mr-2 h-4 w-4" />
              )}
              Metti in pausa
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => { setDeleteConfirmText(''); setDeleteOpen(true); }}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Cancella scheda
          </Button>
        </div>

        {profilo.prossima_pausa_disponibile_at && !profilo.in_pausa && (
          <p className="mt-3 text-xs text-[#1A1A1A]/55">
            Hai già usato la pausa di questo mese. Potrai metterla di nuovo in pausa dal{' '}
            {new Date(profilo.prossima_pausa_disponibile_at).toLocaleDateString('it-IT')}.
          </p>
        )}
      </div>

      {/* Dialog conferma cancellazione */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1A1A1A]">Cancella la tua scheda</h3>
                <p className="mt-1 text-sm text-[#1A1A1A]/65">
                  L&apos;azione è <strong>irreversibile</strong>: foto, video, recensioni e tutte le informazioni della scheda verranno eliminati. Il tuo account utente rimane attivo.
                </p>
              </div>
            </div>
            <div className="mb-3">
              <Label>Per confermare, scrivi <strong>CANCELLA</strong> qui sotto:</Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="CANCELLA"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
                Annulla
              </Button>
              <Button
                disabled={deleteLoading || deleteConfirmText.trim() !== 'CANCELLA'}
                onClick={async () => {
                  setDeleteLoading(true);
                  try {
                    await escortApi.cancellaScheda();
                    // Dopo la cancellazione la scheda non c'è più: porto l'utente alla home.
                    router.push('/');
                  } catch (e: any) {
                    alert(e.message || 'Errore durante la cancellazione.');
                    setDeleteLoading(false);
                  }
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancella definitivamente'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews */}
      <h2 className="mb-4 text-xl font-bold text-[#1A1A1A]">Recensioni ricevute</h2>
      <div className="space-y-3">
        {recensioni.map((r: any) => (
          <div key={r.id} className="rounded-xl border border-[#1A1A1A]/10 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium">{r.autore_nome}</span>
              <span className="text-xs text-[#1A1A1A]/40">
                {new Date(r.created_at).toLocaleDateString('it-IT')}
              </span>
            </div>
            <StarRating value={r.stelle} readonly size="sm" />
            <p className="mt-1 text-sm text-[#1A1A1A]/70">{r.testo}</p>
          </div>
        ))}
        {recensioni.length === 0 && (
          <p className="text-[#1A1A1A]/40">Nessuna recensione ancora.</p>
        )}
      </div>
    </div>
  );
}
