'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { abbonamentiApi, type Abbonamento } from '@/lib/api';

export default function AbbonamentoSuccessoPage() {
  const router = useRouter();
  const search = useSearchParams();
  const sessionId = search.get('session_id');
  const abbonamentoId = search.get('abbonamento_id');
  const isMock = search.get('mock') === 'true';

  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
  const [abbonamento, setAbbonamento] = useState<Abbonamento | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId && !abbonamentoId) {
      setStatus('error');
      setError('Parametri mancanti.');
      return;
    }
    let attempts = 0;
    const maxAttempts = 5;
    let stopped = false;

    const poll = async () => {
      try {
        const res = await abbonamentiApi.checkSession({
          session_id: sessionId || undefined,
          abbonamento_id: abbonamentoId ? Number(abbonamentoId) : undefined,
        });
        if (stopped) return;
        setAbbonamento(res);
        if (res.is_attivo) {
          setStatus('success');
          return;
        }
        attempts += 1;
        if (attempts >= maxAttempts) {
          setStatus('pending');
          return;
        }
        setTimeout(poll, 1500);
      } catch (e: any) {
        if (stopped) return;
        setError(e.message || 'Errore.');
        setStatus('error');
      }
    };
    poll();
    return () => {
      stopped = true;
    };
  }, [sessionId, abbonamentoId]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      {status === 'loading' && (
        <>
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-[#E91E8C]" />
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Stiamo confermando il pagamento...</h1>
          <p className="mt-2 text-[#1A1A1A]/60">Un momento.</p>
        </>
      )}

      {status === 'success' && abbonamento && (
        <>
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            {isMock ? 'Abbonamento attivato (modalità sviluppo)' : 'Pagamento confermato!'}
          </h1>
          <p className="mt-2 text-[#1A1A1A]/60">
            <strong>{abbonamento.piano.tipo_display}</strong> — {abbonamento.piano.nome}
          </p>
          {abbonamento.scadenza && (
            <p className="mt-1 text-sm text-[#1A1A1A]/60">
              Valido fino al {new Date(abbonamento.scadenza).toLocaleDateString('it-IT')}
            </p>
          )}
          <p className="mt-6 max-w-md text-sm text-[#1A1A1A]/60">
            Il tuo profilo è ora pubblicato e visibile a tutti gli utenti.
          </p>
          <div className="mt-8 flex gap-3">
            <Button
              onClick={() => router.push('/dashboard')}
              className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]"
            >
              Vai alla dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              Torna alla home
            </Button>
          </div>
        </>
      )}

      {status === 'pending' && (
        <>
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-[#E91E8C]" />
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Pagamento in elaborazione</h1>
          <p className="mt-2 text-[#1A1A1A]/60">
            Il pagamento è in attesa di conferma. Riceverai una notifica via email
            non appena sarà confermato. Puoi controllare lo stato nella dashboard.
          </p>
          <Button
            onClick={() => router.push('/dashboard')}
            className="mt-6 bg-[#E91E8C] text-white hover:bg-[#D11A7D]"
          >
            Vai alla dashboard
          </Button>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Qualcosa è andato storto</h1>
          <p className="mt-2 text-[#1A1A1A]/60">{error}</p>
          <Button
            onClick={() => router.push('/abbonamento')}
            className="mt-6 bg-[#E91E8C] text-white hover:bg-[#D11A7D]"
          >
            Torna ai piani
          </Button>
        </>
      )}
    </div>
  );
}
