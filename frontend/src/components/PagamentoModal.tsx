'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Copy, Landmark, Loader2, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { abbonamentiApi, type PianoAbbonamento } from '@/lib/api';
import { COMPANY, bonificoDisponibile, ibanFormattato, whatsappHref } from '@/lib/company';

interface PagamentoModalProps {
  open: boolean;
  onClose: () => void;
  piano: PianoAbbonamento;
  /** "Standard" o "Evidenza". */
  titolo: string;
  /** Importo finale già formattato (sconti applicati). */
  importoLabel: string;
  /** Codice referral applicato, da citare in chat. */
  promoCodice?: string;
  /** Se falso non possiamo generare la causale: serve la scheda collegata. */
  loggedIn: boolean;
}

/** Campo con valore da ricopiare (IBAN, causale, importo). */
function CampoCopiabile({ label, valore, mono }: { label: string; valore: string; mono?: boolean }) {
  const [copiato, setCopiato] = useState(false);

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(valore);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      // Clipboard negata (browser vecchi, http): il valore resta selezionabile a mano.
    }
  };

  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#1A1A1A]/[0.07] py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1A1A1A]/45">{label}</p>
        <p className={`mt-0.5 break-words text-sm text-[#1A1A1A] ${mono ? 'font-mono' : 'font-medium'}`}>
          {valore}
        </p>
      </div>
      <button
        type="button"
        onClick={copia}
        aria-label={`Copia ${label}`}
        className="mt-1 flex flex-shrink-0 items-center gap-1 rounded-lg border border-[#1A1A1A]/10 px-2 py-1 text-xs font-medium text-[#1A1A1A]/60 transition-colors hover:border-[#E91E8C]/40 hover:text-[#E91E8C]"
      >
        {copiato ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copiato ? 'Copiato' : 'Copia'}
      </button>
    </div>
  );
}

interface OpzioneProps {
  id: string;
  numero: number;
  icona: ReactNode;
  titolo: string;
  /** Riassunto mostrato solo a sezione chiusa, per scegliere senza aprire. */
  sottotitolo: string;
  aperta: boolean;
  onToggle: () => void;
  /** true = variante rosa (opzione consigliata). */
  accent?: boolean;
  children: ReactNode;
}

