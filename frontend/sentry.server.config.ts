// Configurazione Sentry per il runtime Node (server components, route handlers).
// Si attiva solo se SENTRY_DSN è valorizzata in env a runtime.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    environment: process.env.SENTRY_ENVIRONMENT ?? 'production',
  });
}
