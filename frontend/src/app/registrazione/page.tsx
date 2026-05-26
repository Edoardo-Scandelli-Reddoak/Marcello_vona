'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { escortApi, tagsApi, type Categoria } from '@/lib/api';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

interface Tag {
  id: number;
  nome: string;
}

const steps = [
  'Crea account',
  'La tua scheda',
  'Le tue foto',
  'Verifica identità',
  'Conferma',
];

export default function RegistrazionePage() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  // Step 1
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Step 2
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categorieOpts, setCategorieOpts] = useState<Categoria[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [bio, setBio] = useState('');
  const [stato, setStato] = useState('');
  const [telefono, setTelefono] = useState('');
  // Indirizzo pubblico (mostrato sul sito, modificabile in seguito)
  const [via, setVia] = useState('');
  const [cap, setCap] = useState('');
  const [citta, setCitta] = useState('');
  const [zona, setZona] = useState('');
  const [provincia, setProvincia] = useState('');
  const [nazione, setNazione] = useState('Italia');
  // Disponibilità (incall / outcall) — opzionale
  const [disponibilita, setDisponibilita] = useState('');
  // Orari (preset + testo libero) — opzionale
  const [orariTipo, setOrariTipo] = useState('');
  const [orariAltro, setOrariAltro] = useState('');
  // Tariffe in EUR — opzionali
  const [tariffa30min, setTariffa30min] = useState('');
  const [tariffa1ora, setTariffa1ora] = useState('');
  // Social (opzionali)
  const [onlyfansUrl, setOnlyfansUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');

  // Step 3
  const [fotoProfilo, setFotoProfilo] = useState<File | null>(null);
  const [galleria, setGalleria] = useState<File[]>([]);
  const [video, setVideo] = useState<File[]>([]);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const galleriaInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Step 4
  const [dataNascita, setDataNascita] = useState('');
  const [docFronte, setDocFronte] = useState<File | null>(null);
  const [docRetro, setDocRetro] = useState<File | null>(null);
  const [privacy, setPrivacy] = useState(false);
  const [termini, setTermini] = useState(false);

  useEffect(() => {
    tagsApi.list().then(setAvailableTags).catch(() => setAvailableTags([]));
    escortApi.categorie().then(setCategorieOpts).catch(() => setCategorieOpts([]));
  }, []);

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const today = new Date();
  const maxBirthDate = today.toISOString().split('T')[0];
  const minBirthDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
    .toISOString()
    .split('T')[0];

  const calcolaEta = (iso: string): number | null => {
    if (!iso) return null;
    const dob = new Date(iso);
    if (Number.isNaN(dob.getTime())) return null;
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
    return age;
  };
  const etaCorrente = calcolaEta(dataNascita);

  const handleStep1 = async () => {
    setError('');
    if (!email.trim() || !password || !passwordConfirm) {
      setError('Compila email, password e conferma password.');
      return;
    }
    if (!isEmail(email)) {
      setError('Inserisci un indirizzo email valido.');
      return;
    }
    if (password.length < 8) {
      setError('La password deve avere almeno 8 caratteri.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Le password non corrispondono.');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, 'escort');
      setStep(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = () => {
    const missing: string[] = [];
    if (!nome.trim()) missing.push('Nome visualizzato');
    if (!categoria) missing.push('Categoria');
    if (!telefono.trim()) missing.push('Telefono');
    if (!via.trim()) missing.push('Via / Indirizzo');
    if (!cap.trim()) missing.push('CAP');
    if (!citta.trim()) missing.push('Città');
    if (!provincia.trim()) missing.push('Provincia');
    if (missing.length > 0) {
      setError(`Compila i campi obbligatori mancanti: ${missing.join(', ')}.`);
      return;
    }
    const invalidUrl = (v: string) => v.trim() && !/^https?:\/\//i.test(v.trim());
    if (invalidUrl(onlyfansUrl) || invalidUrl(instagramUrl) || invalidUrl(facebookUrl) || invalidUrl(tiktokUrl) || invalidUrl(telegramUrl)) {
      setError('I link social devono iniziare con http:// o https://.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleStep3 = () => {
    if (!fotoProfilo) {
      setError('La foto profilo è obbligatoria.');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleStep4 = async () => {
    if (!dataNascita) {
      setError('Inserisci la tua data di nascita.');
      return;
    }
    if (etaCorrente === null) {
      setError('Data di nascita non valida.');
      return;
    }
    if (etaCorrente < 18) {
      setError('Devi essere maggiorenne (18+) per registrarti come escort.');
      return;
    }
    if (!docFronte || !docRetro) {
      setError('Carica entrambi i lati del documento.');
      return;
    }
    if (!privacy || !termini) {
      setError('Devi accettare Privacy Policy e Termini.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('categoria', categoria);
      formData.append('bio', bio);
      if (stato.trim()) formData.append('stato', stato.trim());
      formData.append('telefono', telefono);
      // Indirizzo pubblico
      formData.append('via', via);
      formData.append('cap', cap);
      formData.append('citta', citta);
      if (zona.trim()) formData.append('zona', zona.trim());
      formData.append('provincia', provincia);
      formData.append('nazione', nazione);
      // Disponibilità / orari / tariffe (tutti opzionali)
      if (disponibilita) formData.append('disponibilita', disponibilita);
      if (orariTipo) formData.append('orari_tipo', orariTipo);
      if (orariAltro.trim()) formData.append('orari_altro', orariAltro.trim());
      if (tariffa30min) formData.append('tariffa_30min', tariffa30min);
      if (tariffa1ora) formData.append('tariffa_1ora', tariffa1ora);
      // Social (opzionali)
      if (onlyfansUrl.trim()) formData.append('onlyfans_url', onlyfansUrl.trim());
      if (instagramUrl.trim()) formData.append('instagram_url', instagramUrl.trim());
      if (facebookUrl.trim()) formData.append('facebook_url', facebookUrl.trim());
      if (tiktokUrl.trim()) formData.append('tiktok_url', tiktokUrl.trim());
      if (telegramUrl.trim()) formData.append('telegram_url', telegramUrl.trim());
      formData.append('foto_profilo', fotoProfilo!);
      formData.append('documento_fronte', docFronte);
      formData.append('documento_retro', docRetro);
      formData.append('data_nascita', dataNascita);
      formData.append('privacy_accettata', 'true');
      formData.append('termini_accettati', 'true');
      selectedTagIds.forEach((id) => formData.append('tags', String(id)));
      galleria.forEach((f) => formData.append('galleria', f));
      video.forEach((f) => formData.append('video', f));

      await escortApi.register(formData);
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="mb-2 text-2xl font-bold text-[#1A1A1A] sm:text-3xl">Iscriviti come escort</h1>

      {/* Progress */}
      <div className="mb-8 flex gap-1">
        {steps.map((s, i) => (
          <div key={i} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${
                i <= step ? 'bg-[#E91E8C]' : 'bg-[#1A1A1A]/10'
              }`}
            />
            <span className={`mt-1 hidden text-xs sm:block ${i === step ? 'font-medium text-[#E91E8C]' : 'text-[#1A1A1A]/40'}`}>
              {s}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div
          ref={errorRef}
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {/* Step 1 — Account */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <Label>Conferma password</Label>
            <Input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required />
          </div>
          <Button onClick={handleStep1} disabled={loading} className="w-full bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
            {loading ? 'Creazione...' : 'Continua'}
          </Button>
        </div>
      )}

      {/* Step 2 — Scheda */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>Nome visualizzato *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div>
            <Label>Categoria *</Label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full h-10 rounded-lg border border-[#1A1A1A]/10 px-3 text-sm"
              required
              disabled={categorieOpts.length === 0}
            >
              <option value="">Seleziona...</option>
              {categorieOpts.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.label}
                </option>
              ))}
            </select>
            {categorieOpts.length === 0 && (
              <p className="mt-1 text-xs text-[#1A1A1A]/40">Caricamento categorie...</p>
            )}
          </div>
          <div>
            <Label>Tag</Label>
            <p className="mb-2 text-xs text-[#1A1A1A]/55">
              Seleziona tutti i tag che ti rappresentano. Aiuteranno gli utenti a trovarti.
            </p>
            {availableTags.length === 0 ? (
              <p className="text-xs text-[#1A1A1A]/40">Caricamento...</p>
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
            <Label>Bio / Descrizione</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
          </div>
          <div>
            <Label>Stato</Label>
            <Input
              value={stato}
              onChange={(e) => setStato(e.target.value)}
              maxLength={80}
              placeholder='Es. "Sempre disponibile", "Contattami subito"…'
            />
            <p className="mt-1 text-xs text-[#1A1A1A]/55">
              Frase breve mostrata sotto il tuo nome nella card. Potrai modificarla in qualsiasi momento dalla dashboard.
            </p>
          </div>
          <div>
            <Label>Link OnlyFans</Label>
            <Input
              type="url"
              value={onlyfansUrl}
              onChange={(e) => setOnlyfansUrl(e.target.value)}
              placeholder="https://onlyfans.com/tuo_profilo"
            />
          </div>
          <div>
            <Label>Link Instagram</Label>
            <Input
              type="url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/tuo_profilo"
            />
          </div>
          <div>
            <Label>Link Facebook</Label>
            <Input
              type="url"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/tuo_profilo"
            />
          </div>
          <div>
            <Label>Link TikTok</Label>
            <Input
              type="url"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              placeholder="https://tiktok.com/@tuo_profilo"
            />
          </div>
          <div>
            <Label>Link Telegram</Label>
            <Input
              type="url"
              value={telegramUrl}
              onChange={(e) => setTelegramUrl(e.target.value)}
              placeholder="https://t.me/tuo_profilo"
            />
          </div>
          <div>
            <Label>Telefono *</Label>
            <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} required />
          </div>

          {/* INDIRIZZO PUBBLICO */}
          <div className="rounded-xl border border-[#E91E8C]/20 bg-[#E91E8C]/[0.04] p-4">
            <h3 className="mb-1 text-sm font-bold text-[#E91E8C]">Indirizzo</h3>
            <p className="mb-3 text-xs text-[#1A1A1A]/70">
              Questo è l&apos;indirizzo <strong>visibile a tutti gli utenti</strong> sul sito e sulla mappa. <strong>Potrai modificarlo in qualsiasi momento</strong> dalla dashboard.
            </p>
            <div className="space-y-3">
              <div>
                <Label>Via / Indirizzo *</Label>
                <Input value={via} onChange={(e) => setVia(e.target.value)} placeholder="Via Roma 42" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CAP *</Label>
                  <Input value={cap} onChange={(e) => setCap(e.target.value)} placeholder="20121" maxLength={5} required />
                </div>
                <div>
                  <Label>Città *</Label>
                  <Input value={citta} onChange={(e) => setCitta(e.target.value)} required />
                </div>
              </div>
              <div>
                <Label>Zona (opzionale)</Label>
                <Input
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                  placeholder='Es. "Centro", "Navigli", "Stazione Centrale"'
                />
                <p className="mt-1 text-xs text-[#1A1A1A]/55">
                  Mostrata accanto alla città sulla scheda. Lasciala vuota se non vuoi specificarla.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Provincia (sigla) *</Label>
                  <Input value={provincia} onChange={(e) => setProvincia(e.target.value.toUpperCase())} placeholder="MI" maxLength={2} required />
                </div>
                <div>
                  <Label>Stato</Label>
                  <Input value={nazione} onChange={(e) => setNazione(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* DISPONIBILITÀ */}
          <div className="rounded-xl border border-[#1A1A1A]/10 bg-white p-4">
            <h3 className="mb-1 text-sm font-bold text-[#1A1A1A]">Disponibilità (opzionale)</h3>
            <p className="mb-3 text-xs text-[#1A1A1A]/60">
              Indica se ricevi al tuo indirizzo, vai dal cliente, o entrambe. Lascia vuoto se non vuoi specificarlo.
            </p>
            <select
              value={disponibilita}
              onChange={(e) => setDisponibilita(e.target.value)}
              className="w-full h-10 rounded-lg border border-[#1A1A1A]/10 px-3 text-sm"
            >
              <option value="">Non specificato</option>
              <option value="ricevo">Ricevo (incall)</option>
              <option value="altrui">Altrui (outcall)</option>
              <option value="entrambe">Ricevo / Altrui</option>
            </select>
          </div>

          {/* ORARI E TARIFFE */}
          <div className="rounded-xl border border-[#1A1A1A]/10 bg-white p-4">
            <h3 className="mb-1 text-sm font-bold text-[#1A1A1A]">Orari e tariffe (opzionale)</h3>
            <p className="mb-3 text-xs text-[#1A1A1A]/60">
              Tutti i campi sono facoltativi: compila solo quelli che vuoi mostrare sulla scheda.
            </p>

            <div className="space-y-3">
              <div>
                <Label>Orari disponibilità</Label>
                <select
                  value={orariTipo}
                  onChange={(e) => setOrariTipo(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[#1A1A1A]/10 px-3 text-sm"
                >
                  <option value="">Non specificato</option>
                  <option value="24_7">24/7</option>
                  <option value="h24">H24</option>
                  <option value="altro">Altro (specifica sotto)</option>
                </select>
              </div>
              {orariTipo === 'altro' && (
                <div>
                  <Label>Specifica orari</Label>
                  <Input
                    value={orariAltro}
                    onChange={(e) => setOrariAltro(e.target.value)}
                    maxLength={200}
                    placeholder='Es. "Lun-Ven 10-22, Sab su appuntamento"'
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tariffa 30 minuti (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={tariffa30min}
                    onChange={(e) => setTariffa30min(e.target.value)}
                    placeholder="Es. 100"
                  />
                </div>
                <div>
                  <Label>Tariffa 1 ora (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={tariffa1ora}
                    onChange={(e) => setTariffa1ora(e.target.value)}
                    placeholder="Es. 200"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)}>Indietro</Button>
            <Button onClick={handleStep2} className="flex-1 bg-[#E91E8C] text-white hover:bg-[#D11A7D]">Continua</Button>
          </div>
        </div>
      )}

      {/* Step 3 — Photos */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <Label>Foto profilo *</Label>
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFotoProfilo(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm"
            />
            {fotoProfilo && (
              <p className="mt-1 text-xs text-[#1A1A1A]/60">{fotoProfilo.name}</p>
            )}
          </div>
          <div>
            <Label>Galleria (max 10 foto)</Label>
            <input
              ref={galleriaInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []).slice(0, 10);
                setGalleria(files);
              }}
              className="mt-1 block w-full text-sm"
            />
            {galleria.length > 0 && (
              <p className="mt-1 text-xs text-[#1A1A1A]/60">{galleria.length} foto selezionate</p>
            )}
          </div>
          <div>
            <Label>Video (max 5)</Label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []).slice(0, 5);
                setVideo(files);
              }}
              className="mt-1 block w-full text-sm"
            />
            <p className="mt-1 text-xs text-[#1A1A1A]/55">
              Opzionale. Puoi caricare fino a 5 video brevi (mp4, mov…).
            </p>
            {video.length > 0 && (
              <p className="mt-1 text-xs text-[#1A1A1A]/60">{video.length} video selezionati</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>Indietro</Button>
            <Button onClick={handleStep3} className="flex-1 bg-[#E91E8C] text-white hover:bg-[#D11A7D]">Continua</Button>
          </div>
        </div>
      )}

      {/* Step 4 — Identity */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="rounded-lg bg-[#E91E8C]/5 p-3 text-sm text-[#1A1A1A]/70">
            <strong>Verifica età automatica.</strong> La data di nascita che inserisci <em>deve combaciare</em> con quella riportata sul documento d&apos;identità che caricherai qui sotto: <strong>se i due dati non combaciano, la scheda non verrà creata</strong>. Il documento è visibile solo al team di moderazione e non sarà mai reso pubblico.
          </p>
          <div>
            <Label>Data di nascita *</Label>
            <Input
              type="date"
              value={dataNascita}
              onChange={(e) => setDataNascita(e.target.value)}
              min={minBirthDate}
              max={maxBirthDate}
              required
            />
            {etaCorrente !== null && (
              <p className={`mt-1 text-xs ${etaCorrente >= 18 ? 'text-[#1A1A1A]/60' : 'text-red-600'}`}>
                {etaCorrente >= 18
                  ? `Età: ${etaCorrente} anni`
                  : `Devi avere almeno 18 anni per registrarti (attualmente ${etaCorrente}).`}
              </p>
            )}
          </div>
          <div>
            <Label>Documento fronte *</Label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setDocFronte(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm"
            />
          </div>
          <div>
            <Label>Documento retro *</Label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setDocRetro(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
              Accetto la <a href="/privacy" className="text-[#E91E8C] hover:underline">Privacy Policy</a>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={termini} onChange={(e) => setTermini(e.target.checked)} />
              Accetto i <a href="/termini" className="text-[#E91E8C] hover:underline">Termini e condizioni</a>
            </label>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>Indietro</Button>
            <Button onClick={handleStep4} disabled={loading} className="flex-1 bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
              {loading ? 'Invio...' : 'Invia richiesta'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 5 — Confirmation */}
      {step === 4 && (
        <div className="rounded-2xl border border-[#1A1A1A]/10 bg-white p-8 text-center">
          <div className="mb-4 text-5xl">✓</div>
          <h2 className="mb-2 text-2xl font-bold text-[#1A1A1A]">Verifica età completata</h2>
          <p className="mb-2 text-[#1A1A1A]/70">
            Scheda creata correttamente.
          </p>
          <p className="mb-6 text-sm text-[#1A1A1A]/60">
            Per pubblicarla e renderla visibile agli utenti, scegli ora un abbonamento.
          </p>
          <Button onClick={() => router.push('/abbonamento')} className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
            Procedi al pagamento
          </Button>
        </div>
      )}
    </div>
  );
}
