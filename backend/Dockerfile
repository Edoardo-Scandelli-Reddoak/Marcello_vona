# syntax=docker/dockerfile:1
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

# Pre-genera staticfiles a build-time (Railway li serve via whitenoise).
# Usa SECRET_KEY dummy + sqlite: i settings reali arrivano da env a runtime.
RUN DJANGO_SECRET_KEY=build-only-not-used \
    DJANGO_DEBUG=False \
    DATABASE_URL=sqlite:///tmp/build.db \
    python manage.py collectstatic --noinput

# Wrapper script che esegue migrate + gunicorn (vedi start.sh).
RUN chmod +x ./start.sh
EXPOSE 8000
CMD ["./start.sh"]
