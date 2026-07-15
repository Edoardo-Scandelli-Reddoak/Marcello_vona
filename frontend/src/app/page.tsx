import type { HeroSettings } from '@/lib/api';
import HomeClient from './HomeClient';

// Fetch delle impostazioni hero lato server (SSR), così l'immagine di sfondo
// corretta è già presente nell'HTML del primo paint. Prima veniva fetchata
// lato client dopo il mount: per ~1s si vedeva l'immagine vecchia/di default
// e poi quella nuova (il "flash"). Con l'SSR lo swap non avviene più.
//
// `no-store`: niente cache, così una modifica dell'immagine dall'admin si
// riflette subito e gli URL firmati R2 (validi 24h) sono sempre freschi.
async function getHero(): Promise<HeroSettings | null> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  try {
    const res = await fetch(`${API_URL}/hero/`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as HeroSettings;
  } catch {
    // In dev con rete interna Docker il server potrebbe non raggiungere il
    // backend: restituiamo null e HomeClient farà da fallback lato client.
    return null;
  }
}

export default async function HomePage() {
  const hero = await getHero();
  return <HomeClient initialHero={hero} />;
}
