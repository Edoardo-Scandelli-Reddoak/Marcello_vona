"""Importa i documenti legali da Iubenda e li salva come contenuto del sito.

Uso (dalla cartella frontend/):
    python3 scripts/importa_documenti_legali.py

Scarica Privacy Policy, Cookie Policy e Termini e Condizioni dall'API
pubblica di Iubenda (sito 14462765). Ripulisce l'HTML dalla grafica di
Iubenda: niente script, icone, pulsanti, stili inline, footer. Scrive
src/content/legal/<doc>.ts, che le pagine /privacy, /cookie e /termini
rendono con lo stile del sito (vedi components/DocumentoLegale.tsx).

TITOLARE: per ora il nome e l'indirizzo del titolare NON vanno mostrati.
Lo script prende il testo del titolare dal documento (lo <span> dentro la
sezione "Titolare del Trattamento") e lo sostituisce ovunque con
TITOLARE_PUBBLICO. Per tornare a mostrare i dati veri basta mettere
TITOLARE_PUBBLICO = None e rilanciare lo script.
"""

import html
import json
import re
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

SITE_ID = 14462765
TITOLARE_PUBBLICO = 'Escort Bella — www.escort-bella.it'

DOCUMENTI = {
    'privacy': f'privacy-policy/{SITE_ID}',
    'cookie': f'privacy-policy/{SITE_ID}/cookie-policy',
    'termini': f'terms-and-conditions/{SITE_ID}',
}

# Link a documenti Iubenda di questo sito → pagine nostre.
LINK_INTERNI = [
    (re.compile(rf'^(https?:)?//www\.iubenda\.com/.*{SITE_ID}/cookie-policy'), '/cookie'),
    (re.compile(r'^(https?:)?//www\.iubenda\.com/app/private/privacy-policy/\d+/cookie-policy'), '/cookie'),
    (re.compile(rf'^(https?:)?//www\.iubenda\.com/(privacy-policy)/{SITE_ID}$'), '/privacy'),
    (re.compile(rf'^(https?:)?//www\.iubenda\.com/(terms-and-conditions|termini-e-condizioni)/{SITE_ID}$'), '/termini'),
]

# Sottoalberi buttati via interi.
TAG_SCARTATI = {'script', 'style', 'img', 'figure', 'button', 'svg', 'aside', 'footer', 'noscript'}
CLASSI_SCARTATE = {'table-of-content-btn-wrapper', 'card-buttons-group', 'main-header'}

TAG_VUOTI = {'br', 'hr'}
TAG_AMMESSI = {
    'section', 'article', 'header', 'div', 'span', 'p', 'br', 'hr',
    'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'strong', 'b', 'em', 'i',
    'details', 'summary', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'code', 'blockquote',
}
# Classi Iubenda che il nostro CSS (.doc-legale in globals.css) usa.
CLASSI_AMMESSE = {
    'sr-only', 'pill', 'pills-list', 'check-style-list', 'arrow-style-list', 'unstyled-list',
    'summary__cards-wrapper', 'summary__card', 'summary__card-section', 'legalDoc__accordion',
    'accordion__meta', 'accordion__body', 'body__details-box', 'meta__company', 'meta__location',
    'meta__keys', 'pre-footer', 'cta-section', 'btn', 'third-parties-item', 'main__section',
}


class Pulitore(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out: list[str] = []
        self.scarta = 0  # profondità dentro un sottoalbero scartato
        self.pila: list[tuple[str, bool]] = []  # (tag, emesso)

    def _scartare(self, tag, attrs):
        classi = set((attrs.get('class') or '').split())
        stile = (attrs.get('style') or '').replace(' ', '')
        return (
            tag in TAG_SCARTATI
            or classi & CLASSI_SCARTATE
            or 'display:none' in stile
            or (tag == 'h2' and 'sr-only' in classi)
        )

    def handle_starttag(self, tag, attrs_list):
        attrs = dict(attrs_list)
        if self.scarta:
            if tag not in TAG_VUOTI and tag != 'img':
                self.scarta += 1
            return
        if self._scartare(tag, attrs):
            if tag not in TAG_VUOTI and tag != 'img':
                self.scarta = 1
            return
        emesso = tag in TAG_AMMESSI
        if emesso:
            self.out.append(self._apri(tag, attrs))
        if tag not in TAG_VUOTI:
            self.pila.append((tag, emesso))

    def handle_startendtag(self, tag, attrs_list):
        if not self.scarta and tag in TAG_VUOTI:
            self.out.append(f'<{tag}>')

    def handle_endtag(self, tag):
        if tag in TAG_VUOTI:
            return
        if self.scarta:
            self.scarta -= 1
            return
        # Chiude fino al tag corrispondente (l'HTML di Iubenda ha <p> annidati).
        while self.pila:
            t, emesso = self.pila.pop()
            if emesso:
                self.out.append(f'</{t}>')
            if t == tag:
                break

    def handle_data(self, data):
        if not self.scarta:
            self.out.append(data)

    def handle_entityref(self, name):
        if not self.scarta:
            self.out.append(f'&{name};')

    def handle_charref(self, name):
        if not self.scarta:
            self.out.append(f'&#{name};')

    def _apri(self, tag, attrs):
        parti = [tag]
        if attrs.get('id'):
            parti.append(f'id="{html.escape(attrs["id"])}"')
        classi = [c for c in (attrs.get('class') or '').split() if c in CLASSI_AMMESSE]
        # Link "Gestisci le tue preferenze": lo aggancia il banner cookie di Iubenda.
        if 'iub-manage-preferences-btn' in (attrs.get('class') or ''):
            classi.append('iubenda-cs-preferences-link')
        if tag == 'li' and 'iub-manage-preferences-container' in (attrs.get('class') or ''):
            classi.append('preferenze-cookie')
        if classi:
            parti.append(f'class="{" ".join(classi)}"')
        if tag == 'a' and attrs.get('href') is not None:
            href = attrs['href'].strip()
            for regex, interno in LINK_INTERNI:
                if regex.match(href):
                    href = interno
                    break
            if href.startswith('mailto:'):
                href = href.replace('\r', '').replace('\n', '%0A')
            parti.append(f'href="{html.escape(href, quote=True)}"')
            if href.startswith(('http:', 'https:', '//')):
                parti.append('target="_blank" rel="noopener noreferrer"')
        if tag == 'details' and 'open' in attrs:
            parti.append('open')
        return '<' + ' '.join(parti) + '>'


def scarica(percorso):
    req = urllib.request.Request(
        f'https://www.iubenda.com/api/{percorso}', headers={'User-Agent': 'escort-bella-import'}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        dati = json.load(r)
    if not dati.get('success'):
        sys.exit(f'Iubenda non ha restituito il documento {percorso}')
    return dati['content']


def testo(frammento):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', frammento))).strip()


def titolare(sorgente):
    m = re.search(r'section__owner-and-data-controller.*?<span>(.*?)</span>', sorgente, re.S)
    if m:
        return m.group(1).strip()
    # Termini: "Questo Sito Web è un servizio di:" seguito dal paragrafo del titolare.
    m = re.search(r'servizio di:</p>\s*<p>\s*(.*?)</p>', sorgente, re.S)
    return m.group(1).strip() if m else None


def converti(sorgente):
    header = re.search(r'<header class="main-header">(.*?)</header>', sorgente, re.S).group(1)
    titolo = testo(re.search(r'<h1>(.*?)</h1>', header, re.S).group(1))
    intro = testo(re.search(r'<p>(.*?)</p>', header, re.S).group(1))
    aggiornato = testo(re.search(r'main-header__meta">(.*?)</p>', header, re.S).group(1))
    aggiornato = re.sub(r'^Ultima modifica:\s*', '', aggiornato)

    indice = [
        {'id': i, 'titolo': testo(t)}
        for i, t in re.findall(r'<li><a href="#([^"]+)">(.*?)</a></li>',
                               re.search(r'table-of-content-list">(.*?)</ul>', sorgente, re.S).group(1), re.S)
    ]

    corpo = sorgente[sorgente.index('<main>') + len('<main>'):]
    p = Pulitore()
    p.feed(corpo)
    p.close()
    contenuto = ''.join(p.out)

    contenuto = contenuto.replace('\r', '')
    contenuto = re.sub(r'<p>\s*</p>', '', contenuto)
    contenuto = re.sub(r'\n\s*\n+', '\n', contenuto)
    contenuto = re.sub(r'[ \t]+\n', '\n', contenuto).strip()
    return {'titolo': titolo, 'intro': intro, 'aggiornato': aggiornato, 'indice': indice, 'html': contenuto}


def main():
    cartella = Path(__file__).resolve().parent.parent / 'src' / 'content' / 'legal'
    cartella.mkdir(parents=True, exist_ok=True)
    sorgenti = {nome: scarica(percorso) for nome, percorso in DOCUMENTI.items()}
    titolari = {t for t in (titolare(s) for s in sorgenti.values()) if t}
    for nome, sorgente in sorgenti.items():
        doc = converti(sorgente)
        if TITOLARE_PUBBLICO is not None:
            if not titolari:
                sys.exit('Non trovo il titolare nei documenti: controlla la funzione titolare()')
            for t in titolari:
                doc['html'] = doc['html'].replace(t, TITOLARE_PUBBLICO)
                if t in json.dumps(doc, ensure_ascii=False):
                    sys.exit(f'{nome}: il titolare compare ancora nel documento')
        ts = (
            '// GENERATO da scripts/importa_documenti_legali.py — non modificare a mano.\n'
            'import type { DocumentoLegale } from "./tipi";\n\n'
            f'const documento: DocumentoLegale = {json.dumps(doc, ensure_ascii=False, indent=2)};\n\n'
            'export default documento;\n'
        )
        (cartella / f'{nome}.ts').write_text(ts, encoding='utf-8')
        print(f'{nome}: {len(doc["html"]):>6} caratteri, {len(doc["indice"])} voci di indice')


if __name__ == '__main__':
    main()
