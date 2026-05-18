FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps per psycopg2 e Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    postgresql-client \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-genera staticfiles in fase di build (Railway li serve via whitenoise).
# Usa una SECRET_KEY dummy: i settings reali arrivano da env in runtime.
RUN DJANGO_SECRET_KEY=build-only-not-used \
    DJANGO_DEBUG=False \
    DATABASE_URL=sqlite:///tmp/build.db \
    python manage.py collectstatic --noinput

# Railway inietta $PORT dinamicamente: il container deve bindare lì.
# - Migrazioni e seed_categories ad ogni deploy.
# - Gunicorn con 3 workers (Railway hobby ha poche risorse: alza solo se serve).
CMD sh -c "python manage.py migrate --noinput && \
    python manage.py seed_categories || true && \
    gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 --timeout 60 --access-logfile - --error-logfile -"
