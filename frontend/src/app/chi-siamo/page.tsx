import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Heart,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Star,
  UserCheck,
} from 'lucide-react';
import { COMPANY, legalLine, telefonoHref, whatsappHref } from '@/lib/company';
import { getCitta } from '@/lib/citta';
import { BASE_URL, CATEGORIE_SEO, maiuscola } from '@/lib/seo';

// Pagina "Chi siamo": racconta il progetto a chi arriva da Google e ai
// crawler. Tutta nell'HTML (server component, ISR). Oltre al testo porta link
// interni verso categorie e città (le pagine SEO non sono nel menu) e dati
// strutturati AboutPage + FAQPage + BreadcrumbList.
//
// Grafica: niente riquadri a gradiente rosa, che sul sito sono i banner
// pubblicitari. Il rosa resta un accento; le sezioni forti sono scure a tutta
// larghezza, come la hero della home.
//
// Nei testi: il sito vende spazi pubblicitari e non entra negli accordi tra
// inserzioniste e utenti. Non promettere controlli che non esistono (il
// documento si carica in registrazione ma nessuno lo verifica a mano).

export const revalidate = 3600;

const TITOLO = 'Chi siamo';
const DESCRIZIONE =
  'Escort Bella è la directory italiana di annunci di escort, trans e coppie: ricerca per città, ' +
  'schede con foto e recensioni, contatto diretto. Scopri chi siamo e come funziona il sito.';

export const metadata: Metadata = {
  title: TITOLO,
  description: DESCRIZIONE,
  alternates: { canonical: '/chi-siamo' },
  openGraph: {
    title: `${TITOLO} — Escort Bella`,
    description: DESCRIZIONE,
    url: `${BASE_URL}/chi-siamo`,
  },
  twitter: { title: `${TITOLO} — Escort Bella`, description: DESCRIZIONE },
};

// Numeri veri per la hero: schede visibili e province coperte, dallo stesso
// endpoint che popola il filtro "Città" della home. Se l'API non risponde i
// numeri spariscono, la pagina no.
async function getNumeri(): Promise<{ escort: number; province: number } | null> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  try {
    const res = await fetch(`${API_URL}/province/`, { next: { revalidate } });
    if (!res.ok) return null;
    const province: { provincia: string; count: number }[] = await res.json();
    const escort = province.reduce((tot, p) => tot + p.count, 0);
    return escort > 0 ? { escort, province: province.length } : null;
  } catch {
    return null;
  }
}

const CITTA_PRINCIPALI = ['milano', 'roma', 'torino', 'napoli', 'bologna', 'firenze', 'venezia', 'bari', 'palermo']
  .map(getCitta)
  .filter((c) => c !== undefined);

const DESCRIZIONE_CATEGORIA: Record<string, string> = {
  donna: 'Le inserzioniste donne, in ogni città.',
  trans: 'Annunci di escort trans in tutta Italia.',
  coppia: 'Coppie che pubblicano insieme il proprio annuncio.',
};

const FAQ = [
  {
    domanda: 'Escort Bella organizza incontri?',
    risposta:
      'No. Escort Bella è una directory di annunci: vende spazi pubblicitari a inserzioniste maggiorenni e ' +
      'indipendenti. Non organizza incontri, non fa da intermediario e non è parte degli accordi tra chi ' +
      'pubblica un annuncio e chi lo legge.',
  },
  {
    domanda: 'Come contatto una escort?',
    risposta:
      'Direttamente dalla sua scheda, con i pulsanti WhatsApp o telefono. Il contatto è tra te e lei: ' +
      'Escort Bella non legge e non conserva le vostre conversazioni.',
  },
  {
    domanda: 'Devo registrarmi per cercare?',
    risposta:
      'No, le schede si consultano senza account. La registrazione come utente serve solo per salvare ' +
      'le escort nei preferiti e lasciare recensioni, usando un nome di visualizzazione.',
  },
  {
    domanda: 'Come pubblico il mio annuncio?',
    risposta:
      'Ti iscrivi come escort, completi la scheda con foto, descrizione e contatti e scegli un ' +
      'abbonamento. La scheda è visibile finché l’abbonamento è attivo.',
  },
  {
    domanda: 'Come si paga l’abbonamento?',
    risposta:
      'Con bonifico bancario oppure concordando il pagamento su WhatsApp. Sul sito non passa nessun ' +
      'pagamento e non ti chiediamo mai i dati della carta.',
  },
  {
    domanda: 'Il sito traccia le mie visite?',
    risposta:
      'Le nostre statistiche di visita sono anonime: non usano cookie e non salvano il tuo indirizzo IP ' +
      'in chiaro. Per i dettagli trovi privacy e cookie policy in fondo a ogni pagina.',
  },
];

