'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import PasswordInput from '@/components/PasswordInput';
import { authApi } from '@/lib/api';

function ReimpostaPasswordForm() {
  const search = useSearchParams();
  const uid = search.get('uid') || '';
  const token = search.get('token') || '';
  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [error, setError] = useState('');
  const [fatto, setFatto] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== conferma) {
      setError('Le password non corrispondono.');
      return;
    }
    setLoading(true);
    try {
      await authApi.confirmPasswordReset({
        uid,
        token,
        new_password: password,
        new_password_confirm: conferma,
      });
      setFatto(true);
    } catch (err: any) {
      setError(err.message || 'Qualcosa è andato storto. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  if (!uid || !token) {
    return (
      <div className="mt-6 rounded-2xl border border-[#1A1A1A]/10 bg-white p-6 text-center">
        <p className="text-sm text-[#1A1A1A]/70">
          Il link non è completo. Aprilo di nuovo dall&apos;email oppure richiedine uno nuovo.
        </p>
        <Link href="/password-dimenticata" className="mt-4 inline-block text-sm text-[#E91E8C] hover:underline">
          Richiedi un nuovo link
        </Link>
      </div>
    );
  }

  if (fatto) {
    return (
      <div className="mt-6 rounded-2xl border border-[#E91E8C]/20 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <p className="font-medium text-[#1A1A1A]">Password reimpostata</p>
        <p className="mt-1 text-sm text-[#1A1A1A]/65">Ora puoi accedere con la nuova password.</p>
        <Link href="/login">
          <Button className="mt-5 bg-[#E91E8C] text-white hover:bg-[#D11A7D]">Vai all&apos;accesso</Button>
        </Link>
      </div>
    );
  }

  const linkScaduto = /scaduto|non è valido/i.test(error);

  return (
    <>
      <p className="mb-8 text-[#1A1A1A]/60">Scegli una nuova password per il tuo account (almeno 8 caratteri).</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
            {linkScaduto && (
              <>
                {' '}
                <Link href="/password-dimenticata" className="font-medium underline">
                  Richiedi un nuovo link
                </Link>
              </>
            )}
          </div>
        )}
        <div>
          <Label htmlFor="new_password">Nuova password</Label>
          <PasswordInput
            id="new_password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label htmlFor="new_password_confirm">Ripeti la nuova password</Label>
          <PasswordInput
            id="new_password_confirm"
            value={conferma}
            onChange={(e) => setConferma(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#E91E8C] text-white hover:bg-[#D11A7D]"
        >
          {loading ? 'Salvataggio...' : 'Salva nuova password'}
        </Button>
      </form>
    </>
  );
}

export default function ReimpostaPasswordPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-3xl font-bold text-[#1A1A1A]">Nuova password</h1>
        <Suspense fallback={null}>
          <ReimpostaPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
