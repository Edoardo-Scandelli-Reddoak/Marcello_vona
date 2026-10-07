// Pagine SEO "nascoste" (non nel menu): /milano, /donna, /donna/milano.
// L'elenco delle città è in lib/citta.ts.

import type { EscortCardData } from '@/components/EscortCard';

export const BASE_URL = 'https://escort-bella.it';

export interface CategoriaSeo {
  /** Valore del filtro `categoria` dell'API (Categoria.nome) e slug dell'URL. */
  slug: string;
  /** Come la si chiama nei testi: "escort donne", "coppie escort". */
  etichetta: string;
}

// Le categorie sono gestite dall'admin, ma qui servono testi scritti per la
// ricerca ("escort donne", non "Donna"): per dare una pagina a una nuova
// categoria basta aggiungerla a questa lista (lo slug deve essere il suo
// `nome` nell'admin).
export const CATEGORIE_SEO: CategoriaSeo[] = [
  { slug: 'donna', etichetta: 'escort donne' },
  { slug: 'trans', etichetta: 'escort trans' },
  { slug: 'coppia', etichetta: 'coppie escort' },
];

const CATEGORIE_PER_SLUG = new Map(CATEGORIE_SEO.map((c) => [c.slug, c]));

export function getCategoriaSeo(slug: string): CategoriaSeo | undefined {
  return CATEGORIE_PER_SLUG.get(slug);
}

export function maiuscola(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface Lista {
  results: EscortCardData[];
  count: number;
}

// Prima pagina dei risultati, letta lato server così le schede sono già
// nell'HTML che legge Google. Le pagine sono ISR (revalidate nelle route).
export async function getEscort(filtri: Record<string, string>): Promise<Lista> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  try {
    const res = await fetch(`${API_URL}/escort/?${new URLSearchParams(filtri)}`);
    if (!res.ok) return { results: [], count: 0 };
    const data = await res.json();
    return { results: data.results || [], count: data.count || 0 };
  } catch {
    return { results: [], count: 0 };
  }
}
