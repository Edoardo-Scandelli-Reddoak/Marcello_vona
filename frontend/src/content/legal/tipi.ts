export interface DocumentoLegale {
  titolo: string;
  intro: string;
  /** Data dell'ultima modifica, già in italiano (es. "5 giugno 2026"). */
  aggiornato: string;
  indice: { id: string; titolo: string }[];
  /** HTML ripulito da scripts/importa_documenti_legali.py. */
  html: string;
}
