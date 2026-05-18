# Deploy su Railway — guida operativa

Il progetto è un monorepo con **2 servizi** (Django backend + Next.js frontend) e un
**Postgres** gestito. Vanno creati 3 servizi nello stesso progetto Railway.

---

## 1. Postgres

1. Nel progetto Railway → **+ New → Database → Add PostgreSQL**.
2. Railway crea il servizio `Postgres` e popola automaticamente la variabile
   `DATABASE_URL` (la useremo via reference dal backend).

---

## 2. Servizio **backend** (Django)

1. **+ New → GitHub Repo → Edoardo-Scandelli-Reddoak/Marcello_vona**.
   Quando chiede il root, lascia vuoto: lo settiamo dopo.
2. Apri il servizio → **Settings**:
   - **Root Directory** → `backend`
   - **Build** → builder già impostato a `Dockerfile` (letto da `railway.json`).
   - **Networking → Generate Domain** (esempio: `marcello-vona-backend.up.railway.app`).
3. **Variables** (aggiungi queste — i valori `${{ }}` sono reference Railway):

   | Nome | Valore |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `DJANGO_SECRET_KEY` | _genera una chiave random lunga (50+ char)_ |
   | `DJANGO_DEBUG` | `False` |
   | `ALLOWED_HOSTS` | `${{RAILWAY_PUBLIC_DOMAIN}}` |
   | `CSRF_TRUSTED_ORIGINS` | `https://${{RAILWAY_PUBLIC_DOMAIN}},https://<dominio-frontend>` |
   | `CORS_ALLOWED_ORIGINS` | `https://<dominio-frontend>` |
   | `FRONTEND_URL` | `https://<dominio-frontend>` |
   | `STRIPE_SECRET_KEY` | _opzionale — vuoto = modalità mock_ |
   | `STRIPE_PUBLISHABLE_KEY` | _opzionale_ |
   | `STRIPE_WEBHOOK_SECRET` | _opzionale_ |

   > **Nota**: `<dominio-frontend>` lo sai solo dopo aver generato il dominio del
   > servizio frontend (step 3). Crealo prima, poi torna qui ad aggiornare le 3
   > variabili (`CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`).

4. **Deploy** → il container parte; il `CMD` esegue `migrate` + `collectstatic` +
   `gunicorn` automaticamente.

---

## 3. Servizio **frontend** (Next.js)

1. **+ New → GitHub Repo → stesso repo**.
2. **Settings**:
   - **Root Directory** → `frontend`
   - **Networking → Generate Domain** (es. `marcello-vona-frontend.up.railway.app`).
3. **Variables**:

   | Nome | Valore |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<dominio-backend>/api` |
   | `NEXT_PUBLIC_MEDIA_URL` | `https://<dominio-backend>` |

4. **Settings → Build → Build Args**: le `NEXT_PUBLIC_*` vanno passate anche come
   build args (Next.js inlinea queste variabili nel bundle al build time). Aggiungi:

   - `NEXT_PUBLIC_API_URL=https://<dominio-backend>/api`
   - `NEXT_PUBLIC_MEDIA_URL=https://<dominio-backend>`

   In alternativa, Railway recente passa automaticamente tutte le variabili come
   build args — verifica nel pannello.

5. **Deploy** → builda Next.js e lo avvia su `$PORT`.

---

## 4. Primo seed (opzionale)

Per popolare il DB con i 5 profili demo:

1. Apri il servizio **backend** → **... → Open Shell** (oppure `railway run` da CLI).
2. Esegui:
   ```sh
   python manage.py seed_demo
   ```

---

## 5. Cosa controllare se un servizio è "build failed"

- **Backend**:
  - Log → cerca `ImportError` o `psycopg2`.
  - Verifica che `DATABASE_URL` sia agganciato al Postgres.
  - Verifica che `DJANGO_SECRET_KEY` sia settato (senza, gunicorn fallisce a runtime).
- **Frontend**:
  - Se la build fallisce con `Module not found`, controlla che `node_modules`
    non sia stato accidentalmente committato (è in `.dockerignore`).
  - Se le immagini del backend non si caricano: il dominio del backend deve
    matchare un `remotePattern` in `next.config.mjs`. Quelli `*.railway.app` e
    `*.up.railway.app` sono già coperti.

---

## 6. Limiti noti del deploy su Railway

- **File uploads (media)**: il filesystem dei container Railway è **effimero** — i
  file caricati dalle escort (foto profilo, gallerie, video) **andranno persi ad
  ogni redeploy**. Per renderlo production-grade serve uno storage object (S3, R2,
  o un volume Railway con backup). Per ora la demo va benissimo perché i media
  demo vengono ricreati dal seed.
- **Stripe webhook**: se attivi Stripe vero (non mock), il webhook URL da
  configurare nello Stripe Dashboard è
  `https://<dominio-backend>/api/abbonamenti/stripe-webhook/`.
