import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Directory Escort',
  description: 'Come trattiamo i tuoi dati personali sul sito Directory Escort.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="mb-2 text-3xl font-bold text-[#1A1A1A] sm:text-4xl">Privacy Policy</h1>
      <p className="mb-10 text-sm text-[#1A1A1A]/60">
        Ultimo aggiornamento: 19 maggio 2026
      </p>

      <div className="prose prose-neutral max-w-none space-y-6 text-[#1A1A1A]/80">
        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">1. Titolare del trattamento</h2>
          <p>
            Il titolare del trattamento dei dati personali è Directory Escort. Per qualsiasi
            richiesta relativa ai tuoi dati personali puoi contattarci all&apos;indirizzo
            email <a href="mailto:info.escortbella@gmail.com" className="text-[#E91E8C] hover:underline">info.escortbella@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">2. Quali dati raccogliamo</h2>
          <ul className="list-disc pl-6">
            <li><strong>Dati di registrazione</strong>: email, password (cifrata), nome visualizzato.</li>
            <li><strong>Per le escort</strong>: dati anagrafici, copia del documento d&apos;identità (per la verifica età), foto profilo, indirizzo pubblico, recapiti telefonici e link social.</li>
            <li><strong>Dati di utilizzo</strong>: indirizzo IP, browser, pagine visitate, cookie tecnici.</li>
            <li><strong>Pagamenti</strong>: i dati della carta non vengono mai memorizzati sui nostri server — sono gestiti direttamente da Stripe.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">3. Finalità del trattamento</h2>
          <p>I tuoi dati vengono trattati per:</p>
          <ul className="list-disc pl-6">
            <li>permetterti di registrarti, accedere e usare il servizio;</li>
            <li>pubblicare il profilo dell&apos;escort dopo verifica dell&apos;età;</li>
            <li>gestire abbonamenti, pagamenti e sblocco social;</li>
            <li>moderare contenuti e recensioni;</li>
            <li>adempiere a obblighi di legge.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">4. Verifica età</h2>
          <p>
            Per accedere al sito devi avere almeno 18 anni. Per registrarti come escort
            è richiesta una copia del documento d&apos;identità che viene confrontata con
            la data di nascita dichiarata. Il documento è visibile esclusivamente al team
            di moderazione e non viene mai pubblicato.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">5. Conservazione</h2>
          <p>
            I dati vengono conservati per il tempo necessario alle finalità sopra
            indicate, e in ogni caso non oltre 24 mesi dall&apos;ultimo accesso, salvo
            obblighi di legge che impongano una conservazione più lunga (es. fatturazione).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">6. I tuoi diritti</h2>
          <p>
            In qualsiasi momento puoi richiedere accesso, rettifica, cancellazione,
            limitazione o portabilità dei tuoi dati scrivendo a{' '}
            <a href="mailto:info.escortbella@gmail.com" className="text-[#E91E8C] hover:underline">info.escortbella@gmail.com</a>.
            Hai inoltre diritto a proporre reclamo al Garante Privacy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">7. Cookie</h2>
          <p>
            Per i dettagli sull&apos;uso dei cookie, consulta la nostra{' '}
            <a href="/cookie" className="text-[#E91E8C] hover:underline">Cookie Policy</a>.
          </p>
        </section>

        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Nota:</strong> questa è una versione iniziale della Privacy Policy
          destinata alla fase di test del servizio. Prima della pubblicazione definitiva
          il testo verrà rivisto da un consulente legale.
        </p>
      </div>
    </div>
  );
}
