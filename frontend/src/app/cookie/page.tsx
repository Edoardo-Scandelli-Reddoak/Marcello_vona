import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy — Directory Escort',
  description: 'Quali cookie usiamo sul sito Directory Escort.',
};

export default function CookiePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="mb-2 text-3xl font-bold text-[#1A1A1A] sm:text-4xl">Cookie Policy</h1>
      <p className="mb-10 text-sm text-[#1A1A1A]/60">
        Ultimo aggiornamento: 19 maggio 2026
      </p>

      <div className="space-y-6 text-[#1A1A1A]/80">
        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Cosa sono i cookie</h2>
          <p>
            I cookie sono piccoli file di testo che il sito salva sul tuo dispositivo
            mentre lo visiti. Servono a far funzionare il sito e a ricordare alcune
            preferenze tra una visita e l&apos;altra.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Cookie che usiamo</h2>

          <div className="mt-3 space-y-4">
            <div className="rounded-xl border border-[#1A1A1A]/10 bg-white p-4">
              <h3 className="font-semibold text-[#1A1A1A]">Cookie tecnici (necessari)</h3>
              <p className="mt-1 text-sm">
                Necessari per il funzionamento del sito. Non richiedono il tuo consenso.
              </p>
              <ul className="mt-2 list-disc pl-6 text-sm">
                <li><code>access_token</code> / <code>refresh_token</code>: cookie di autenticazione (httpOnly, secure). Durata: 1 ora / 7 giorni.</li>
                <li><code>age_verified</code> (localStorage): ricorda che hai confermato di essere maggiorenne.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-[#1A1A1A]/10 bg-white p-4">
              <h3 className="font-semibold text-[#1A1A1A]">Cookie di terze parti</h3>
              <p className="mt-1 text-sm">
                Quando paghi un abbonamento o uno sblocco social vieni redirezionato su
                <strong> Stripe</strong>, che usa propri cookie per gestire il pagamento.
                Per i dettagli vedi la{' '}
                <a href="https://stripe.com/it/privacy" target="_blank" rel="noopener noreferrer" className="text-[#E91E8C] hover:underline">
                  privacy policy di Stripe
                </a>.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Come gestire i cookie</h2>
          <p>
            Puoi disabilitare i cookie dalle impostazioni del tuo browser, ma in tal caso
            alcune funzionalità del sito (in particolare il login) potrebbero non
            funzionare correttamente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Contatti</h2>
          <p>
            Per qualsiasi richiesta sulla nostra politica dei cookie scrivi a{' '}
            <a href="mailto:info.escortbella@gmail.com" className="text-[#E91E8C] hover:underline">info.escortbella@gmail.com</a>.
          </p>
        </section>

        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Nota:</strong> questa Cookie Policy verrà aggiornata mano a mano che
          verranno introdotte funzionalità di analytics/marketing che richiedono ulteriori cookie.
        </p>
      </div>
    </div>
  );
}
