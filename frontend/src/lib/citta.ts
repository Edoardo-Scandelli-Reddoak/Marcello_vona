// Pagine SEO per città (es. /milano, /bergamo). Non sono nel menu: Google le
// trova dalla sitemap e dai link incrociati tra una città e l'altra.
//
// Ogni città filtra le escort per SIGLA PROVINCIA (non per il testo libero
// "città" che l'escort scrive in registrazione, troppo variabile): la pagina
// /milano mostra quindi Milano e provincia. Le province con due o tre
// capoluoghi (Forlì-Cesena, Pesaro e Urbino, Barletta-Andria-Trani,
// Massa-Carrara) hanno una pagina per ciascun capoluogo, tutte sulla stessa sigla.

export interface Citta {
  slug: string;
  nome: string;
  provincia: string;
  regione: string;
  capoluogoRegione?: boolean;
}

type Riga = [nome: string, provincia: string, capoluogoRegione?: boolean];

const PER_REGIONE: Record<string, Riga[]> = {
  'Piemonte': [
    ['Torino', 'TO', true], ['Alessandria', 'AL'], ['Asti', 'AT'], ['Biella', 'BI'],
    ['Cuneo', 'CN'], ['Novara', 'NO'], ['Verbania', 'VB'], ['Vercelli', 'VC'],
  ],
  "Valle d'Aosta": [['Aosta', 'AO', true]],
  'Lombardia': [
    ['Milano', 'MI', true], ['Bergamo', 'BG'], ['Brescia', 'BS'], ['Como', 'CO'],
    ['Cremona', 'CR'], ['Lecco', 'LC'], ['Lodi', 'LO'], ['Mantova', 'MN'],
    ['Monza', 'MB'], ['Pavia', 'PV'], ['Sondrio', 'SO'], ['Varese', 'VA'],
  ],
  'Trentino-Alto Adige': [['Trento', 'TN', true], ['Bolzano', 'BZ']],
  'Veneto': [
    ['Venezia', 'VE', true], ['Belluno', 'BL'], ['Padova', 'PD'], ['Rovigo', 'RO'],
    ['Treviso', 'TV'], ['Verona', 'VR'], ['Vicenza', 'VI'],
  ],
  'Friuli-Venezia Giulia': [
    ['Trieste', 'TS', true], ['Gorizia', 'GO'], ['Pordenone', 'PN'], ['Udine', 'UD'],
  ],
  'Liguria': [
    ['Genova', 'GE', true], ['Imperia', 'IM'], ['La Spezia', 'SP'], ['Savona', 'SV'],
  ],
  'Emilia-Romagna': [
    ['Bologna', 'BO', true], ['Ferrara', 'FE'], ['Forlì', 'FC'], ['Cesena', 'FC'],
    ['Modena', 'MO'], ['Parma', 'PR'], ['Piacenza', 'PC'], ['Ravenna', 'RA'],
    ['Reggio Emilia', 'RE'], ['Rimini', 'RN'],
  ],
  'Toscana': [
    ['Firenze', 'FI', true], ['Arezzo', 'AR'], ['Grosseto', 'GR'], ['Livorno', 'LI'],
    ['Lucca', 'LU'], ['Massa', 'MS'], ['Carrara', 'MS'], ['Pisa', 'PI'],
    ['Pistoia', 'PT'], ['Prato', 'PO'], ['Siena', 'SI'],
  ],
  'Umbria': [['Perugia', 'PG', true], ['Terni', 'TR']],
  'Marche': [
    ['Ancona', 'AN', true], ['Ascoli Piceno', 'AP'], ['Fermo', 'FM'], ['Macerata', 'MC'],
    ['Pesaro', 'PU'], ['Urbino', 'PU'],
  ],
  'Lazio': [
    ['Roma', 'RM', true], ['Frosinone', 'FR'], ['Latina', 'LT'], ['Rieti', 'RI'], ['Viterbo', 'VT'],
  ],
  'Abruzzo': [
    ["L'Aquila", 'AQ', true], ['Chieti', 'CH'], ['Pescara', 'PE'], ['Teramo', 'TE'],
  ],
  'Molise': [['Campobasso', 'CB', true], ['Isernia', 'IS']],
  'Campania': [
    ['Napoli', 'NA', true], ['Avellino', 'AV'], ['Benevento', 'BN'], ['Caserta', 'CE'], ['Salerno', 'SA'],
  ],
  'Puglia': [
    ['Bari', 'BA', true], ['Barletta', 'BT'], ['Andria', 'BT'], ['Trani', 'BT'],
    ['Brindisi', 'BR'], ['Foggia', 'FG'], ['Lecce', 'LE'], ['Taranto', 'TA'],
  ],
  'Basilicata': [['Potenza', 'PZ', true], ['Matera', 'MT']],
  'Calabria': [
    ['Catanzaro', 'CZ', true], ['Cosenza', 'CS'], ['Crotone', 'KR'],
    ['Reggio Calabria', 'RC'], ['Vibo Valentia', 'VV'],
  ],
  'Sicilia': [
    ['Palermo', 'PA', true], ['Agrigento', 'AG'], ['Caltanissetta', 'CL'], ['Catania', 'CT'],
    ['Enna', 'EN'], ['Messina', 'ME'], ['Ragusa', 'RG'], ['Siracusa', 'SR'], ['Trapani', 'TP'],
  ],
  'Sardegna': [
    ['Cagliari', 'CA', true], ['Sassari', 'SS'], ['Nuoro', 'NU'], ['Oristano', 'OR'], ['Carbonia', 'SU'],
    // OT = ex provincia Olbia-Tempio: sigla soppressa ma usata dalle escort
    ['Olbia', 'OT'],
  ],
};

// "Forlì" → "forli", "L'Aquila" → "l-aquila", "Reggio Emilia" → "reggio-emilia"
function slugify(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const CITTA: Citta[] = Object.entries(PER_REGIONE).flatMap(([regione, righe]) =>
  righe.map(([nome, provincia, capoluogoRegione]) => ({
    slug: slugify(nome),
    nome,
    provincia,
    regione,
    capoluogoRegione,
  })),
);

const PER_SLUG = new Map(CITTA.map((c) => [c.slug, c]));

export function getCitta(slug: string): Citta | undefined {
  return PER_SLUG.get(slug);
}

export function cittaStessaRegione(c: Citta): Citta[] {
  return CITTA.filter((x) => x.regione === c.regione && x.slug !== c.slug);
}

export const CAPOLUOGHI_REGIONE: Citta[] = CITTA.filter((c) => c.capoluogoRegione);
