import os
from pathlib import Path
from datetime import timedelta

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'


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

DATABASES = {
    'default': dj_database_url.config(
        default='postgres://postgres:postgres@db:5432/directory_escort'
    )
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
# WhiteNoise: hashing + compressione per cache-friendly delivery.
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

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

# Stripe (lasciate vuote in dev → checkout va in modalità mock)
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3001')

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
