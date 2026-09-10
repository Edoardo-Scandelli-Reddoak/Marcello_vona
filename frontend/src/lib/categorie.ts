/**
 * Helper condivisi per le categorie.
 *
 * Le categorie sono gestite dall'admin Django (non piu' una lista fissa nel
 * codice): qui restano solo la compatibilita' con gli slug legacy e i colori
 * dei badge, con un fallback per le categorie nuove.
 */

/** Slug legacy (pre-migrazione) ancora presenti nei JSON in cache. */
export const LEGACY_SLUG_MAP: Record<string, string> = {
  massaggi: 'donna',
  yoga: 'trans',
  relax: 'coppia',
};

/** Etichette legacy ancora servite da risposte in cache. */
const LABEL_LEGACY: Record<string, string> = {
  Massaggi: 'Donna',
  Yoga: 'Trans',
  Relax: 'Coppia',
  massaggi: 'Donna',
  yoga: 'Trans',
  relax: 'Coppia',
};

export interface StileCategoria {
  bg: string;
  text: string;
}

/** Colori dedicati alle tre categorie storiche. */
const STILE_NOTO: Record<string, StileCategoria> = {
  donna: { bg: 'bg-[#E91E8C]/10', text: 'text-[#E91E8C]' },
  trans: { bg: 'bg-[#1A1A1A]/8', text: 'text-[#1A1A1A]' },
  coppia: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

/**
 * Palette per le categorie aggiunte dall'admin. La scelta e' deterministica
 * (hash dello slug), cosi' una categoria ha sempre lo stesso colore fra card,
 * dettaglio e ricaricamenti, invece di ricadere tutte sul rosa di "donna".
 *
 * ATTENZIONE: devono restare stringhe letterali in questo file, altrimenti
 * Tailwind non genera le classi (vedi il glob su src/lib in tailwind.config.ts).
 */
const STILE_FALLBACK: StileCategoria[] = [
  { bg: 'bg-violet-50', text: 'text-violet-700' },
  { bg: 'bg-sky-50', text: 'text-sky-700' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { bg: 'bg-rose-50', text: 'text-rose-700' },
  { bg: 'bg-orange-50', text: 'text-orange-700' },
  { bg: 'bg-teal-50', text: 'text-teal-700' },
];

function hashStabile(valore: string): number {
  let h = 0;
  for (let i = 0; i < valore.length; i += 1) {
    h = (h * 31 + valore.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Rimappa gli slug legacy su quelli attuali. */
export function slugCanonico(slug?: string): string {
  if (!slug) return '';
  return LEGACY_SLUG_MAP[slug] ?? slug;
}

/** Colori del badge per una categoria, note o aggiunte dall'admin. */
export function stileCategoria(slug?: string): StileCategoria {
  const chiave = slugCanonico(slug);
  if (!chiave) return STILE_NOTO.donna;
  return STILE_NOTO[chiave] ?? STILE_FALLBACK[hashStabile(chiave) % STILE_FALLBACK.length];
}

/** Etichetta da mostrare nel badge, con rimappatura delle label legacy. */
export function labelCategoria(nome?: string, slug?: string): string {
  if (nome && LABEL_LEGACY[nome]) return LABEL_LEGACY[nome];
  if (slug && LABEL_LEGACY[slug]) return LABEL_LEGACY[slug];
  return nome ?? '';
}
