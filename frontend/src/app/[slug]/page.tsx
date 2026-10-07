import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PaginaElenco from '@/components/PaginaElenco';
import { CAPOLUOGHI_REGIONE, CITTA, cittaStessaRegione, getCitta, type Citta } from '@/lib/citta';
import { BASE_URL, CATEGORIE_SEO, getCategoriaSeo, getEscort, maiuscola, type CategoriaSeo } from '@/lib/seo';

// Un solo segmento dinamico in root per due tipi di pagina SEO:
//   /milano → escort a Milano e provincia (elenco in lib/citta.ts)
//   /donna  → escort della categoria in tutta Italia (elenco in lib/seo.ts)
// Le rotte statiche (/escort, /login, ...) hanno la precedenza.
// dynamicParams=false: uno slug fuori elenco è 404 prima del render. Con
// notFound() dentro la pagina il loading.tsx della root faceva partire lo
// streaming e la risposta usciva 200.
export const dynamicParams = false;
export const revalidate = 300;

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return [
    ...CITTA.map((c) => ({ slug: c.slug })),
    ...CATEGORIE_SEO.map((c) => ({ slug: c.slug })),
  ];
}

export function generateMetadata({ params }: Props): Metadata {
  const citta = getCitta(params.slug);
  const categoria = getCategoriaSeo(params.slug);
  let title: string;
  let description: string;
  if (citta) {
    title = `Escort ${citta.nome} — annunci escort a ${citta.nome} e provincia`;
    description =
      `Escort a ${citta.nome}: profili verificati di donne, trans e coppie a ${citta.nome} e provincia. ` +
      `Foto reali, recensioni e contatto diretto via WhatsApp o telefono.`;
  } else if (categoria) {
    title = `${maiuscola(categoria.etichetta)} in Italia — annunci verificati`;
    description =
      `Annunci di ${categoria.etichetta} in tutta Italia: profili verificati, foto reali e recensioni. ` +
      `Scegli la tua città e contatta direttamente via WhatsApp o telefono.`;
  } else {
    return {};
  }
  return {
    // absolute: il template "%s — Escort Bella" del layout allungherebbe troppo il titolo
    title: { absolute: `${title} | Escort Bella` },
    description,
    alternates: { canonical: `/${params.slug}` },
    openGraph: { title, description, url: `${BASE_URL}/${params.slug}` },
    twitter: { title, description },
  };
}

async function PaginaCitta({ c }: { c: Citta }) {
  const filtri = { provincia: c.provincia };
  const lista = await getEscort(filtri);
  const zona = c.capoluogoRegione
    ? `${c.nome}, capoluogo della regione ${c.regione}`
    : `${c.nome} (${c.provincia}), in ${c.regione}`;
  const intro = lista.count === 0
    ? `Su Escort Bella trovi gli annunci di escort a ${zona}. Ogni profilo viene verificato prima di essere pubblicato.`
    : `Su Escort Bella trovi ${lista.count === 1 ? '1 escort' : `${lista.count} escort`} a ${zona} e provincia. ` +
      `Ogni profilo viene verificato prima della pubblicazione: sfoglia foto e recensioni e contatta direttamente la persona che preferisci.`;

  return (
    <PaginaElenco
      breadcrumb={[
        { href: '/', label: 'Home' },
        { href: '/escort', label: 'Escort' },
        { href: `/${c.slug}`, label: c.nome },
      ]}
      titolo={`Escort a ${c.nome}`}
      intro={intro}
      filtri={filtri}
      lista={lista}
      vuoto={{
        titolo: `Al momento non ci sono escort disponibili a ${c.nome}`,
        azioni: [{ href: '/escort', label: 'Cerca in tutta Italia' }],
      }}
      cta={`Sei una escort a ${c.nome}?`}
      sezioni={[
        {
          titolo: `Cerca per categoria a ${c.nome}`,
          link: CATEGORIE_SEO.map((k) => ({
            href: `/${k.slug}/${c.slug}`,
            label: `${maiuscola(k.etichetta)} a ${c.nome}`,
          })),
        },
        {
          titolo: `Escort nelle altre città della regione ${c.regione}`,
          link: cittaStessaRegione(c).map((x) => ({ href: `/${x.slug}`, label: `Escort ${x.nome}` })),
        },
        {
          titolo: 'Escort nelle principali città italiane',
          link: CAPOLUOGHI_REGIONE.filter((x) => x.regione !== c.regione).map((x) => ({
            href: `/${x.slug}`,
            label: `Escort ${x.nome}`,
          })),
        },
      ]}
    />
  );
}

async function PaginaCategoria({ k }: { k: CategoriaSeo }) {
  const filtri = { categoria: k.slug };
  const lista = await getEscort(filtri);
  const intro = lista.count === 0
    ? `Su Escort Bella trovi gli annunci di ${k.etichetta} in tutta Italia. Ogni profilo viene verificato prima di essere pubblicato.`
    : `Su Escort Bella trovi ${lista.count} ${lista.count === 1 ? 'annuncio' : 'annunci'} di ${k.etichetta} in tutta Italia. ` +
      `Ogni profilo viene verificato prima della pubblicazione: scegli la tua città qui sotto oppure sfoglia tutte le schede.`;

  return (
    <PaginaElenco
      breadcrumb={[
        { href: '/', label: 'Home' },
        { href: '/escort', label: 'Escort' },
        { href: `/${k.slug}`, label: maiuscola(k.etichetta) },
      ]}
      titolo={`${maiuscola(k.etichetta)} in Italia`}
      intro={intro}
      filtri={filtri}
      lista={lista}
      vuoto={{
        titolo: `Al momento non ci sono ${k.etichetta} disponibili`,
        azioni: [{ href: '/escort', label: 'Vedi tutte le escort' }],
      }}
      cta="Sei una escort?"
      sezioni={[
        {
          titolo: `${maiuscola(k.etichetta)} nelle principali città`,
          link: CAPOLUOGHI_REGIONE.map((x) => ({ href: `/${k.slug}/${x.slug}`, label: `${maiuscola(k.etichetta)} ${x.nome}` })),
        },
        {
          titolo: `${maiuscola(k.etichetta)} nelle altre città`,
          link: CITTA.filter((x) => !x.capoluogoRegione)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
            .map((x) => ({ href: `/${k.slug}/${x.slug}`, label: x.nome })),
        },
        {
          titolo: 'Altre categorie',
          link: CATEGORIE_SEO.filter((x) => x.slug !== k.slug).map((x) => ({
            href: `/${x.slug}`,
            label: maiuscola(x.etichetta),
          })),
        },
      ]}
    />
  );
}

export default function Page({ params }: Props) {
  const citta = getCitta(params.slug);
  if (citta) return <PaginaCitta c={citta} />;
  const categoria = getCategoriaSeo(params.slug);
  if (categoria) return <PaginaCategoria k={categoria} />;
  notFound();
}