const PUBBLICA = [
  { titolo: 'Iscriviti', testo: 'Gratis, in pochi minuti, con la verifica automatica dell’età.' },
  { titolo: 'Crea la scheda', testo: 'Foto, video, descrizione, contatti e link social.' },
  { titolo: 'Scegli il piano', testo: 'Standard per essere visibile, Evidenza per stare in cima e tra “Le più apprezzate”.' },
  { titolo: 'Vai online', testo: 'Paghi con bonifico o su WhatsApp e la scheda si accende appena il pagamento è registrato.' },
];

const PRINCIPI = [
  {
    icona: UserCheck,
    titolo: 'Solo maggiorenni',
    testo:
      'Il sito è riservato ai maggiori di 18 anni. Chi pubblica supera una verifica dell’età e carica un documento d’identità all’iscrizione.',
  },
  {
    icona: Lock,
    titolo: 'Privacy prima di tutto',
    testo:
      'Gli utenti compaiono solo con un nome di visualizzazione, i documenti non sono mai pubblici e le statistiche di visita sono anonime.',
  },
  {
    icona: ShieldCheck,
    titolo: 'Trasparenza',
    testo:
      'Vendiamo spazi pubblicitari, niente di più: prezzi chiari, nessun pagamento sul sito, nessun costo per chi cerca.',
  },
];

// Bagliore rosa sfumato, usato sulle sezioni scure.
const glow = 'pointer-events-none absolute rounded-full bg-[#E91E8C] blur-[120px]';
const eyebrow = 'text-xs font-semibold uppercase tracking-[0.2em] text-[#E91E8C]';
const titoloSezione = 'text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-4xl';

