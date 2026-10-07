import Link from 'next/link';
import { MapPin, Search } from 'lucide-react';
import RisultatiElenco from '@/components/RisultatiElenco';
import { BASE_URL, type Lista } from '@/lib/seo';

// Scheletro comune delle pagine SEO (/milano, /donna, /donna/milano):
// breadcrumb, titolo, testo, schede (o messaggio "nessuna disponibile"),
// invito a pubblicare un annuncio e blocchi di link verso le pagine sorelle.

export interface LinkSeo {
  href: string;
  label: string;
}

interface Props {
  /** Dalla Home alla pagina corrente inclusa (l'ultima voce non è cliccabile). */
  breadcrumb: LinkSeo[];
  titolo: string;
  intro: string;
  filtri: Record<string, string>;
  lista: Lista;
  vuoto: { titolo: string; azioni: LinkSeo[] };
  cta: string;
  sezioni: { titolo: string; link: LinkSeo[] }[];
}

export default function PaginaElenco({ breadcrumb, titolo, intro, filtri, lista, vuoto, cta, sezioni }: Props) {
  const { results, count } = lista;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumb.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.label,
        item: `${BASE_URL}${b.href}`,
      })),
    },
    ...(results.length
      ? [{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: titolo,
          numberOfItems: count,
          itemListElement: results.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${BASE_URL}/escort/${p.slug}`,
            name: p.nome,
          })),
        }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-[#1A1A1A]/50">
        {breadcrumb.map((b, i) => (
          <span key={b.href}>
            {i > 0 && ' / '}
            {i < breadcrumb.length - 1 ? (
              <Link href={b.href} className="hover:text-[#E91E8C]">{b.label}</Link>
            ) : (
              <span>{b.label}</span>
            )}
          </span>
        ))}
      </nav>

      <h1 className="text-2xl font-bold text-[#1A1A1A] sm:text-3xl">{titolo}</h1>
      <p className="mt-3 max-w-3xl text-sm text-[#1A1A1A]/65 sm:text-base">{intro}</p>

      <div className="mt-6 sm:mt-8">
        {results.length > 0 ? (
          <RisultatiElenco filtri={filtri} iniziali={results} totale={count} />
        ) : (
          <div className="rounded-2xl border border-[#1A1A1A]/10 bg-white px-6 py-12 text-center">
            <MapPin className="mx-auto h-8 w-8 text-[#E91E8C]/60" />
            <h2 className="mt-3 text-lg font-semibold text-[#1A1A1A]">{vuoto.titolo}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#1A1A1A]/60">
              Prova a cambiare i parametri di ricerca, a cercare nelle città vicine oppure torna a trovarci:
              nuovi profili vengono pubblicati ogni giorno.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {vuoto.azioni.map((a, i) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={
                    i === 0
                      ? 'inline-flex items-center rounded-lg bg-[#E91E8C] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#D11A7D]'
                      : 'inline-flex items-center rounded-lg border border-[#1A1A1A]/10 bg-white px-5 py-2.5 text-sm font-medium text-[#1A1A1A]/70 hover:border-[#E91E8C]/40 hover:text-[#E91E8C]'
                  }
                >
                  {i === 0 && <Search className="mr-2 h-4 w-4" />}
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 rounded-2xl bg-[#E91E8C]/5 px-6 py-5 text-sm text-[#1A1A1A]/70">
        {cta}{' '}
        <Link href="/registrazione" className="font-medium text-[#E91E8C] hover:underline">
          Pubblica il tuo annuncio
        </Link>{' '}
        e fatti trovare da chi cerca in zona.
      </div>

      {sezioni.filter((s) => s.link.length > 0).map((s) => (
        <section key={s.titolo} className="mt-8">
          <h2 className="text-base font-semibold text-[#1A1A1A]">{s.titolo}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {s.link.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-block rounded-full border border-[#1A1A1A]/10 bg-white px-3 py-1.5 text-sm text-[#1A1A1A]/70 hover:border-[#E91E8C]/40 hover:text-[#E91E8C]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
