import type { Metadata } from 'next';
import DocumentoLegale from '@/components/DocumentoLegale';
import documento from '@/content/legal/termini';

// Testo importato da Iubenda con scripts/importa_documenti_legali.py e reso
// con la grafica del sito. Per aggiornarlo: modifica il documento su Iubenda e
// rilancia lo script (poi commit + deploy).
export const metadata: Metadata = {
  title: 'Termini e condizioni',
  description: 'Termini e condizioni di utilizzo del sito Escort Bella.',
  alternates: { canonical: '/termini' },
};

export default function Page() {
  return <DocumentoLegale documento={documento} percorso="/termini" nome="Termini e condizioni" />;
}
