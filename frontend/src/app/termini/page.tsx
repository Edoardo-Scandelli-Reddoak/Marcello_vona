import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termini e condizioni — Directory Escort',
  description: 'Termini di utilizzo del sito Directory Escort.',
};

export default function TerminiPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="mb-2 text-3xl font-bold text-[#1A1A1A] sm:text-4xl">Termini e condizioni</h1>
      <p className="mb-10 text-sm text-[#1A1A1A]/60">
        Ultimo aggiornamento: 19 maggio 2026
      </p>

      <div className="space-y-6 text-[#1A1A1A]/80">
        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">1. Accettazione dei termini</h2>
          <p>
            Accedendo o utilizzando il sito Directory Escort dichiari di aver letto,
            compreso e accettato integralmente i presenti termini e condizioni.
            Se non accetti, ti chiediamo di non utilizzare il servizio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">2. Maggiore età</h2>
          <p>
            L&apos;accesso al sito è riservato esclusivamente a persone maggiorenni
            (18+). Continuando la navigazione dichiari di avere almeno 18 anni e
            di essere consapevole della natura dei contenuti pubblicati.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">3. Natura del servizio</h2>
          <p>
            Directory Escort è una <strong>vetrina pubblicitaria</strong> che mette
            in contatto utenti maggiorenni con escort indipendenti. Le escort sono
            liberi professionisti che usano la piattaforma per pubblicare la propria
            scheda; non sono dipendenti né rappresentanti del sito.
          </p>
          <p>
            Il sito non interviene nei rapporti tra utenti ed escort: ogni eventuale
            accordo (economico o di altra natura) avviene esclusivamente tra le parti.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">4. Registrazione</h2>
          <p>
            Per pubblicare una scheda come escort è obbligatorio:
          </p>
          <ul className="list-disc pl-6">
            <li>essere maggiorenne (18+);</li>
            <li>fornire una copia di un documento d&apos;identità valido;</li>
            <li>accettare Privacy Policy e questi Termini;</li>
            <li>fornire dati veritieri.</li>
          </ul>
          <p>
            Ci riserviamo il diritto di rifiutare o rimuovere schede che non rispettino
            questi requisiti.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">5. Contenuti</h2>
          <p>
            Le escort sono responsabili dei contenuti che pubblicano (foto, video, bio,
            recapiti). È vietato pubblicare contenuti illegali, materiale pedopornografico,
            contenuti riguardanti minori in qualsiasi forma, contenuti violenti o lesivi
            di diritti di terzi. Tali contenuti vengono rimossi immediatamente e segnalati
            alle autorità competenti.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">6. Abbonamenti e pagamenti</h2>
          <p>
            Per rendere visibile la propria scheda l&apos;escort acquista un abbonamento
            (Standard o Evidenza). I pagamenti sono gestiti da Stripe. Gli abbonamenti
            hanno una durata predefinita e si rinnovano solo con un acquisto esplicito.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">7. Sblocco social</h2>
          <p>
            Gli utenti possono pagare una piccola tariffa una tantum per accedere ai
            link social di un&apos;escort. Lo sblocco è permanente per quel singolo
            profilo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">8. Limitazione di responsabilità</h2>
          <p>
            Il sito è fornito &quot;così com&apos;è&quot;. Non garantiamo continuità
            di servizio, accuratezza dei dati pubblicati dalle escort o esiti delle
            interazioni tra utenti e escort. Non rispondiamo di danni diretti o
            indiretti derivanti dall&apos;uso del servizio nei limiti consentiti dalla
            legge applicabile.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">9. Legge applicabile</h2>
          <p>
            I presenti termini sono regolati dalla legge italiana. Per ogni
            controversia è competente il foro del Titolare.
          </p>
        </section>

        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Nota:</strong> questa è una versione iniziale dei Termini destinata
          alla fase di test del servizio. Prima della pubblicazione definitiva il testo
          verrà rivisto da un consulente legale.
        </p>
      </div>
    </div>
  );
}
