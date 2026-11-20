import type { Metadata } from 'next';
import DocumentoLegale from '@/components/DocumentoLegale';
import documento from '@/content/legal/privacy';

// Testo importato da Iubenda con scripts/importa_documenti_legali.py e reso
// con la grafica del sito. Per aggiornarlo: modifica il documento su Iubenda e
// rilancia lo script (poi commit + deploy).
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Come trattiamo i tuoi dati personali sul sito Escort Bella.',
  alternates: { canonical: '/privacy' },
};

export default function Page() {
  return <DocumentoLegale documento={documento} percorso="/privacy" nome="Privacy Policy" />;
}
