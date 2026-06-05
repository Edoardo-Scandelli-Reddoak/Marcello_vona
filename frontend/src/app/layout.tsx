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
  title: 'Directory Escort — Donna, Trans e Coppia',
  description:
    'Scopri le migliori escort vicino a te. Sfoglia le schede, leggi le recensioni e trova la escort perfetta per te in pochi click!',
  icons: {
    icon: [{ url: '/favicon-escort.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/favicon-escort.svg', type: 'image/svg+xml' }],
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
