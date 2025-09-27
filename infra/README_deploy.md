# SkyTerra — Deploy Guide (12 meses)

Este repo despliega en dos plataformas y usa almacenamiento S3‑compatible para media.

## Servicios elegidos
- Frontend (SPA React): Vercel (root: `frontend`, build: `npm run build`, output: `dist`).
- Backend (Django/DRF): Railway (root: `backend`) con Postgres gestionado.
- Media (tours ZIP, fotos 360, videos puntuales): Cloudflare R2 (o AWS S3) + CDN.

## Variables de entorno (Backend en Railway)
Crea un servicio en Railway apuntando a la carpeta `backend` (Monorepo Root Directory).

1) Base
- `DEBUG` = `False`
- `SECRET_KEY` = (genera una)
- `ALLOWED_HOSTS` = `api.tu-dominio.com,<tu-subdominio>.railway.app`
- `CLIENT_URL` = `https://app.tu-dominio.com` (o dominio Vercel)

2) Postgres (gestionado)
- Añade plugin Postgres en Railway y copia la `DATABASE_URL`.

3) CORS/CSRF
- `CORS_ALLOWED_ORIGINS` = `https://app.tu-dominio.com,https://<vercel>.vercel.app`
- `CSRF_TRUSTED_ORIGINS` = `https://app.tu-dominio.com,https://<vercel>.vercel.app`

4) Media (R2/S3)
- `USE_S3` = `True`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `AWS_STORAGE_BUCKET_NAME`
- `AWS_S3_REGION_NAME` (en R2 usa `auto` o deja por defecto)
- `AWS_S3_ENDPOINT_URL` (R2: `https://<accountid>.r2.cloudflarestorage.com`)
- `AWS_S3_CUSTOM_DOMAIN` (opcional, si sirves por CDN dedicado)
- `MEDIA_UPLOADS_PREFIX` (ej: `media/`)

5) Stripe/Google/Apple según aplique.

Start command (Railway):
```
 gunicorn skyterra_backend.wsgi:application -b 0.0.0.0:8000
```

## Variables de entorno (Frontend en Vercel)
- `VITE_API_BASE_URL` = `https://api.tu-dominio.com/api`
- Mapbox/Stripe/OAuth `VITE_*` según `frontend/env.example`.
Root Directory: `frontend`.

## Flujo de subida de media
- Front pide a backend una URL firmada:
  - `POST /api/media/presign-upload` con `{ key: "properties/{id}/tours/{tourId}/file.ext", content_type }`
  - Respuesta `{ url, key }`
- Front sube directo a R2/S3 usando `PUT` a `url`.
- (Opcional) Guarda metadatos en la API de propiedades.
- Para leer privado: `POST /api/media/presign-read` con `{ key }`.

### CORS del bucket (R2/S3)
Configura CORS del bucket para permitir tu dominio del frontend. Ejemplo S3 JSON:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["https://app.tu-dominio.com", "https://<vercel>.vercel.app"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Dev alineado a Prod
- Levanta Postgres local con `docker-compose.yml` (`db` + `redis` opcional).
- En `backend/.env` usa la `DATABASE_URL` del contenedor.
- Puedes mantener `USE_S3=False` en dev y usar `backend/media/`.

## Dominios
- Backend: `api.tu-dominio.com` → CNAME al dominio de Railway.
- Frontend: `app.tu-dominio.com` → Vercel.
- (Opcional) CDN de Cloudflare delante de ambos.

## Logs y errores
- Ajusta `LOG_LEVEL` en backend.
- Sentry recomendado (FE/BE) cuando salgas a prod.

## Notas
- No almacenes binarios en Postgres; guarda metadatos y claves/URLs.
- Si el uso de video crece, evalúa Cloudflare Stream.
- Mantén `.env` fuera del repo; usa gestores de secretos.

