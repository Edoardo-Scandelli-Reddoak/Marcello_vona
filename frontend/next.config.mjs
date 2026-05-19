import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone: genera una build minimale (.next/standalone) che contiene SOLO
  // i node_modules necessari → immagine Docker ~10x più piccola, meno memoria
  // in fase di build su Railway/altri PaaS con limiti di RAM.
  output: 'standalone',
  // ESLint warnings non devono far fallire il build di produzione.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Next.js 14: l'hook di instrumentation non è on di default.
  // Sentry lo usa per inizializzare il SDK nei runtime Node/Edge.
  experimental: {
    instrumentationHook: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      // Dev locale
      { protocol: 'http', hostname: 'localhost', port: '8000' },
      { protocol: 'http', hostname: 'localhost', port: '8001' },
      { protocol: 'http', hostname: 'backend', port: '8000' },
      // Esterni
      { protocol: 'https', hostname: 'unpkg.com' },
      // Railway: tutti i sottodomini del PaaS
      { protocol: 'https', hostname: '**.railway.app' },
      { protocol: 'https', hostname: '**.up.railway.app' },
    ],
  },
};

// Wrappa la config con Sentry. Se SENTRY_AUTH_TOKEN non è settato a build-time,
// il wrapper non fa nulla di nocivo (skippa solo source map upload).
// Se non si vuole usare Sentry, basta non settare NEXT_PUBLIC_SENTRY_DSN:
// il bundle non chiama init() e il SDK è quasi a costo zero (tree-shaken).
export default withSentryConfig(nextConfig, {
  // Org / project: vanno valorizzati solo se carichi davvero source maps su Sentry.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true, // no log durante il build se Sentry non è configurato
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
