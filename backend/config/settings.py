import os
from pathlib import Path
from datetime import timedelta

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

# --- Sentry --------------------------------------------------------------
# Si attiva SOLO se SENTRY_DSN è settato in env; se non lo è, sentry_sdk.init
# non viene neppure chiamato → zero overhead in dev.
_sentry_dsn = os.environ.get('SENTRY_DSN', '').strip()
if _sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[DjangoIntegration()],
        # Quanti % delle richieste tracciare per performance (0 = solo errori).
        traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
        # Quanti % degli errori catturare con session replay (server-side: N/A,
        # ma teniamo coerente la nomenclatura con il frontend).
        send_default_pii=False,  # NON inviare PII a Sentry (email, IP) per GDPR.
        environment=os.environ.get('SENTRY_ENVIRONMENT', 'production' if not DEBUG else 'dev'),
        release=os.environ.get('RAILWAY_GIT_COMMIT_SHA', None),
    )


# Helper: scarta valori non-validi (vuoti o senza host). Serve a sopravvivere
# alle Railway references non ancora risolte: una variabile tipo
# `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` si espande a `https://` se il
# servizio referenziato non ha ancora un dominio. Senza questo filtro, il
# system check di Django/CORS fa crashare il container al boot.
def _valid_origins(raw: str) -> list[str]:
    from urllib.parse import urlparse
    items = []
    for o in (raw or '').split(','):
        o = o.strip()
        if not o:
            continue
        parsed = urlparse(o)
        if not parsed.scheme or not parsed.netloc:
            continue
        items.append(o)
    return items


def _valid_hosts(raw: str) -> list[str]:
    return [h.strip() for h in (raw or '').split(',') if h.strip()]


ALLOWED_HOSTS = _valid_hosts(os.environ.get('ALLOWED_HOSTS', '*'))

# Railway inietta automaticamente RAILWAY_PUBLIC_DOMAIN sui servizi pubblici:
# aggiungiamo quel dominio agli ALLOWED_HOSTS così non serve farlo a mano.
_railway_domain = os.environ.get('RAILWAY_PUBLIC_DOMAIN')
if _railway_domain and _railway_domain not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_railway_domain)

# CSRF_TRUSTED_ORIGINS: necessario per il Django admin via HTTPS in produzione.
# Va valorizzato con gli URL completi (schema + host), separati da virgola.
CSRF_TRUSTED_ORIGINS = _valid_origins(os.environ.get('CSRF_TRUSTED_ORIGINS', ''))
if _railway_domain:
    railway_url = f'https://{_railway_domain}'
    if railway_url not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(railway_url)

INSTALLED_APPS = [
    'unfold',
    'unfold.contrib.filters',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    # Local apps
    'apps.accounts',
    'apps.professioniste',
    'apps.reviews',
    'apps.banners',
    'apps.abbonamenti',
    'apps.preferiti',
    'apps.sblocchi',
    'apps.notifiche',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise serve gli static files direttamente dal processo gunicorn in produzione.
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Difesa contro trailing whitespace in DATABASE_URL: il CLI di Railway e i
# copy/paste dal dashboard a volte aggiungono spazi finali, che dj_database_url
# lascia passare facendo finire i caratteri nel nome del database. Faccio strip
# esplicito così l'errore "database 'railway  ' does not exist" non si ripresenta.
_db_url = os.environ.get('DATABASE_URL', '').strip()
DATABASES = {
    'default': dj_database_url.parse(_db_url) if _db_url
    else dj_database_url.config(default='postgres://postgres:postgres@db:5432/directory_escort')
}

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'it'
TIME_ZONE = 'Europe/Rome'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# --- Object storage (Cloudflare R2) -------------------------------------
# Si attiva SOLO se TUTTE le R2_* env sono valorizzate. Senza, ricadiamo
# sul filesystem locale (dev) → niente uploads su R2 da macchina dev per
# sbaglio. In produzione su Railway le 4 vanno settate.
R2_ACCESS_KEY_ID = os.environ.get('R2_ACCESS_KEY_ID', '').strip()
R2_SECRET_ACCESS_KEY = os.environ.get('R2_SECRET_ACCESS_KEY', '').strip()
R2_BUCKET_NAME = os.environ.get('R2_BUCKET_NAME', '').strip()
R2_ENDPOINT_URL = os.environ.get('R2_ENDPOINT_URL', '').strip()
USE_R2 = bool(R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME and R2_ENDPOINT_URL)

if USE_R2:
    # Default ACL 'private' + signed URLs (querystring_auth=True): ogni URL
    # generato da Django è una signed URL con scadenza. Per le foto pubbliche
    # impostiamo expiry 24h: il React Query cache lato frontend si rinnova
    # ben prima → utente non vede mai 403. Per i documenti d'identità in
    # futuro useremo una storage class dedicata con expiry brevissima (5 min)
    # + view admin-only.
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3.S3Storage',
            'OPTIONS': {
                'access_key': R2_ACCESS_KEY_ID,
                'secret_key': R2_SECRET_ACCESS_KEY,
                'bucket_name': R2_BUCKET_NAME,
                'endpoint_url': R2_ENDPOINT_URL,
                'region_name': 'auto',
                'signature_version': 's3v4',
                'addressing_style': 'virtual',
                'default_acl': 'private',
                'querystring_auth': True,
                'querystring_expire': 86400,  # 24h
                'file_overwrite': False,
            },
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
        },
    }
