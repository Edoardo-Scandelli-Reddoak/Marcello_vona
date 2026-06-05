import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termini e condizioni — Escort Bella',
  description: 'Termini di utilizzo del sito Escort Bella.',
};

// Termini e Condizioni ospitati da Iubenda (siteId 14462765). Vedi commento su
// /privacy per il funzionamento dell'embed iframe.
export default function TerminiPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <iframe
        src="https://www.iubenda.com/termini-e-condizioni/14462765"
        title="Termini e condizioni"
        className="block w-full rounded-2xl border border-[#1A1A1A]/10 bg-white"
        style={{ height: 'calc(100vh - 8rem)', minHeight: '600px' }}
      />
    </div>
  );
}
