# Deploy completo: Railway (API + Postgres), Vercel (Web) y Cloudflare R2 (Media)

Esta guía te lleva paso a paso desde el repo local hasta producción usando:
- Backend y Postgres gestionado en Railway
- Frontend (apps/web) en Vercel
- Storage de objetos (media, tours, videos) en Cloudflare R2 (S3 compatible)

## 0) Prerrequisitos
- Repo clonado y que compile en local.
- Cuentas en Railway, Vercel y Cloudflare.
- Tokens/keys: Mapbox, Stripe, (opcional) Google Gemini.

## 1) Variables de entorno base
1. Copia el ejemplo a `.env` en la raíz del repo:
   - `cp env.example .env`
2. Completa al menos:
   - `SECRET_KEY`
   - `CLIENT_URL` (en dev: `http://localhost:3000` o `http://localhost:5173`)
   - `VITE_MAPBOX_ACCESS_TOKEN` (en `apps/web/.env` si usas separación por app)
3. Para producción usaremos valores gestionados por Railway/Vercel/R2, pero deja `.env` listo para dev.

## 2) Backend en Railway (Django API + Postgres)
1. Crea proyecto en Railway y añade servicio desde repositorio.
2. Configura Monorepo Root para el servicio del backend a `services/api`.
3. Base de datos:
   - Añade el plugin Postgres en Railway (Add Service → PostgreSQL).
   - Ve a la pestaña "Connect/Variables" y copia la `DATABASE_URL`.
4. Variables de entorno del servicio (Railway → Service → Variables):
   - `DATABASE_URL` = valor copiado del plugin (usa `?sslmode=require` si tu instancia lo requiere).
   - `SECRET_KEY` (productivo).
   - `ALLOWED_HOSTS` con tu dominio Railway (y luego el custom), separado por comas.
   - `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS` con tus dominios frontend (Vercel y custom), separados por comas.
   - Si usarás R2: `USE_S3=True`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_ENDPOINT_URL`.
5. Builds/Start:
   - Build (por defecto Nixpacks detecta Python y ejecuta `pip install -r requirements.txt`).
   - Start command recomendado:
     ```
     python manage.py migrate && gunicorn skyterra_backend.wsgi:application --bind 0.0.0.0:$PORT
     ```
6. Despliega (Deploy). Verifica los logs: debe aplicar migraciones y levantar gunicorn.

### 2.1) Dominio para el backend
- Usa el dominio temporal de Railway para pruebas.
- Para dominio propio: crea un CNAME desde `api.tu-dominio.com` al dominio de Railway del servicio.
- Actualiza `ALLOWED_HOSTS` y `CSRF_TRUSTED_ORIGINS` con el dominio final (https://api.tu-dominio.com).

## 3) Cloudflare R2 (Media, S3 compatible)
1. En Cloudflare, crea un bucket R2 (privado por defecto).
2. Genera Access Key y Secret (Tokens → R2 API Tokens).
3. Configura en Railway (servicio backend → Variables):
   - `USE_S3=True`
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - `AWS_STORAGE_BUCKET_NAME` = nombre del bucket
   - `AWS_S3_ENDPOINT_URL` = `https://<accountid>.r2.cloudflarestorage.com`
   - Opcional: `AWS_S3_CUSTOM_DOMAIN` si sirves media vía CDN dominio propio
4. CORS en R2: agrega orígenes de tu web (Vercel y dominio propio) si piensas consumir media directamente desde el navegador.
5. Verifica subidas via endpoints del backend (si están habilitados): `POST /api/media/presign-upload` y `POST /api/media/presign-read`.

## 4) Frontend en Vercel (apps/web)
1. Importa el repositorio en Vercel y selecciona como Root Directory `apps/web`.
2. Variables de entorno del proyecto (Vercel → Settings → Environment Variables):
   - `VITE_API_BASE_URL` = `https://api.tu-dominio.com/api` (o el dominio Railway si aún no tienes custom).
   - `VITE_MAPBOX_ACCESS_TOKEN` = tu token público de Mapbox.
   - `VITE_STRIPE_PUBLISHABLE_KEY` (si aplica).
   - `CLIENT_URL` = URL pública del frontend.
3. Build/Output: Vite suele detectarse automáticamente (`npm run build`).
4. Deploy. Prueba la SPA y que consuma el backend correctamente.

## 5) Ajustes de seguridad/CSRF/CORS
- Backend: confirma en Railway las vars `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` con tus dominios definitivos (tanto Vercel como custom y el de Railway durante transición).
- Habilita HTTPS en el dominio (Railway con CNAME y Cloudflare/registrador).

## 6) Verificación post-deploy
1. Health del Django API: `GET https://api.tu-dominio.com/` o endpoint de status si existe.
2. Migrations: revisa logs de Railway al deploy; deben completar sin errores.
3. Uploads: prueba una subida a media y confirma que R2 almacene el objeto.
4. Frontend: la SPA debe cargar el mapa y consumir `/api` sin errores CORS/CSRF.

## 7) Entornos y buenas prácticas
- Usa un proyecto Railway por entorno (dev, staging, prod) o servicios aislados.
- En Vercel, usa Environments (Development/Preview/Production) con variables separadas.
- No subas `.env` reales al repo; define secretos en Railway/Vercel.
- Mantén `docs/setup_v2.md` y `env*.example` sincronizados con cambios.

## 8) Resumen rápido (checklist)
- [ ] Railway servicio API apuntando a `services/api`
- [ ] Plugin Postgres y `DATABASE_URL` configurada
- [ ] Start: `python manage.py migrate && gunicorn ...`
- [ ] R2: `USE_S3=True` y `AWS_*` completos
- [ ] Vercel root `apps/web` y `VITE_*` configuradas
- [ ] DNS/CNAME listo y `ALLOWED_HOSTS`/`CSRF_TRUSTED_ORIGINS` actualizados

