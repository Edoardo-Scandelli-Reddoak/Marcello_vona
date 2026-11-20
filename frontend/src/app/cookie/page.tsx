import type { Metadata } from 'next';
import DocumentoLegale from '@/components/DocumentoLegale';
import documento from '@/content/legal/cookie';

// Testo importato da Iubenda con scripts/importa_documenti_legali.py e reso
// con la grafica del sito. Per aggiornarlo: modifica il documento su Iubenda e
// rilancia lo script (poi commit + deploy).
export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Quali cookie e strumenti di tracciamento usa il sito Escort Bella.',
  alternates: { canonical: '/cookie' },
};

export default function Page() {
  return <DocumentoLegale documento={documento} percorso="/cookie" nome="Cookie Policy" />;
}
