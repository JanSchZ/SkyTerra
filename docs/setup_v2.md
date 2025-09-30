# Inicializacion SkyTerra V1

Esta guia explica como levantar el proyecto completo en un nuevo equipo (backend, web, operator mobile, Android nativo).

## 0. Requisitos
- Python 3.10+ (recomendado 3.13)
- Node.js 20 (npm incluido)
- PostgreSQL 15+ (local, Docker o gestionado)
- Git
- Mapbox account (tokens de downloads y access)
- Opcional: Docker Desktop para levantar Postgres/Redis localmente
- Opcional: credenciales S3/R2 para almacenamiento de media

### Archivos `.env`
- `./.env` (raíz): variables compartidas para backend/frontend. Crea con `cp env.example .env`.
- `services/api/.env`: secretos exclusivos de Django (Stripe secret, DB, S3, SMTP). Crea con `cp services/api/.env.example services/api/.env`.
- `apps/web/.env`: variables expuestas al navegador (Mapbox, API base, OAuth públicos). Crea con `cp env.example .env` dentro de `apps/web`.
- `apps/operator-mobile/.env`: URL del backend y tokens móviles. Crea con `cp .env.example .env` dentro de `apps/operator-mobile`.

> Recuerda: los archivos `.env` nunca deben versionarse. Usa los `.env.example` como plantilla.

## 1. Clonar
```bash
git clone <repo>
cd SkyTerra
```

## 2. Backend (services/api)
```bash
cd services/api
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```
Editar `services/api/.env`:
- `SECRET_KEY`
- `DATABASE_URL` (postgres://...)
- `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
- Para media en R2/S3: `USE_S3=True`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_ENDPOINT_URL`
- Stripe, OAuth, etc. segun entorno

Aplicar migraciones y crear superusuario opcional:
```bash
python manage.py migrate
python manage.py createsuperuser  # opcional
```
Levantar dev:
```bash
python manage.py runserver 0.0.0.0:8000
```

## 3. Web principal (apps/web)
```bash
cd ../apps/web
npm install
cp env.example .env
```
`apps/web/.env` debe incluir:
- `VITE_API_BASE_URL` (ej: http://localhost:8000/api)
- `VITE_MAPBOX_ACCESS_TOKEN`
- Claves Stripe/OAuth si aplica

Iniciar Vite:
```bash
npm run dev
```

## 4. App Operadores (apps/operator-mobile)
```bash
cd ../operator-mobile
npm install
cp .env.example .env
```
`apps/operator-mobile/.env`:
- `API_URL` apuntando al backend (ej: https://api-dev.skyterra.cl o http://localhost:8000)

Expo start:
```bash
npm run start
```

## 5. App Android oficial (apps/android)
1. Definir tokens Mapbox (servicio y runtime). Agregar en `~/.gradle/gradle.properties` o copiar `apps/android/gradle.properties.example` a `apps/android/gradle.properties`:
   ```
   MAPBOX_DOWNLOADS_TOKEN=pk.your-service-token
   MAPBOX_ACCESS_TOKEN=pk.your-public-token
   MAPBOX_STYLE_URI=mapbox://styles/skyterra/<style-id>
   ```
   - `MAPBOX_DOWNLOADS_TOKEN` se usa para descargar dependencias.
   - `MAPBOX_ACCESS_TOKEN` y `MAPBOX_STYLE_URI` deben coincidir con la experiencia web.
2. Compilar debug:
   ```bash
   cd ../android
   ./gradlew assembleDebug
   ```
3. Abrir `apps/android` en Android Studio (`File > Open`) y correr en emulador/dispositivo.

## 6. Postgres local opcional
Levantar Postgres y Redis con Docker:
```bash
docker compose up -d db redis
```
Ajustar `DATABASE_URL` y `REDIS_URL` en `services/api/.env`.

## 7. Media en R2 o S3
- Crear bucket privado.
- Configurar CORS para permitir dominios de web/frontend.
- En `services/api/.env` activar `USE_S3=True` y definir todas las variables AWS/R2.
- Uso: `POST /api/media/presign-upload` y `POST /api/media/presign-read` ya estan listos.

## 8. Despliegue recomendado
- Backend (`services/api`) -> Railway (gunicorn) + Postgres gestionado + Redis opcional.
- Web (`apps/web`) -> Vercel.
- Operadores (`apps/operator-mobile`) -> Expo EAS Build + OTA.
- Android (`apps/android`) -> EAS Build o CI propio firmando AAB.
- Media -> Cloudflare R2 (o S3) + CDN.

## 9. Checklist post-clone
1. `git status` limpio.
2. Instalar dependencias (pip/npm).
3. Configurar `.env` y tokens Mapbox/S3.
4. `python manage.py migrate`.
5. Ejecutar backend, frontend, Expo y Android segun seccion.

## 10. FAQ rapida
- **Falla Mapbox downloads**: revisa `MAPBOX_DOWNLOADS_TOKEN` en gradle.properties y limpia `~/.gradle/caches` si es necesario.
- **CORS 403**: asegura que `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS` incluyan tu dominio dev/prod.
- **Expo no llega a la API**: verifica `API_URL` en `apps/operator-mobile/.env` y que el backend permita CORS/Cookies.
- **Uploads fallan**: confirma `USE_S3=True`, credenciales correctas y CORS del bucket.

## 11. Variables clave resumen

| Servicio | Archivo | Variables |
|----------|---------|-----------|
| Backend | services/api/.env | SECRET_KEY, DATABASE_URL, USE_S3, AWS_*, CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS, CLIENT_URL |
| Web | apps/web/.env | VITE_API_BASE_URL, VITE_MAPBOX_ACCESS_TOKEN, VITE_STRIPE_PUBLISHABLE_KEY |
| Operadores | apps/operator-mobile/.env | API_URL |
| Android | apps/android/gradle.properties | MAPBOX_DOWNLOADS_TOKEN, MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_URI |
