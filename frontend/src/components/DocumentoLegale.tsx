import Link from 'next/link';
import { ChevronDown, FileText, Mail } from 'lucide-react';
import { COMPANY } from '@/lib/company';
import type { DocumentoLegale as Documento } from '@/content/legal/tipi';

// Pagina di un documento legale (privacy, cookie, termini) con la grafica del
// sito. Il testo arriva da Iubenda tramite scripts/importa_documenti_legali.py
// ed è già ripulito: qui lo rendiamo e lo stilizziamo (.doc-legale in
// globals.css). Tutto server-side, quindi il testo è nell'HTML per Google.

const DOCUMENTI = [
  { href: '/privacy', etichetta: 'Privacy Policy' },
  { href: '/cookie', etichetta: 'Cookie Policy' },
  { href: '/termini', etichetta: 'Termini e condizioni' },
];

const glow = 'pointer-events-none absolute rounded-full bg-[#E91E8C] blur-[120px]';

export default function DocumentoLegale({
  documento,
  percorso,
  nome,
}: {
  documento: Documento;
  percorso: string;
  nome: string;
}) {
  const indice = (
    <ol className="space-y-0.5 text-sm">
      {documento.indice.map((voce, i) => (
        <li key={voce.id}>
          <a
            href={`#${voce.id}`}
            className="flex gap-3 rounded-xl px-3 py-2 text-[#1A1A1A]/65 transition-colors duration-200 ease-out hover:bg-[#E91E8C]/[0.07] hover:text-[#E91E8C]"
          >
            <span className="w-5 shrink-0 tabular-nums text-[#1A1A1A]/30">{String(i + 1).padStart(2, '0')}</span>
            <span>{voce.titolo}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative isolate overflow-hidden bg-[#1A1A1A] text-white">
        <div className={`${glow} -right-24 -top-32 h-[380px] w-[380px] opacity-35`} aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:pb-14 sm:pt-10">
          <nav aria-label="Breadcrumb" className="text-xs text-white/45">
            <Link href="/" className="hover:text-[#E91E8C]">Home</Link>
            {' / '}
            <span>{nome}</span>
          </nav>

          <div className="mt-8 max-w-3xl sm:mt-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70">
              <FileText className="h-3.5 w-3.5 text-[#E91E8C]" aria-hidden="true" />
              Ultima modifica: {documento.aggiornato}
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{nome}</h1>
            <p className="mt-4 text-base leading-relaxed text-white/70 sm:text-lg">{documento.intro}</p>
          </div>

          <nav aria-label="Documenti legali" className="mt-8 flex flex-wrap gap-2">
            {DOCUMENTI.map((d) => {
              const attivo = d.href === percorso;
              return (
                <Link
                  key={d.href}
                  href={d.href}
                  aria-current={attivo ? 'page' : undefined}
                  className={
                    attivo
                      ? 'rounded-full bg-[#E91E8C] px-4 py-2 text-sm font-semibold text-white'
                      : 'rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 ease-out hover:border-[#E91E8C] hover:text-white'
                  }
                >
                  {d.etichetta}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      {/* ───────── Contenuto ───────── */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          <aside className="mb-6 lg:mb-0">
            {/* Mobile: indice richiudibile */}
            <details className="group rounded-2xl border border-[#1A1A1A]/10 bg-white lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-[#1A1A1A] [&::-webkit-details-marker]:hidden">
                Sommario
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t border-[#1A1A1A]/10 p-2">{indice}</div>
            </details>

            {/* Desktop: indice fisso a lato */}
            <div className="sticky top-24 hidden lg:block">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]/40">Sommario</p>
              <div className="mt-3">{indice}</div>
              <div className="mt-6 rounded-2xl border border-[#1A1A1A]/10 bg-white p-5">
                <p className="text-sm font-semibold text-[#1A1A1A]">Domande su questo documento?</p>
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="mt-2 inline-flex items-center gap-2 break-all text-sm text-[#E91E8C] hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {COMPANY.email}
                </a>
              </div>
            </div>
          </aside>

          <article
            className="doc-legale min-w-0 rounded-3xl border border-[#1A1A1A]/10 bg-white px-5 py-6 sm:px-10 sm:py-10"
            dangerouslySetInnerHTML={{ __html: documento.html }}
          />
        </div>
      </div>
    </>
  );
}
