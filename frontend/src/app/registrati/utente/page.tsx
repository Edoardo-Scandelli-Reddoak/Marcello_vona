'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function RegistratiUtentePage() {
  const router = useRouter();
  const search = useSearchParams();
  const { register } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [accetto, setAccetto] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const missing: string[] = [];
    if (!nome.trim()) missing.push('Nome visualizzato');
    if (!email.trim()) missing.push('Email');
    if (!password) missing.push('Password');
    if (!passwordConfirm) missing.push('Conferma password');
    if (missing.length > 0) {
      setError(`Compila i campi obbligatori mancanti: ${missing.join(', ')}.`);
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
    if (!accetto) {
      setError('Devi accettare Privacy Policy e Termini per registrarti.');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, 'user', nome.trim());
      const next = search.get('next') || '/dashboard';
      router.push(next);
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-1 text-3xl font-bold text-[#1A1A1A]">Crea il tuo account utente</h1>
      <p className="mb-8 text-sm text-[#1A1A1A]/60">
        Solo email e password. Potrai salvare i preferiti e lasciare recensioni.
      </p>

      {error && (
        <div
          ref={errorRef}
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nome visualizzato</Label>
          <Input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            placeholder="Es. Marco, Anna, Luca…"
            autoComplete="given-name"
            maxLength={150}
          />
          <p className="mt-1 text-xs text-[#1A1A1A]/55">
            È il nome che verrà mostrato sulle tue recensioni. La tua email resta privata.
          </p>
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        <div>
          <Label>Conferma password</Label>
          <Input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-[#1A1A1A]/75">
          <input
            type="checkbox"
            checked={accetto}
            onChange={(e) => setAccetto(e.target.checked)}
            className="mt-1"
          />
          <span>
            Accetto la <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#E91E8C] hover:underline">Privacy Policy</Link> e i{' '}
            <Link href="/termini" target="_blank" rel="noopener noreferrer" className="text-[#E91E8C] hover:underline">Termini e condizioni</Link>.
          </span>
        </label>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#E91E8C] text-white hover:bg-[#D11A7D]"
        >
          {loading ? 'Creazione...' : 'Crea account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#1A1A1A]/55">
        Hai già un account?{' '}
        <Link href="/login" className="font-medium text-[#E91E8C] hover:underline">Accedi</Link>
      </p>
    </div>
  );
}
