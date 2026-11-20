'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import PasswordInput from '@/components/PasswordInput';
import { authApi } from '@/lib/api';

/**
 * Riquadro "Cambia password" dell'area personale (escort e utenti).
 * Chiuso di default: si apre con un click per non appesantire la dashboard.
 */
export default function CambiaPassword({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [attuale, setAttuale] = useState('');
  const [nuova, setNuova] = useState('');
  const [conferma, setConferma] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setAttuale('');
    setNuova('');
    setConferma('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (nuova !== conferma) {
      setError('Le nuove password non corrispondono.');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({
        old_password: attuale,
        new_password: nuova,
        new_password_confirm: conferma,
      });
      reset();
      setOpen(false);
      setSuccess('Password aggiornata. Dal prossimo accesso usa quella nuova.');
    } catch (err: any) {
      setError(err.message || 'Non è stato possibile aggiornare la password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-[#1A1A1A]/10 bg-white p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-[#1A1A1A]">
            <KeyRound className="h-4 w-4 text-[#E91E8C]" /> Password
          </h3>
          <p className="mt-1 text-sm text-[#1A1A1A]/60">Cambia la password con cui accedi al sito.</p>
        </div>
        {!open && (
          <Button
            variant="outline"
            onClick={() => {
              setSuccess('');
              setOpen(true);
            }}
          >
            Cambia password
          </Button>
        )}
      </div>

      {success && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}

      {open && (
        <form onSubmit={handleSubmit} className="mt-5 max-w-md space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <div>
            <Label htmlFor="cp_attuale">Password attuale</Label>
            <PasswordInput
              id="cp_attuale"
              value={attuale}
              onChange={(e) => setAttuale(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Link href="/password-dimenticata" className="mt-1 inline-block text-xs text-[#E91E8C] hover:underline">
              Non la ricordi?
            </Link>
          </div>
          <div>
            <Label htmlFor="cp_nuova">Nuova password</Label>
            <PasswordInput
              id="cp_nuova"
              value={nuova}
              onChange={(e) => setNuova(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-[#1A1A1A]/50">Almeno 8 caratteri, non solo numeri.</p>
          </div>
          <div>
            <Label htmlFor="cp_conferma">Ripeti la nuova password</Label>
            <PasswordInput
              id="cp_conferma"
              value={conferma}
              onChange={(e) => setConferma(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading} className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salva nuova password'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Annulla
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