export default async function ChiSiamoPage() {
  const numeri = await getNumeri();

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      '@id': `${BASE_URL}/chi-siamo#webpage`,
      url: `${BASE_URL}/chi-siamo`,
      name: `${TITOLO} — Escort Bella`,
      description: DESCRIZIONE,
      inLanguage: 'it-IT',
      isPartOf: { '@id': `${BASE_URL}/#website` },
      about: { '@id': `${BASE_URL}/#organization` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: TITOLO, item: `${BASE_URL}/chi-siamo` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.domanda,
        acceptedAnswer: { '@type': 'Answer', text: f.risposta },
      })),
    },
  ];

  const statistiche = [
    ...(numeri
      ? [
          // Arrotondato per difetto alla decina ("60+"): non cambia a ogni
          // scheda che scade o si attiva.
          {
            valore: numeri.escort >= 10 ? `${Math.floor(numeri.escort / 10) * 10}+` : String(numeri.escort),
            etichetta: 'escort online sul sito',
          },
          { valore: String(numeri.province), etichetta: 'province coperte' },
        ]
      : []),
    { valore: String(CATEGORIE_SEO.length), etichetta: 'categorie: donne, trans, coppie' },
    { valore: 'Gratis', etichetta: 'per chi cerca' },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ───────── Hero ───────── */}
      <section className="relative isolate overflow-hidden bg-[#1A1A1A] text-white">
        <div className={`${glow} -right-24 -top-32 h-[420px] w-[420px] opacity-40`} aria-hidden="true" />
        <div className={`${glow} -bottom-40 left-1/4 h-[360px] w-[360px] opacity-20`} aria-hidden="true" />
        {/* trama a puntini, appena visibile */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-8 sm:pb-20 sm:pt-10 md:pb-24">
          <nav aria-label="Breadcrumb" className="text-xs text-white/45">
            <Link href="/" className="hover:text-[#E91E8C]">Home</Link>
            {' / '}
            <span>{TITOLO}</span>
          </nav>

          <div className="mt-10 max-w-4xl sm:mt-16">
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              Il modo più semplice per trovare <span className="text-[#E91E8C]">escort</span> in Italia.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
              Escort Bella è la directory italiana di annunci di escort, trans e coppie. Chi cerca trova schede
              complete, recensioni e contatti diretti; chi pubblica ha uno spazio curato per farsi trovare, con
              regole e prezzi chiari.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/escort"
                className="inline-flex items-center gap-2 rounded-full bg-[#E91E8C] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_-6px_rgba(233,30,140,0.6)] transition-colors duration-200 ease-out hover:bg-[#D11A7D]"
              >
                Sfoglia gli annunci <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/registrazione"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:border-white/50 hover:bg-white/5"
              >
                Pubblica il tuo annuncio
              </Link>
            </div>
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:mt-20 md:grid-cols-4">
            {statistiche.map((s) => (
              <div key={s.etichetta} className="bg-[#1A1A1A]/90 px-5 py-5 sm:px-6 sm:py-6">
                <dt className="sr-only">{s.etichetta}</dt>
                <dd>
                  <span className="block text-3xl font-bold tracking-tight sm:text-4xl">{s.valore}</span>
                  <span className="mt-1 block text-xs text-white/55 sm:text-sm">{s.etichetta}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───────── Cos'è ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <p className={eyebrow}>Cos’è Escort Bella</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-[#1A1A1A] sm:text-5xl">
              Una vetrina, <span className="text-[#1A1A1A]/35">non un intermediario.</span>
            </h2>
          </div>
          <div className="space-y-5 text-base leading-relaxed text-[#1A1A1A]/70 sm:text-lg">
            <p>
              Raccogliamo in un unico posto gli annunci di escort donne, escort trans e coppie, organizzati per
              città, provincia e categoria: in pochi click vedi chi è disponibile nella tua zona.
            </p>
            <p>
              Le inserzioniste sono persone maggiorenni e indipendenti che acquistano uno spazio per la propria
              scheda. Escort Bella non organizza incontri: ogni contatto avviene direttamente tra chi legge
              l’annuncio e chi lo ha pubblicato.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Per chi cerca: griglia "bento" ───────── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:pb-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={eyebrow}>Per chi cerca</p>
            <h2 className={`mt-3 ${titoloSezione}`}>Tutto quello che serve per scegliere</h2>
          </div>
          <p className="text-sm text-[#1A1A1A]/55">Gratis, senza bisogno di un account.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-6 md:grid-rows-[auto_auto]">
          {/* Grande, scura: la ricerca per zona */}
          <div className="group relative isolate overflow-hidden rounded-3xl bg-[#1A1A1A] p-7 text-white md:col-span-4 md:row-span-2 md:p-10">
            <div className={`${glow} -bottom-24 -right-16 h-72 w-72 opacity-40 transition-opacity duration-500 group-hover:opacity-60`} aria-hidden="true" />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <MapPin className="h-6 w-6 text-[#E91E8C]" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-2xl font-bold sm:text-3xl">Cerca nella tua zona</h3>
            <p className="mt-3 max-w-md text-white/65">
              Filtra per città, provincia e categoria, oppure attiva la geolocalizzazione: le escort vicine a te
              compaiono ordinate per distanza, anche sulla mappa.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {CITTA_PRINCIPALI.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/${c.slug}`}
                    className="inline-block rounded-full bg-white/10 px-4 py-2 text-sm text-white/85 transition-colors duration-200 ease-out hover:bg-[#E91E8C] hover:text-white"
                  >
                    {c.nome}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/escort"
                  className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-[#E91E8C] hover:text-white"
                >
                  Tutte <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </div>

          <Funzione icona={Star} titolo="Recensioni reali" className="md:col-span-2">
            Leggi le opinioni di chi c’è già stato e, con un account, lascia la tua.
          </Funzione>
          <Funzione icona={MessageCircle} titolo="Contatto diretto" className="md:col-span-2">
            WhatsApp o telefono dalla scheda: nessun intermediario.
          </Funzione>
          <Funzione icona={Camera} titolo="Schede complete" className="md:col-span-3">
            Foto, video, descrizione e link social: tutto per scegliere con calma.
          </Funzione>
          <Funzione icona={Heart} titolo="I tuoi preferiti" className="md:col-span-3">
            Salva le schede che ti piacciono e ritrovale quando vuoi.
          </Funzione>
        </div>
      </section>

      {/* ───────── Categorie ───────── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:pb-24">
        <p className={eyebrow}>Le categorie</p>
        <h2 className={`mt-3 ${titoloSezione}`}>Trova chi stai cercando</h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {CATEGORIE_SEO.map((c, i) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-[#1A1A1A]/10 bg-white p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#E91E8C]/40 hover:shadow-[0_20px_50px_-20px_rgba(233,30,140,0.45)] sm:p-7"
              >
                <span className="text-sm font-medium text-[#1A1A1A]/35">0{i + 1}</span>
                <div className="mt-10">
                  <h3 className="text-2xl font-bold text-[#1A1A1A] transition-colors duration-200 group-hover:text-[#E91E8C]">
                    {maiuscola(c.etichetta)}
                  </h3>
                  <p className="mt-2 text-sm text-[#1A1A1A]/60">{DESCRIZIONE_CATEGORIA[c.slug] ?? 'Gli annunci della categoria in tutta Italia.'}</p>
                </div>
                <ArrowUpRight
                  className="absolute right-6 top-6 h-6 w-6 text-[#1A1A1A]/25 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#E91E8C]"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#1A1A1A]/55">
          <span>Le città più cercate:</span>
          {CITTA_PRINCIPALI.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`} className="underline-offset-4 hover:text-[#E91E8C] hover:underline">
              Escort {c.nome}
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── Per chi pubblica ───────── */}
      <section className="relative isolate overflow-hidden bg-[#1A1A1A] py-16 text-white sm:py-24">
        <div className={`${glow} -left-32 top-10 h-96 w-96 opacity-25`} aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <p className={eyebrow}>Per chi pubblica</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
                Il tuo annuncio, online in quattro passi.
              </h2>
              <p className="mt-5 max-w-md text-white/65">
                Sei una escort, una trans o una coppia? Crea la tua scheda e fatti trovare da chi cerca nella tua
                città. Nessun pagamento passa dal sito.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/registrazione"
                  className="inline-flex items-center gap-2 rounded-full bg-[#E91E8C] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#D11A7D]"
                >
                  Inizia ora <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/abbonamento"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:border-white/50 hover:bg-white/5"
                >
                  Vedi gli abbonamenti
                </Link>
              </div>
            </div>

            <ol className="relative ml-5 space-y-8 border-l border-white/15 pl-8 sm:pl-10">
              {PUBBLICA.map((p, i) => (
                <li key={p.titolo} className="relative">
                  <span className="absolute -left-[calc(2rem+1.25rem)] flex h-10 w-10 items-center justify-center rounded-full border border-[#E91E8C]/50 bg-[#1A1A1A] text-sm font-bold text-[#E91E8C] sm:-left-[calc(2.5rem+1.25rem)]">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-semibold sm:text-xl">{p.titolo}</h3>
                  <p className="mt-1 text-white/60">{p.testo}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ───────── Principi ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <p className={eyebrow}>I nostri principi</p>
        <h2 className={`mt-3 ${titoloSezione}`}>Su cosa non facciamo compromessi</h2>
        <ul className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {PRINCIPI.map(({ icona: Icona, titolo, testo }) => (
            <li key={titolo} className="border-t-2 border-[#1A1A1A] pt-6">
              <Icona className="h-7 w-7 text-[#E91E8C]" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-bold text-[#1A1A1A]">{titolo}</h3>
              <p className="mt-2 leading-relaxed text-[#1A1A1A]/65">{testo}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── FAQ: <details> funziona senza JavaScript e il testo resta nell'HTML ───────── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:pb-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className={eyebrow}>Domande frequenti</p>
            <h2 className={`mt-3 ${titoloSezione}`}>Hai un dubbio?</h2>
            <p className="mt-4 text-[#1A1A1A]/60">
              Le risposte alle domande che ci fanno più spesso. Non trovi la tua?{' '}
              <a href={`mailto:${COMPANY.email}`} className="font-medium text-[#E91E8C] hover:underline">
                Scrivici
              </a>
              .
            </p>
          </div>
          <div className="divide-y divide-[#1A1A1A]/10 border-y border-[#1A1A1A]/10">
            {FAQ.map((f) => (
              <details key={f.domanda} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-base font-semibold text-[#1A1A1A] transition-colors group-hover:text-[#E91E8C] sm:text-lg">
                    {f.domanda}
                  </h3>
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#1A1A1A]/15 text-lg leading-none text-[#1A1A1A]/60 transition-all duration-300 group-open:rotate-45 group-open:border-[#E91E8C] group-open:bg-[#E91E8C] group-open:text-white"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-[#1A1A1A]/65">{f.risposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Contatti ───────── */}
      <section className="px-4 pb-16 sm:pb-24">
        <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#1A1A1A] px-6 py-12 text-white sm:px-12 sm:py-16">
          <div className={`${glow} -right-20 -top-24 h-80 w-80 opacity-35`} aria-hidden="true" />
          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div>
              <p className={eyebrow}>Contatti</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
                Parliamone.
              </h2>
              <p className="mt-4 max-w-lg text-white/65">
                Una domanda, un annuncio da segnalare o un aiuto con la tua scheda: rispondiamo a utenti e
                inserzioniste.
              </p>
            </div>
            <ul className="grid gap-3">
              <Contatto href={whatsappHref()} icona={MessageCircle} etichetta="WhatsApp" valore={COMPANY.telefono} esterno />
              <Contatto href={`mailto:${COMPANY.email}`} icona={Mail} etichetta="Email" valore={COMPANY.email} />
              <Contatto href={telefonoHref} icona={Phone} etichetta="Telefono" valore={COMPANY.telefono} />
            </ul>
          </div>
          <p className="relative mt-10 border-t border-white/10 pt-5 text-xs text-white/35">{legalLine()}</p>
        </div>
      </section>
    </>
  );
}

function Funzione({
  icona: Icona,
  titolo,
  children,
  className = '',
}: {
  icona: typeof Search;
  titolo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group rounded-3xl border border-[#1A1A1A]/10 bg-white p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(26,26,26,0.35)] ${className}`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E91E8C]/10 transition-colors duration-300 group-hover:bg-[#E91E8C]">
        <Icona className="h-5 w-5 text-[#E91E8C] transition-colors duration-300 group-hover:text-white" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-[#1A1A1A]">{titolo}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[#1A1A1A]/60">{children}</p>
    </div>
  );
}

function Contatto({
  href,
  icona: Icona,
  etichetta,
  valore,
  esterno = false,
}: {
  href: string;
  icona: typeof Search;
  etichetta: string;
  valore: string;
  esterno?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        {...(esterno ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-colors duration-200 ease-out hover:border-[#E91E8C]/60 hover:bg-white/10"
      >
        <Icona className="h-5 w-5 flex-shrink-0 text-[#E91E8C]" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-white/45">{etichetta}</span>
          <span className="block truncate font-medium">{valore}</span>
        </span>
        <ArrowUpRight className="h-4 w-4 text-white/30 transition-colors group-hover:text-[#E91E8C]" aria-hidden="true" />
      </a>
    </li>
  );
}