else:
    STORAGES = {
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
        },
    }

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS — _valid_origins è già definita in cima al file e filtra origin senza host.
CORS_ALLOWED_ORIGINS = _valid_origins(
    os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')
)
CORS_ALLOW_CREDENTIALS = True

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.accounts.authentication.CookieJWTAuthentication',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 12,
    # Throttle applicato SOLO alle view che dichiarano throttle_scope (login,
    # register) via ScopedRateThrottle — non globale, così le API pubbliche
    # (listing escort, ecc.) non vengono limitate. Conta per IP sugli anonimi.
    'DEFAULT_THROTTLE_RATES': {
        'login': '10/min',
        'register': '20/hour',
    },
}

# JWT
# In produzione il frontend (frontend.up.railway.app) e il backend (backend.up.railway.app)
# vivono su domini diversi: per consentire l'invio del cookie auth cross-origin
# serve SameSite='None' + Secure=True (impostati automaticamente quando DEBUG=False).
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SECURE': not DEBUG,
    'AUTH_COOKIE_SAMESITE': 'None' if not DEBUG else 'Lax',
}

# Dietro al proxy HTTPS di Railway: Django deve fidarsi del header X-Forwarded-Proto
# altrimenti redirect/cookie secure non funzionano correttamente.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# --- Security headers ----------------------------------------------------
# Sicuri anche in dev (HSTS su http è ignorato dai browser, nosniff/referrer
# non danno fastidio). Quelli che forzano HTTPS stanno sotto `if not DEBUG`
# così non rompono il dev locale su http://localhost.
SECURE_CONTENT_TYPE_NOSNIFF = True          # blocca il MIME-sniffing
SECURE_REFERRER_POLICY = 'same-origin'      # privacy: nessun referrer verso siti esterni
X_FRAME_OPTIONS = 'DENY'                     # anti-clickjacking (no framing del sito)

if not DEBUG:
    SECURE_SSL_REDIRECT = True               # http → https
    SECURE_HSTS_SECONDS = 31536000           # 1 anno
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Stripe (lasciate vuote in dev → checkout va in modalità mock)
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '').strip()
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '').strip()
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '').strip()

# Difesa contro whitespace/newline negli env Railway (stesso problema che ha
# colpito DATABASE_URL): un trailing space in FRONTEND_URL fa sì che Stripe
# rifiuti la Checkout Session con "Not a valid URL". Strip esplicito qui.
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3001').strip()

# Email — in dev usa la console (le email vengono stampate nei log Django).
# In produzione settare EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend'
# + EMAIL_HOST, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, EMAIL_PORT, EMAIL_USE_TLS.
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@directoryescort.it')

# Unfold Admin
UNFOLD = {
    "SITE_TITLE": "Directory Escort",
    "SITE_HEADER": "Directory Escort",
    "SITE_SYMBOL": "spa",
}
