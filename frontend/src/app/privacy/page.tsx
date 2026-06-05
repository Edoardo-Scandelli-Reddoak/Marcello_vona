import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Escort Bella',
  description: 'Come trattiamo i tuoi dati personali sul sito Escort Bella.',
};

// Privacy Policy ospitata da Iubenda (siteId 14462765). Embed via iframe sul
// nostro dominio così l'utente non lascia escort-bella.it. Il testo è gestito
// dal dashboard Iubenda — quando aggiorni le clausole lì, la pagina riflette
// subito le modifiche (nessun deploy necessario).
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <iframe
        src="https://www.iubenda.com/privacy-policy/14462765"
        title="Privacy Policy"
        className="block w-full rounded-2xl border border-[#1A1A1A]/10 bg-white"
        style={{ height: 'calc(100vh - 8rem)', minHeight: '600px' }}
      />
    </div>
  );
}
