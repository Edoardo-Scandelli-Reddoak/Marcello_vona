// File richiesto da Next.js per inizializzare strumenti come Sentry
// nei diversi runtime (Node vs Edge). Viene caricato automaticamente
// quando `experimental.instrumentationHook` è abilitato in Next 13/14
// (su Next 15 è abilitato di default).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
