import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgeGate from '@/components/AgeGate';
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
    'Escort Bella: la directory italiana di escort, trans e coppie. Sfoglia profili verificati, leggi recensioni reali e trova in pochi click la persona giusta nella tua zona.',
  applicationName: 'Escort Bella',
  keywords: ['escort', 'escort italia', 'directory escort', 'trans', 'coppie', 'donne', 'recensioni'],
  alternates: {
    canonical: '/',
  },
  icons: {
    // Favicon brand fornita (public/favicon-escort.svg). Il vecchio default
    // Next.js (src/app/favicon.ico) è stato rimosso così questa diventa
    // l'unica icona effettivamente servita.
    icon: [{ url: '/favicon-escort.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/favicon-escort.svg', type: 'image/svg+xml' }],
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
  return (
    <html lang="it">
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
