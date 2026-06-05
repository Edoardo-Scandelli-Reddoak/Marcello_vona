import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy — Escort Bella',
  description: 'Quali cookie usiamo sul sito Escort Bella.',
};

// Cookie Policy ospitata da Iubenda (siteId 14462765). Vedi commento su
// /privacy per il funzionamento dell'embed iframe.
export default function CookiePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <iframe
        src="https://www.iubenda.com/privacy-policy/14462765/cookie-policy"
        title="Cookie Policy"
        className="block w-full rounded-2xl border border-[#1A1A1A]/10 bg-white"
        style={{ height: 'calc(100vh - 8rem)', minHeight: '600px' }}
      />
    </div>
  );
}