/** Sezione a fisarmonica: una sola aperta alla volta, gestita dal genitore. */
function Opzione({
  id,
  numero,
  icona,
  titolo,
  sottotitolo,
  aperta,
  onToggle,
  accent = false,
  children,
}: OpzioneProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        accent
          ? 'border-[#E91E8C]/25 bg-gradient-to-br from-[#E91E8C]/[0.06] to-transparent'
          : 'border-[#1A1A1A]/10 bg-[#F8F7F5]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aperta}
        aria-controls={id}
        className="flex w-full items-center gap-2.5 p-4 text-left transition-colors hover:bg-[#1A1A1A]/[0.02]"
      >
        <span
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
            accent ? 'bg-[#E91E8C]' : 'bg-[#1A1A1A]'
          }`}
        >
          {numero}
        </span>
        <span className={`flex-shrink-0 ${accent ? 'text-[#E91E8C]' : 'text-[#1A1A1A]/60'}`}>
          {icona}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[#1A1A1A]">{titolo}</span>
          {!aperta && (
            <span className="mt-0.5 block text-xs text-[#1A1A1A]/55">{sottotitolo}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-[#1A1A1A]/40 transition-transform duration-200 motion-reduce:transition-none ${
            aperta ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {aperta && (
        <div id={id} className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function PagamentoModal({
  open,
  onClose,
  piano,
  titolo,
  importoLabel,
  promoCodice,
  loggedIn,
}: PagamentoModalProps) {
  const [codice, setCodice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Nessuna sezione aperta all'inizio: la finestra resta corta e la scelta è esplicita.
  const [aperta, setAperta] = useState<'bonifico' | 'chat' | null>(null);

  // All'apertura registriamo la richiesta: l'ID che torna diventa la causale,
  // così l'admin ricollega il bonifico alla richiesta giusta senza chiedere.
  // Parte subito, non all'apertura della sezione, così il codice è già pronto.
  useEffect(() => {
    if (!open || !loggedIn || codice) return;
    let annullato = false;
    setLoading(true);
    abbonamentiApi
      .richiediAttivazione(piano.id, promoCodice)
      .then((res) => {
        if (!annullato) setCodice(`ESB-${String(res.abbonamento_id).padStart(4, '0')}`);
      })
      .catch(() => {
        // Senza codice si paga comunque: l'abbinamento avviene in chat.
      })
      .finally(() => !annullato && setLoading(false));
    return () => {
      annullato = true;
    };
  }, [open, loggedIn, codice, piano.id, promoCodice]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const durata = piano.durata_giorni === 1 ? '1 giorno' : `${piano.durata_giorni} giorni`;
  const descrizionePiano = `abbonamento ${titolo} da ${durata} (${importoLabel})`;
  const conCodice = promoCodice ? ` con il codice ${promoCodice}` : '';

  // Causale = codice identificativo + descrizione neutra. La descrizione resta
  // volutamente generica ("inserzione pubblicitaria"): compare sull'estratto
  // conto di entrambe le parti, e non c'è motivo di renderla riconoscibile.
  const causale = codice ? `${codice} inserzione pubblicitaria` : null;

  const messaggioBonificoFatto =
    `Ciao! Ho fatto il bonifico per l'${descrizionePiano}` +
    (codice ? `, causale ${codice}` : '') +
    `${conCodice}. Vi mando la ricevuta.`;

  const messaggioIstruzioni =
    `Ciao! Vorrei attivare l'${descrizionePiano}${conCodice} per la mia scheda su Escort Bella. ` +
    'Come posso pagare?';

  const toggle = (quale: 'bonifico' | 'chat') =>
    setAperta((corrente) => (corrente === quale ? null : quale));

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pagamento-title"
    >
      <button
        type="button"
        aria-label="Chiudi"
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/5 sm:p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute right-3 top-3 rounded-full p-1.5 text-[#1A1A1A]/40 transition-colors hover:bg-[#1A1A1A]/[0.06] hover:text-[#1A1A1A]"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="pagamento-title" className="pr-8 text-lg font-bold text-[#1A1A1A]">
          Come vuoi pagare?
        </h2>
        <p className="mt-1 text-sm text-[#1A1A1A]/60">
          Hai scelto l&apos;abbonamento <strong className="text-[#1A1A1A]">{titolo}</strong> da{' '}
          {durata} — <strong className="text-[#1A1A1A]">{importoLabel}</strong>. Tocca un&apos;opzione
          per vedere come procedere.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          {/* ---------- Opzione 1: bonifico ---------- */}
          <Opzione
            id="opzione-bonifico"
            numero={1}
            icona={<Landmark className="h-4 w-4" aria-hidden="true" />}
            titolo="Bonifico bancario"
            sottotitolo={
              bonificoDisponibile
                ? 'IBAN, importo e causale da copiare'
                : 'Dati da richiedere in chat'
            }
            aperta={aperta === 'bonifico'}
            onToggle={() => toggle('bonifico')}
          >
            {bonificoDisponibile ? (
              <>
                <div className="rounded-lg bg-white px-3 py-1 ring-1 ring-[#1A1A1A]/[0.07]">
                  {COMPANY.intestatarioConto && (
                    <CampoCopiabile label="Intestatario" valore={COMPANY.intestatarioConto} />
                  )}
                  <CampoCopiabile label="IBAN" valore={ibanFormattato()} mono />
                  <CampoCopiabile label="Importo" valore={importoLabel} />
                  {loading ? (
                    <div className="flex items-center gap-2 py-3 text-sm text-[#1A1A1A]/50">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Genero la causale…
                    </div>
                  ) : causale ? (
                    <CampoCopiabile label="Causale (obbligatoria)" valore={causale} mono />
                  ) : (
                    <div className="py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1A1A1A]/45">
                        Causale (obbligatoria)
                      </p>
                      <p className="mt-0.5 text-sm text-[#1A1A1A]/70">
                        Scrivi &ldquo;inserzione pubblicitaria&rdquo; seguito dal tuo nome
                        d&apos;arte.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-lg border border-[#E91E8C]/25 bg-[#E91E8C]/[0.05] p-3">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Due cose importanti:</p>
                  <ol className="mt-1.5 space-y-1.5 text-sm text-[#1A1A1A]/80">
                    <li>
                      <strong>1.</strong> Inserisci la causale <strong>esatta</strong> nel bonifico:
                      è il codice con cui riconosciamo il tuo pagamento.
                    </li>
                    <li>
                      <strong>2.</strong> Dopo aver pagato, mandaci la <strong>ricevuta</strong> su
                      WhatsApp. Senza la conferma non sappiamo che hai pagato e la scheda non viene
                      pubblicata.
                    </li>
                  </ol>
                  <Button asChild className="mt-3 w-full bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
                    <a
                      href={whatsappHref(messaggioBonificoFatto)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                      Ho pagato — invia la ricevuta
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#1A1A1A]/70">
                I dati per il bonifico non sono ancora pubblicati sul sito: richiedili su WhatsApp
                con l&apos;opzione 2 e ti mandiamo IBAN e causale in chat.
              </p>
            )}
          </Opzione>

          {/* ---------- Opzione 2: istruzioni in chat ---------- */}
          <Opzione
            id="opzione-chat"
            numero={2}
            icona={<MessageCircle className="h-4 w-4" aria-hidden="true" />}
            titolo="Scrivici e ti guidiamo noi"
            sottotitolo="Ti seguiamo passo passo in chat"
            aperta={aperta === 'chat'}
            onToggle={() => toggle('chat')}
            accent
          >
            <p className="text-sm text-[#1A1A1A]/70">
              Ti diamo tutte le istruzioni in chat e ti seguiamo passo passo fino alla pubblicazione
              della scheda. Se è la prima volta, è l&apos;opzione più semplice.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-3 w-full border-[#E91E8C]/40 text-[#E91E8C] hover:bg-[#E91E8C]/[0.06]"
            >
              <a href={whatsappHref(messaggioIstruzioni)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                Chiedi le istruzioni su WhatsApp
              </a>
            </Button>
          </Opzione>
        </div>

        {!loggedIn && (
          <p className="mt-4 text-center text-xs text-[#1A1A1A]/55">
            Non sei collegata al tuo account: accedi prima di pagare, così generiamo il codice della
            causale e colleghiamo il pagamento alla tua scheda.
          </p>
        )}
      </div>
    </div>
  );
}
