import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { whatsappHref } from '@/lib/company';

/**
 * Pagina di cortesia.
 *
 * Nasceva come pagina di ritorno dal checkout con carta: ci si arrivava dopo
 * il pagamento e mostrava l'esito. Ora i pagamenti si concordano su WhatsApp e
 * l'attivazione la fa l'admin, quindi nessun flusso porta più qui. La rotta
 * resta per non far cadere in errore chi ha salvato il link.
 */
export default function AbbonamentoSuccessoPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">Attivazione abbonamenti</h1>
      <p className="mt-3 text-[#1A1A1A]/65">
        Per attivare o rinnovare un abbonamento scrivici su WhatsApp: concordiamo
        tutto in chat e pubblichiamo la tua scheda.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild className="bg-[#E91E8C] text-white hover:bg-[#D11A7D]">
          <a
            href={whatsappHref('Ciao! Vorrei informazioni sull\'abbonamento per la mia scheda su Escort Bella.')}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Scrivici su WhatsApp
          </a>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/abbonamento">Vedi i piani</Link>
        </Button>
      </div>
    </div>
  );
}
