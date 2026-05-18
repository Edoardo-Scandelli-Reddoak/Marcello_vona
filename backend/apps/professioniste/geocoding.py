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
USER_AGENT = 'DirectoryEscort/1.0 (admin@directoryescort.it)'
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
