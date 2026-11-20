'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api';

export default function PasswordDimenticataPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [inviata, setInviata] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.requestPasswordReset(email.trim());
      setInviata(res.message);
    } catch (err: any) {
      setError(err.message || 'Qualcosa è andato storto. Riprova tra qualche minuto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-3xl font-bold text-[#1A1A1A]">Password dimenticata</h1>

        {inviata ? (
          <div className="mt-6 rounded-2xl border border-[#E91E8C]/20 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#E91E8C]/10">
              <MailCheck className="h-6 w-6 text-[#E91E8C]" />
            </div>
            <p className="text-sm text-[#1A1A1A]/75">{inviata}</p>
            <p className="mt-3 text-xs text-[#1A1A1A]/50">Il link vale 2 ore.</p>
            <Link href="/login" className="mt-5 inline-block text-sm text-[#E91E8C] hover:underline">
              Torna all&apos;accesso
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-8 text-[#1A1A1A]/60">
              Inserisci l&apos;email con cui ti sei registrata: ti mandiamo un link per scegliere una nuova password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E91E8C] text-white hover:bg-[#D11A7D]"
              >
                {loading ? 'Invio...' : 'Inviami il link'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-[#1A1A1A]/55">
              Ti sei ricordata?{' '}
              <Link href="/login" className="text-[#E91E8C] hover:underline">
                Accedi
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
