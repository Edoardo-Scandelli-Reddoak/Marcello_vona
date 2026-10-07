import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PaginaElenco from '@/components/PaginaElenco';
import { CAPOLUOGHI_REGIONE, CITTA, cittaStessaRegione, getCitta } from '@/lib/citta';
import { BASE_URL, CATEGORIE_SEO, getCategoriaSeo, getEscort, maiuscola } from '@/lib/seo';

// /donna/milano, /trans/roma, ...: categoria × città. Solo le combinazioni
// generate qui esistono (dynamicParams=false), es. /milano/donna è 404.
export const dynamicParams = false;
export const revalidate = 300;

type Props = { params: { slug: string; citta: string } };

export function generateStaticParams() {
  return CATEGORIE_SEO.flatMap((k) => CITTA.map((c) => ({ slug: k.slug, citta: c.slug })));
}

export function generateMetadata({ params }: Props): Metadata {
  const k = getCategoriaSeo(params.slug);
  const c = getCitta(params.citta);
  if (!k || !c) return {};
  const etichetta = maiuscola(k.etichetta);
  const title = `${etichetta} ${c.nome} — annunci a ${c.nome} e provincia`;
  const description =
    `${etichetta} a ${c.nome} e provincia: profili verificati, foto reali e recensioni. ` +
    `Contatto diretto via WhatsApp o telefono.`;
  const path = `/${k.slug}/${c.slug}`;
  return {
    title: { absolute: `${title} | Escort Bella` },
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: `${BASE_URL}${path}` },
    twitter: { title, description },
  };
}

export default async function CategoriaCittaPage({ params }: Props) {
  const k = getCategoriaSeo(params.slug);
  const c = getCitta(params.citta);
  if (!k || !c) notFound();

  const etichetta = maiuscola(k.etichetta);
  const filtri = { categoria: k.slug, provincia: c.provincia };
  const lista = await getEscort(filtri);
  const intro = lista.count === 0
    ? `Su Escort Bella trovi gli annunci di ${k.etichetta} a ${c.nome} e provincia, in ${c.regione}. Ogni profilo viene verificato prima di essere pubblicato.`
    : `Su Escort Bella trovi ${lista.count} ${lista.count === 1 ? 'annuncio' : 'annunci'} di ${k.etichetta} a ${c.nome} e provincia, in ${c.regione}. ` +
      `Ogni profilo viene verificato prima della pubblicazione: sfoglia foto e recensioni e contatta direttamente la persona che preferisci.`;

  return (
    <PaginaElenco
      breadcrumb={[
        { href: '/', label: 'Home' },
        { href: `/${k.slug}`, label: etichetta },
        { href: `/${k.slug}/${c.slug}`, label: c.nome },
      ]}
      titolo={`${etichetta} a ${c.nome}`}
      intro={intro}
      filtri={filtri}
      lista={lista}
      vuoto={{
        titolo: `Al momento non ci sono ${k.etichetta} disponibili a ${c.nome}`,
        azioni: [
          { href: `/${c.slug}`, label: `Tutte le escort a ${c.nome}` },
          { href: `/${k.slug}`, label: `${etichetta} in tutta Italia` },
        ],
      }}
      cta={`Sei una escort a ${c.nome}?`}
      sezioni={[
        {
          titolo: `Altre categorie a ${c.nome}`,
          link: [
            ...CATEGORIE_SEO.filter((x) => x.slug !== k.slug).map((x) => ({
              href: `/${x.slug}/${c.slug}`,
              label: `${maiuscola(x.etichetta)} a ${c.nome}`,
            })),
            { href: `/${c.slug}`, label: `Tutte le escort a ${c.nome}` },
          ],
        },
        {
          titolo: `${etichetta} nelle altre città della regione ${c.regione}`,
          link: cittaStessaRegione(c).map((x) => ({ href: `/${k.slug}/${x.slug}`, label: `${etichetta} ${x.nome}` })),
        },
        {
          titolo: `${etichetta} nelle principali città italiane`,
          link: CAPOLUOGHI_REGIONE.filter((x) => x.regione !== c.regione).map((x) => ({
            href: `/${k.slug}/${x.slug}`,
            label: `${etichetta} ${x.nome}`,
          })),
        },
      ]}
    />
  );
}
