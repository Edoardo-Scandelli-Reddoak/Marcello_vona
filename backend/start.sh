#!/bin/sh
# Avvio backend in produzione (Railway/Docker).
# - Migrazioni DB ad ogni deploy (idempotenti).
# - seed_categories popola le 3 categorie base (idempotente, non blocca su errore).
# - Gunicorn ascolta su $PORT (Railway lo inietta dinamicamente).
set -e

echo "→ Applicazione migrazioni..."
python manage.py migrate --noinput

echo "→ Seed categorie..."
python manage.py seed_categories || echo "seed_categories fallito (ignoro)"

echo "→ Avvio gunicorn su porta ${PORT:-8000}..."
exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers 3 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile -
