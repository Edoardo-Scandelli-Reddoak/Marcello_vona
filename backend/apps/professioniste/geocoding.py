"""Lightweight geocoding helper using OpenStreetMap Nominatim.

No API key required. Rate limited to 1 req/sec by Nominatim usage policy
(fine for our use case: a single user updates her location occasionally).
"""

import json
import logging
from urllib.parse import urlencode
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
USER_AGENT = 'EscortBella/1.0 (info.escortbella@gmail.com)'
REQUEST_TIMEOUT_SEC = 6


def geocode_address(address: str) -> dict | None:
    """Resolve a free-form address to {lat, lng, citta, display_name} or None.

    Restricts results to Italy and returns the first match.
    """
    address = (address or '').strip()
    if not address:
        return None

    params = {
        'q': address,
        'format': 'jsonv2',
        'limit': 1,
        'addressdetails': 1,
        'countrycodes': 'it',
        'accept-language': 'it',
    }
    url = f'{NOMINATIM_URL}?{urlencode(params)}'
    req = Request(url, headers={'User-Agent': USER_AGENT})

    try:
        with urlopen(req, timeout=REQUEST_TIMEOUT_SEC) as resp:
            payload = json.loads(resp.read().decode('utf-8'))
    except Exception:
        logger.exception('Geocoding request failed for %r', address)
        return None

    if not payload:
        return None

    result = payload[0]
    addr = result.get('address') or {}
    citta = (
        addr.get('city')
        or addr.get('town')
        or addr.get('village')
        or addr.get('municipality')
        or addr.get('county')
        or ''
    )
    try:
        return {
            'lat': float(result['lat']),
            'lng': float(result['lon']),
            'citta': citta,
            'display_name': result.get('display_name', address),
            'address': addr,
        }
    except (KeyError, TypeError, ValueError):
        return None


def _join(parts) -> str:
    return ', '.join(p.strip() for p in parts if p and str(p).strip())


def geocode_location(via='', cap='', citta='', provincia='', nazione='') -> dict | None:
    """Geocodifica un indirizzo strutturato con fallback a livello città.

    Prova prima l'indirizzo completo (via + civico). Se Nominatim non trova
    un match — caso frequente quando la via esatta non è mappata in
    OpenStreetMap — riprova con solo città + provincia + nazione. Le
    coordinate a livello città sono più che sufficienti per l'ordinamento
    "vicino a te" e fanno sì che lat/lng siano quasi sempre valorizzati,
    invece di restare vuoti al primo tentativo fallito.
    """
    full = _join([via, cap, citta, provincia, nazione])
    if full:
        geo = geocode_address(full)
        if geo:
            return geo

    coarse = _join([citta, provincia, nazione])
    if coarse and coarse != full:
        return geocode_address(coarse)
    return None
