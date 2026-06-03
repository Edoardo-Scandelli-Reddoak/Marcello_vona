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

# Sync dei piani di abbonamento (listino ufficiale, prezzi, sconti).
# Idempotente: ri-eseguibile ad ogni deploy. Crea anche la Promozione di
# default (disattivata) se mancante.
echo "→ Sync piani abbonamento..."
python manage.py sync_piani || echo "sync_piani fallito (ignoro)"

# Crea/aggiorna superuser admin se DJANGO_ADMIN_EMAIL/PASSWORD sono settati.
# Idempotente — non rompe il boot se le env var mancano.
echo "→ Ensure admin..."
python manage.py ensure_admin || echo "ensure_admin fallito (ignoro)"

# Seed dei 5 profili demo (idempotente: usa get_or_create).
# Si esegue ad ogni deploy ma è no-op se i profili esistono già.
# Per disabilitarlo definitivamente in produzione: settare SKIP_SEED_DEMO=1.
if [ "${SKIP_SEED_DEMO:-}" != "1" ]; then
    echo "→ Seed profili demo..."
    python manage.py seed_demo || echo "seed_demo fallito (ignoro)"
fi

echo "→ Avvio gunicorn su porta ${PORT:-8000}..."
exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers 3 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile -
