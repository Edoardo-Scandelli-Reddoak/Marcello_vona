import hashlib
import re

from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PageView


# Pattern grezzo per filtrare i bot più comuni — non vogliamo gonfiare le
# metriche con scraper, anteprime social, monitor di uptime, ecc.
_BOT_RE = re.compile(
    r'(bot|crawler|spider|slurp|preview|bingpreview|googlebot|yandex|baidu|'
    r'duckduckgo|facebookexternalhit|whatsapp|telegram|skype|lighthouse|'
    r'pingdom|uptimerobot|headlesschrome|phantomjs|pythonrequests|axios|curl)',
    re.IGNORECASE,
)


def _client_ip(request) -> str:
    # Railway/Cloudflare appendono l'IP in X-Forwarded-For; uso il primo
    # elemento, che è quello del client (gli altri sono i proxy intermedi).
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def _ip_hash(ip: str) -> str:
    """SHA-256 di IP + SECRET_KEY, troncato a 32 char hex.

    Sufficiente per contare unique visitor giornalieri in modo anonimo
    e completamente irreversibile.
    """
    raw = f'{ip}|{settings.SECRET_KEY}'.encode('utf-8')
    return hashlib.sha256(raw).hexdigest()[:32]


class PageViewBeaconView(APIView):
    """Endpoint pubblico chiamato dal frontend a ogni cambio di route.

    Anonimo, no auth, no CSRF. Filtra i bot via user-agent così le metriche
    riflettono visitatori reali. Non blocca mai il caller: in caso di
    errore restituisce comunque 204 (best-effort).
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            user_agent = (request.META.get('HTTP_USER_AGENT') or '')[:500]
            if _BOT_RE.search(user_agent):
                return Response(status=status.HTTP_204_NO_CONTENT)

            path = (request.data.get('path') or '/')[:500]
            referer = (request.data.get('referer') or request.META.get('HTTP_REFERER') or '')[:1000]
            PageView.objects.create(
                path=path,
                ip_hash=_ip_hash(_client_ip(request)),
                user_agent=user_agent,
                referer=referer,
            )
        except Exception:
            # Tracking è best-effort: un errore qui non deve mai impattare
            # la navigazione del client. Sentry continuerà a vedere
            # comunque eventuali eccezioni a livello di middleware.
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)
