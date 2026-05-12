'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StarRating from '@/components/StarRating';
import { professionisteApi, recensioniApi, abbonamentiApi, notificheApi, mediaUrl, type Abbonamento, type Notifica } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Phone, Edit2, Save, Sparkles, AlertCircle, Calendar, MapPin, Loader2, Bell, X } from 'lucide-react';

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
    citta: '',
    onlyfans_url: '',
    instagram_url: '',
    facebook_url: '',
    tiktok_url: '',
    telegram_url: '',
  });

  // Mi trovo qui
  const [miTrovoIndirizzo, setMiTrovoIndirizzo] = useState('');
  const [miTrovoLoading, setMiTrovoLoading] = useState(false);
  const [miTrovoError, setMiTrovoError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && user?.user_type !== 'professionista') {
      router.replace('/dashboard/utente');
      return;
    }
    if (user) {
      Promise.all([
        professionisteApi.dashboard().catch(() => null),
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
              citta: data.citta,
              onlyfans_url: data.onlyfans_url || '',
              instagram_url: data.instagram_url || '',
              facebook_url: data.facebook_url || '',
              tiktok_url: data.tiktok_url || '',
              telegram_url: data.telegram_url || '',
            });
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
    return <div className="py-20 text-center text-[#1A1A1A]/40">Profilo non trovato.</div>;
  }

  const status = statusBadge[profilo.stato] || statusBadge.in_attesa;
  const abbStandard = abbonamenti.find((a) => a.is_attivo && a.piano.tipo === 'standard');
  const abbEvidenza = abbonamenti.find((a) => a.is_attivo && a.piano.tipo === 'evidenza');
  const abbAttivo = abbStandard || abbEvidenza;
  const profiloVisibile = Boolean(abbAttivo);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1A1A1A] sm:text-3xl">Dashboard</h1>
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

      {/* Subscription banner */}
      {!profiloVisibile ? (
        <div className="mb-6 flex flex-wrap items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-nowrap">
          <AlertCircle className="h-6 w-6 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">Profilo non ancora pubblicato</h3>
            <p className="mt-1 text-sm text-amber-800">
              Per rendere il tuo profilo visibile agli utenti, acquista un abbonamento.
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

      {/* Profile Card */}
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
                  <Label>Città</Label>
                  <Input value={editData.citta} onChange={(e) => setEditData({ ...editData, citta: e.target.value })} />
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
                      Object.entries(editData).forEach(([k, v]) => fd.append(k, v));
                      try {
                        const updated = await professionisteApi.updateDashboard(fd);
                        setProfilo(updated);
                        setEditing(false);
                      } catch {}
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
              È l&apos;indirizzo mostrato sul tuo profilo e sulla mappa. Aggiornalo ogni volta che ti sposti — la mappa si aggiornerà al volo. Il tuo indirizzo privato non cambia.
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
                await professionisteApi.setMiTrovoQui(miTrovoIndirizzo.trim());
                const refreshed = await professionisteApi.dashboard();
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
