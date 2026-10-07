'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EscortCard, { type EscortCardData } from '@/components/EscortCard';
import { escortApi } from '@/lib/api';

interface Props {
  /** Filtri dell'API già applicati alla prima pagina (provincia, categoria). */
  filtri: Record<string, string>;
  iniziali: EscortCardData[];
  totale: number;
}

// La prima pagina arriva già renderizzata dal server (è quella che legge
// Google); le successive si caricano qui col bottone.
export default function RisultatiElenco({ filtri, iniziali, totale }: Props) {
  const [risultati, setRisultati] = useState(iniziali);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState('');

  const caricaAltre = async () => {
    setLoading(true);
    setErrore('');
    try {
      const next = pagina + 1;
      const params = new URLSearchParams({ ...filtri, page: String(next) });
      const data = await escortApi.list(params.toString());
      setRisultati((prev) => [...prev, ...(data.results || [])]);
      setPagina(next);
    } catch {
      setErrore('Caricamento non riuscito, riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {risultati.map((p) => (
          <EscortCard key={p.id} escort={p} />
        ))}
      </div>
      {risultati.length < totale && (
        <div className="mt-8 text-center">
          <Button onClick={caricaAltre} disabled={loading} variant="outline">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Mostra altre
          </Button>
          {errore && <p className="mt-2 text-sm text-red-600">{errore}</p>}
        </div>
      )}
    </>
  );
}
