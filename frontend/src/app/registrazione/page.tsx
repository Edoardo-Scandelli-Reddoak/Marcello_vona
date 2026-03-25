'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { professionisteApi } from '@/lib/api';

const steps = [
  'Crea account',
  'Il tuo profilo',
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

  // Step 1
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Step 2
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [bio, setBio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [via, setVia] = useState('');
  const [cap, setCap] = useState('');
  const [citta, setCitta] = useState('');
  const [provincia, setProvincia] = useState('');
  const [nazione, setNazione] = useState('Italia');

  // Step 3
  const [fotoProfilo, setFotoProfilo] = useState<File | null>(null);
  const [galleria, setGalleria] = useState<File[]>([]);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const galleriaInputRef = useRef<HTMLInputElement>(null);

  // Step 4
  const [docFronte, setDocFronte] = useState<File | null>(null);
  const [docRetro, setDocRetro] = useState<File | null>(null);
  const [privacy, setPrivacy] = useState(false);
  const [termini, setTermini] = useState(false);

  const handleStep1 = async () => {
    setError('');
    if (password !== passwordConfirm) {
      setError('Le password non corrispondono.');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, 'professionista');
      setStep(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = () => {
    if (!nome || !categoria || !telefono || !via || !cap || !citta || !provincia) {
      setError('Compila tutti i campi obbligatori.');
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
      formData.append('telefono', telefono);
      formData.append('via', via);
      formData.append('cap', cap);
      formData.append('citta', citta);
      formData.append('provincia', provincia);
      formData.append('nazione', nazione);
      formData.append('foto_profilo', fotoProfilo!);
      formData.append('documento_fronte', docFronte);
      formData.append('documento_retro', docRetro);
      formData.append('privacy_accettata', 'true');
      formData.append('termini_accettati', 'true');
      galleria.forEach((f) => formData.append('galleria', f));

      await professionisteApi.register(formData);
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[#1A1A1A]">Iscriviti come professionista</h1>

      {/* Progress */}
      <div className="mb-8 flex gap-1">
        {steps.map((s, i) => (
          <div key={i} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${
                i <= step ? 'bg-[#E91E8C]' : 'bg-[#1A1A1A]/10'
              }`}
            />
            <span className={`mt-1 block text-xs ${i === step ? 'font-medium text-[#E91E8C]' : 'text-[#1A1A1A]/40'}`}>
              {s}
            </span>
          </div>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

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

      {/* Step 2 — Profile */}
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
            >
              <option value="">Seleziona...</option>
              <option value="1">Massaggi</option>
              <option value="2">Yoga</option>
              <option value="3">Relax</option>
            </select>
          </div>
          <div>
            <Label>Tag (separati da virgola)</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="domicilio, weekend..." />
          </div>
          <div>
            <Label>Bio / Descrizione</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
          </div>
          <div>
            <Label>Telefono *</Label>
            <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} required />
          </div>
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
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>Indietro</Button>
            <Button onClick={handleStep3} className="flex-1 bg-[#E91E8C] text-white hover:bg-[#D11A7D]">Continua</Button>
          </div>
        </div>
      )}

      {/* Step 4 — Identity */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="rounded-lg bg-[#E91E8C]/5 p-3 text-sm text-[#1A1A1A]/60">
            Il documento è visibile solo al team di moderazione. Non sarà mai pubblicato pubblicamente.
          </p>
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
          <h2 className="mb-2 text-2xl font-bold text-[#1A1A1A]">Richiesta inviata!</h2>
          <p className="mb-6 text-[#1A1A1A]/60">
            Il tuo profilo sarà visibile dopo la verifica del documento da parte del nostro team.
            Riceverai una notifica via email.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
            Vai alla dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
