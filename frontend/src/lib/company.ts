/**
 * Dati identificativi dell'operatore del sito — unica fonte di verità.
 *
 * Servono in due contesti diversi:
 * - per legge, nel footer di un sito che vende online (art. 7 D.Lgs. 70/2003;
 *   per le società anche art. 2250 c.c., che richiede sede, registro imprese
 *   e capitale sociale);
 * - in istruttoria dai provider di pagamento, che verificano che i dati sul
 *   sito combacino con quelli del contratto e del registro imprese.
 *
 * I campi lasciati a stringa vuota NON vengono renderizzati (vedi legalLine):
 * così un dato ancora da recuperare non produce un'etichetta vuota nel footer.
 * Per completarlo basta valorizzarlo qui — il footer si aggiorna da sé.
 */
interface CompanyInfo {
  /** Denominazione come risulta al registro imprese, forma giuridica inclusa. */
  ragioneSociale: string;
  /** Sede legale: via e numero civico. */
  indirizzo: string;
  /** CAP, comune e provincia della sede legale. Es. "00199 Roma (RM)". */
  cittaCap: string;
  partitaIva: string;
  /** Solo se diverso dalla partita IVA (es. ditte individuali). */
  codiceFiscale: string;
  /** Numero REA / iscrizione al Registro delle Imprese. */
  rea: string;
  /** Obbligatorio per le S.r.l. Es. "10.000,00 € i.v.". */
  capitaleSociale: string;
  email: string;
  pec: string;
  /** Formato leggibile; il link `tel:` viene derivato in telefonoHref. */
  telefono: string;
}

export const COMPANY: CompanyInfo = {
  ragioneSociale: 'escort-bella',
  indirizzo: 'Via Gargano 36/38',
  cittaCap: '',
  partitaIva: '14119931005',
  codiceFiscale: '',
  rea: '',
  capitaleSociale: '',
  email: 'info.escortbella@gmail.com',
  pec: '',
  telefono: '+39 352 062 7731',
};

/** Stessa normalizzazione usata dai bottoni "Chiamami" delle schede. */
export const telefonoHref = `tel:${COMPANY.telefono.replace(/[^\d+]/g, '')}`;

/**
 * Riga di identificazione dell'operatore, con i campi vuoti omessi.
 * Es. "Escort Bella S.r.l. · Via Gargano 36/38, 00199 Roma (RM) · P.IVA 14119931005".
 */
export function legalLine(): string {
  const sede = [COMPANY.indirizzo, COMPANY.cittaCap].filter(Boolean).join(', ');
  return [
    COMPANY.ragioneSociale,
    sede,
    COMPANY.partitaIva && `P.IVA ${COMPANY.partitaIva}`,
    COMPANY.codiceFiscale && `C.F. ${COMPANY.codiceFiscale}`,
    COMPANY.rea && `REA ${COMPANY.rea}`,
    COMPANY.capitaleSociale && `Capitale sociale ${COMPANY.capitaleSociale}`,
    COMPANY.pec && `PEC ${COMPANY.pec}`,
  ]
    .filter(Boolean)
    .join(' · ');
}
