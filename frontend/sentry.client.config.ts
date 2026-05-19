// Configurazione Sentry per il browser.
// Si attiva solo se NEXT_PUBLIC_SENTRY_DSN è valorizzata in env a build-time
// (le NEXT_PUBLIC_* di Next.js vengono inlineate nel bundle del client).
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Quanti % delle interazioni tracciare per performance (0 = solo errori).
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Session Replay: registra le ultime N sessioni che hanno avuto un errore.
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'production',
    integrations: [
      Sentry.replayIntegration({
        // Anonimizza testo e media nei replay per ridurre rischio GDPR.
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
