'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Sparkles, ArrowRight, Loader2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { abbonamentiApi, type PianoAbbonamento, type DiscountInfo } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function formatEuro(prezzoEur: number, decimals = 2): string {
  return prezzoEur.toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatGiorni(g: number): string {
  return g === 1 ? '1 giorno' : `${g} giorni`;
}

const STANDARD_FEATURES = [
  'Profilo pubblicato e visibile',
  'Inclusione nei risultati di ricerca',
  'Recensioni dei clienti',
];

const EVIDENZA_FEATURES = [
  'Profilo pubblicato e visibile',
  'In evidenza tra "Le più apprezzate"',
  'Posizionamento prioritario nei risultati',
];

export default function AbbonamentoPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [piani, setPiani] = useState<PianoAbbonamento[]>([]);
  const [discount, setDiscount] = useState<DiscountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutId, setCheckoutId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const cancelled = search.get('cancelled');

  useEffect(() => {
    abbonamentiApi
      .piani()
      .then(setPiani)
      .catch(() => setError('Impossibile caricare i piani.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setDiscount(null);
      return;
    }
    abbonamentiApi.discountInfo().then(setDiscount).catch(() => setDiscount(null));
  }, [authLoading, user]);

  const discountPct = discount?.early_bird_eligible ? discount.discount_pct : 0;

  const { standard, evidenza } = useMemo(() => {
    const sortByDays = (a: PianoAbbonamento, b: PianoAbbonamento) => a.durata_giorni - b.durata_giorni;
    return {
      standard: piani.filter((p) => p.tipo === 'standard').sort(sortByDays),
      evidenza: piani.filter((p) => p.tipo === 'evidenza').sort(sortByDays),
    };
  }, [piani]);

  const handlePurchase = async (piano: PianoAbbonamento) => {
    setError('');
    if (!authLoading && !user) {
      router.push('/login?next=/abbonamento');
      return;
    }
    setCheckoutId(piano.id);
    try {
      const res = await abbonamentiApi.checkout(piano.id);
      window.location.href = res.redirect_url;
    } catch (e: any) {
      const msg = e.message || 'Errore durante il checkout.';
      if (msg.toLowerCase().includes('credenziali')) {
        setError('Devi essere loggato per acquistare. Effettua il login e riprova.');
      } else if (msg.toLowerCase().includes('profilo')) {
        setError('Devi prima completare la registrazione del profilo professionista.');
      } else {
        setError(msg);
      }
      setCheckoutId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E91E8C]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center sm:mb-10">
        <h1 className="text-2xl font-bold text-[#1A1A1A] sm:text-3xl md:text-4xl">Scegli il tuo abbonamento</h1>
        <p className="mt-3 text-sm text-[#1A1A1A]/60 sm:text-base">
          Trascina lo slider per scegliere la durata. Il prezzo si aggiorna automaticamente.
        </p>
      </div>

      {cancelled && (
        <div className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          Pagamento annullato. Puoi riprovare quando vuoi.
        </div>
      )}
      {!authLoading && !user && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#E91E8C]/5 p-4 text-sm text-[#1A1A1A]/80">
          <span>Per acquistare un abbonamento devi essere registrato e loggato.</span>
          <Button variant="outline" onClick={() => router.push('/login?next=/abbonamento')}>
            Accedi
          </Button>
        </div>
      )}
      {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {discount?.early_bird_eligible && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#E91E8C]/30 bg-gradient-to-br from-[#E91E8C]/10 to-transparent p-5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#E91E8C] text-white">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-bold text-[#1A1A1A]">
              Sei tra le prime {discount.limit} iscritte! Sconto del {discount.discount_pct}% applicato
            </h3>
            <p className="mt-1 text-sm text-[#1A1A1A]/70">
              Lo sconto è automatico e vale su qualsiasi pacchetto, anche per i rinnovi futuri.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {standard.length > 0 && (
          <PianoBox
            title="Standard"
            subtitle="Pubblica il tuo profilo"
            piani={standard}
            features={STANDARD_FEATURES}
            onPurchase={handlePurchase}
            checkoutId={checkoutId}
            discountPct={discountPct}
          />
        )}
        {evidenza.length > 0 && (
          <PianoBox
            title="Evidenza"
            subtitle={'In cima e tra "Le più apprezzate"'}
            piani={evidenza}
            features={EVIDENZA_FEATURES}
            onPurchase={handlePurchase}
            checkoutId={checkoutId}
            highlighted
            discountPct={discountPct}
          />
        )}
      </div>
    </div>
  );
}

interface PianoBoxProps {
  title: string;
  subtitle: string;
  piani: PianoAbbonamento[];
  features: string[];
  onPurchase: (piano: PianoAbbonamento) => void;
  checkoutId: number | null;
  highlighted?: boolean;
  discountPct?: number;
}

function PianoBox({
  title,
  subtitle,
  piani,
  features,
  onPurchase,
  checkoutId,
  highlighted = false,
  discountPct = 0,
}: PianoBoxProps) {
  // Default selection: middle option (e.g. 30g for standard, 7g for evidenza)
  const defaultIndex = Math.floor((piani.length - 1) / 2);
  const [index, setIndex] = useState(defaultIndex);
  const piano = piani[Math.min(index, piani.length - 1)];
  const finalPrice = piano.prezzo_eur * (1 - discountPct / 100);
  const prezzoGiornaliero = piano.durata_giorni > 1 ? finalPrice / piano.durata_giorni : null;
  const isLoading = checkoutId === piano.id;
  const hasDiscount = discountPct > 0;

  return (
    <div
      className={`flex flex-col rounded-2xl border p-5 transition-shadow duration-200 ease-out hover:shadow-lg sm:p-7 ${
        highlighted
          ? 'border-[#E91E8C]/30 bg-gradient-to-br from-[#E91E8C]/5 to-transparent'
          : 'border-[#1A1A1A]/10 bg-white'
      }`}
    >
      <div className="mb-6 flex items-center gap-2">
        {highlighted && <Sparkles className="h-5 w-5 text-[#E91E8C]" aria-hidden="true" />}
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">{title}</h2>
          <p className="text-sm text-[#1A1A1A]/55">{subtitle}</p>
        </div>
      </div>

      {/* Price display */}
      <div className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-3xl font-bold text-[#1A1A1A] sm:text-4xl md:text-5xl">
            {formatEuro(finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-base text-[#1A1A1A]/40 line-through">
              {formatEuro(piano.prezzo_eur)}
            </span>
          )}
          <span className="text-sm text-[#1A1A1A]/55">per {formatGiorni(piano.durata_giorni)}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {prezzoGiornaliero !== null && (
            <span className="text-[#1A1A1A]/50">
              ≈ {formatEuro(prezzoGiornaliero, 2)} al giorno
            </span>
          )}
          {hasDiscount && (
            <span className="rounded-full bg-[#E91E8C]/10 px-2 py-0.5 font-semibold text-[#E91E8C]">
              -{discountPct}% Early Bird
            </span>
          )}
        </div>
      </div>

      {/* Slider with discrete steps */}
      <div className="mb-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#1A1A1A]/50">
          Durata
        </label>
        <input
          type="range"
          min={0}
          max={piani.length - 1}
          step={1}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          className={`w-full cursor-pointer ${highlighted ? 'accent-[#E91E8C]' : 'accent-[#1A1A1A]'}`}
          aria-label={`Durata abbonamento ${title}`}
        />
        <div
          className="mt-2 grid text-center text-[11px]"
          style={{ gridTemplateColumns: `repeat(${piani.length}, minmax(0, 1fr))` }}
        >
          {piani.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`transition-colors duration-150 ${
                i === index
                  ? highlighted
                    ? 'font-semibold text-[#E91E8C]'
                    : 'font-semibold text-[#1A1A1A]'
                  : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/70'
              }`}
            >
              {p.durata_giorni === 1 ? '1g' : `${p.durata_giorni}g`}
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-2 text-sm text-[#1A1A1A]/75">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#E91E8C]" aria-hidden="true" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={() => onPurchase(piano)}
        disabled={isLoading}
        className={`w-full ${
          highlighted ? 'bg-[#E91E8C] text-white hover:bg-[#D11A7D]' : 'bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90'
        }`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Acquista a {formatEuro(finalPrice)}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
