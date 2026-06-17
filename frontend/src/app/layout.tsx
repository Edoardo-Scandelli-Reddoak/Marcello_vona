import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
import PageViewTracker from '@/components/PageViewTracker';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  // metadataBase serve a Next.js per generare URL assoluti per og:image e
  // canonical. Senza, Next mette i path relativi che alcuni crawler
  // (Google incluso) non interpretano correttamente.
  metadataBase: new URL('https://escort-bella.it'),
  title: {
    default: 'Escort Bella — Le migliori escort vicino a te',
    template: '%s — Escort Bella',
  },
  description:
    'Escort Bella è la directory italiana di escort, trans e coppie. Sfoglia profili verificati, leggi recensioni reali e trova la persona giusta nella tua zona in pochi click.',
  applicationName: 'Escort Bella',
  keywords: ['escort', 'escort italia', 'directory escort', 'trans', 'coppie', 'donne', 'recensioni'],
  alternates: {
    canonical: '/',
  },
  icons: {
    // Favicon brand finale (public/faviconescortfinale.svg) — versione
    // quadrata 221×221, sostituisce la vecchia favicon-escort.svg che era
    // rettangolare (221×124) e veniva schiacciata nel tab del browser.
    icon: [{ url: '/faviconescortfinale.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/faviconescortfinale.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Escort Bella',
    url: 'https://escort-bella.it',
    locale: 'it_IT',
    title: 'Escort Bella — Le migliori escort vicino a te',
    description:
      'La directory italiana di escort, trans e coppie. Profili verificati, recensioni reali, ricerca per zona.',
    images: [
      {
        url: '/hero-home.png',
        width: 2170,
        height: 725,
        alt: 'Escort Bella',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Escort Bella — Le migliori escort vicino a te',
    description:
      'La directory italiana di escort, trans e coppie. Profili verificati, recensioni reali.',
    images: ['/hero-home.png'],
  },
  // Indica esplicitamente a Google che il sito è per adulti
  // (utile per Safesearch e per non finire in penalizzazioni inattese).
  other: {
    rating: 'adult',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#F8F7F5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD strutturato per Google: Organization (entity del brand) +
  // WebSite (con SearchAction per il sitelinks-searchbox nelle SERP).
  // Renderizzato come <script type="application/ld+json"> via
  // dangerouslySetInnerHTML — pattern consigliato da Next.js per i dati
  // strutturati. Va dentro a `<head>` (Next.js lo issa lì in automatico
  // quando è un <script type="application/ld+json"> nel layout).
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://escort-bella.it/#organization',
        name: 'Escort Bella',
        url: 'https://escort-bella.it/',
        logo: {
          '@type': 'ImageObject',
          url: 'https://escort-bella.it/faviconescortfinale.svg',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+39-352-062-7731',
          email: 'info.escortbella@gmail.com',
          contactType: 'customer service',
          areaServed: 'IT',
          availableLanguage: 'Italian',
        },
      },
      {
        '@type': 'WebSite',
        '@id': 'https://escort-bella.it/#website',
        url: 'https://escort-bella.it/',
        name: 'Escort Bella',
        description:
          'La directory italiana di escort, trans e coppie. Profili verificati, recensioni reali, ricerca per zona.',
        publisher: { '@id': 'https://escort-bella.it/#organization' },
        inLanguage: 'it-IT',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://escort-bella.it/escort?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang="it">
      <head>
        {/* JSON-LD dati strutturati — letti da Google per knowledge panel,
            sitelinks-searchbox, e rich results. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        {/* Iubenda Cookie Solution — banner consenso GDPR. La config si
            riferisce al sito 14462765 su Iubenda; per modificare aspetto,
            pulsanti, lingue, blocchi cookie, ecc. → dashboard Iubenda. */}
        <Script id="iubenda-cs-config" strategy="beforeInteractive">
          {`var _iub = _iub || [];
_iub.csConfiguration = {"siteId":14462765,"cookiePolicyId":14462765,"lang":"it","storage":{"useSiteId":true}};`}
        </Script>
        <Script
          src="https://cdn.iubenda.com/cs/iubenda_cs.js"
          strategy="afterInteractive"
          charSet="UTF-8"
        />
        <Providers>
          <AgeGate />
          <PageViewTracker />
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
