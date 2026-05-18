# Cursor Project Spec — Directory Escort
## Versione 2 — Struttura pagine e contenuti

---

## Stack tecnico

- **Frontend**: Next.js 14 (App Router)
- **Backend / API**: Django 5.x + Django REST Framework
- **Admin panel**: Django Unfold
- **Database**: PostgreSQL
- **Autenticazione**: JWT (djangorestframework-simplejwt), httpOnly cookie
- **Mappe**: OpenStreetMap + Leaflet.js / react-leaflet
- **Storage file**: Django media files
- **Containerizzazione**: Docker + docker-compose
- **Frontend librerie**: Tailwind CSS, shadcn/ui, react-hook-form + zod, TanStack Query, react-leaflet

---

## Palette colori

Il sito usa esclusivamente tre colori base, declinati in shade chiare e scure:

- **Bianco sporco** — sfondo principale (non bianco puro, es. #F8F7F5)
- **Nero morbido** — testi e elementi scuri (non nero puro, es. #1A1A1A)
- **Fucsia** — colore accent, CTA, elementi interattivi, highlights (es. #E91E8C o simile vivace)

Nessun altro colore. Grigi neutri solo dove necessario per separatori e sfondo secondario.

---

## Categorie escort

Le categorie sono esattamente tre:

1. **Massaggi**
2. **Yoga**
3. **Relax**

---

## Pagina: Homepage (`/`)

### Header (fisso in cima, presente su tutte le pagine)
- Logo a sinistra
- Menu di navigazione centrale: link a "Escort", link alla sezione recensioni, altri link utili
- A destra: pulsante "Iscriviti come escort" (fucsia, prominente) + eventuale login utente

---

### Sezione 1 — Hero
Sezione d'impatto visiva a tutta larghezza.

Contenuto:
- Titolo principale del sito (headline)
- Sottotitolo descrittivo breve
- Nessun CTA nella hero — la ricerca è nella sezione subito sotto

---

### Sezione 2 — Ricerca e filtri
Barra di ricerca prominente, centrata, con:

- Campo testo libero (cerca per nome o parola chiave)
- Filtro **Categoria** — selezione tra: Massaggi, Yoga, Relax
- Filtro **Distanza da me** — slider o select (es. 5 km, 10 km, 25 km, 50 km) — richiede permesso geolocalizzazione browser
- Pulsante di ricerca

Al submit, porta alla pagina Escort con i filtri già applicati.

---

### Sezione 3 — Escort in evidenza (carosello)
Titolo sezione: es. "Le più apprezzate"

Carosello orizzontale di card escort, ordinato per rating.

Ogni card mostra:
- Foto (verticale, portrait)
- Nome
- Categoria
- Stelle rating + numero recensioni
- Città
- Distanza dall'utente (se geolocalizzazione disponibile)
- Icona preferiti (cuore)

Click sulla card → apre la scheda pubblica dell'escort.

---

### Sezione 4 — Vicino a te (carosello)
Titolo sezione: es. "Vicino a te"

Stesso layout a carosello della sezione precedente, ma ordinate per distanza crescente rispetto alla posizione dell'utente.

Se l'utente non ha concesso il permesso di geolocalizzazione, mostrare un messaggio che invita ad attivarlo per vedere i risultati, oppure mostrare le più recenti come fallback.

---

### Sezione 5 — Recensioni sul sito
Titolo sezione: es. "Cosa dicono di noi"

Sezione con recensioni generali sul sito (non sulle singole escort). Carosello o griglia di testimonianze con:
- Testo recensione
- Nome utente
- Stelle

Queste recensioni sono gestite dall'admin Django e inserite manualmente.

---

### Footer
- Logo
- Link principali (Escort, Come funziona, Contatti)
- Link legali (Privacy Policy, Termini e condizioni, Cookie)
- Copyright

---

## Pagina: Escort (`/escort`)

Pagina dedicata alla navigazione e ricerca di tutte le escort approvate.

---

### Header della pagina
- Titolo pagina
- Barra di ricerca e filtri (stessa logica della homepage ma sempre visibile):
  - Campo testo
  - Filtro Categoria (Massaggi / Yoga / Relax)
  - Filtro Distanza
  - Filtro Rating minimo (es. 3+, 4+, 5 stelle)
  - Pulsante per resettare i filtri
- Toggle vista: icona **Lista** | icona **Mappa** (switcher ben visibile)

---

### Vista Lista

Griglia di card escort (3 colonne desktop, 2 tablet, 1 mobile).

Ogni card identica a quella del carosello homepage.

In fondo alla pagina: **paginazione** (es. 12 escort per pagina).

Sopra la griglia: contatore risultati (es. "47 escort trovate") e ordinamento (Per distanza / Per rating / Più recenti).

---

### Vista Mappa

Mappa OpenStreetMap a tutta larghezza (o affiancata alla lista su desktop).

Ogni escort approvata ha un **pin sulla mappa** nella sua posizione.

Il colore del pin varia per categoria:
- Massaggi → pin fucsia
- Yoga → pin nero
- Relax → pin bianco con bordo nero

Click su un pin → apre un popup/tooltip con: foto thumbnail, nome, categoria, rating, pulsante "Vedi scheda".

---

## Pagina: Profilo escort (`/escort/[slug]`)

Layout a due colonne su desktop.

### Colonna sinistra (principale)
- Galleria foto (slider, la prima è l'immagine principale)
- Nome e categoria
- Descrizione / bio
- Tag

### Colonna destra (sticky)
- Foto profilo circolare
- Rating stelle + numero recensioni
- Città e distanza dall'utente
- Numero di telefono — oscurato di default, si rivela solo dopo click (anti-scraping)
- Pulsante "Salva nei preferiti" (cuore)
- Mini mappa con pin sulla posizione

### Sotto le due colonne
- Sezione recensioni: lista recensioni esistenti + form per aggiungere una recensione (richiede login come utente)

---

## Flusso: Iscrizione escort

Accessibile dal pulsante "Iscriviti come escort" nell'header.

Form multi-step con progress indicator visibile:

**Step 1 — Crea account**
- Email
- Password
- Conferma password

**Step 2 — Il tuo profilo**
- Nome visualizzato pubblicamente
- Categoria (Massaggi / Yoga / Relax)
- Tag aggiuntivi (es. "domicilio", "disponibile weekend")
- Bio / descrizione
- Numero di telefono
- Città e indirizzo (geocoding automatico → lat/lng salvati in background)

**Step 3 — Le tue foto**
- Upload foto profilo (obbligatorio)
- Upload galleria immagini (opzionale, max 10 foto)
- Supporto drag & drop e anteprima prima dell'invio

**Step 4 — Verifica identità**
- Upload documento d'identità (fronte + retro)
- Nota visibile: il documento è visibile solo al team di moderazione, non sarà mai pubblicato pubblicamente
- Checkbox accettazione Privacy Policy e Termini e condizioni

**Step 5 — Conferma**
- Messaggio di conferma invio
- Spiegazione: il profilo sarà visibile dopo la verifica del documento da parte del team (entro X ore/giorni)
- Possibilità di accedere alla propria dashboard per monitorare lo stato

---

## Area: Dashboard escort (`/dashboard`)

Accessibile solo dopo login con account di tipo "escort".

Contenuto:
- Stato del profilo: badge visibile (In attesa di verifica / Approvato / Rifiutato)
- Modifica dati profilo e foto
- Visualizzazione delle recensioni ricevute
- Statistiche base: visualizzazioni profilo, click sul numero di telefono

---

## Area: Admin Django Unfold

Pannello di amministrazione accessibile solo agli admin del sito.

Funzionalità principali:
- Lista escort con filtro per stato (in attesa / approvate / rifiutate)
- Vista dettaglio con documento d'identità visualizzabile inline
- Azioni: Approva / Rifiuta con invio email automatica all'escort
- Gestione categorie e tag
- Gestione banner pubblicitari (per posizione e date)
- Moderazione recensioni
- Gestione recensioni del sito (quelle mostrate in homepage)

---

## Note generali per Cursor

- Il sito è completamente responsive, mobile-first
- Ogni pagina Next.js deve avere loading.tsx e error.tsx
- Il documento d'identità non deve mai essere esposto tramite API pubblica — accessibile solo dall'admin Django
- La geolocalizzazione è sempre opzionale — il sito funziona anche senza
- I numeri di telefono non devono mai apparire nel codice sorgente HTML prima del click dell'utente
- Le tre categorie (Massaggi, Yoga, Relax) sono fisse — non dinamiche da DB, oppure pre-seeded al primo avvio
