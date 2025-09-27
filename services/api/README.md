# SkyTerra API Service

## Overview
This service exposes the SkyTerra REST API (Django 4 + DRF) and handles authentication, property management, payments, AI search, and media orchestration.

## Local setup
```bash
cd services/api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Optional: bring up Postgres + Redis via `docker compose up db redis`.

## Environment variables
See `.env.example` for a complete list. Key settings:
- `DATABASE_URL` → managed Postgres connection (Railway/Neon/DO).
- `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` → frontend domains (Vercel + custom domain).
- `USE_S3=True` with the `AWS_*` variables to store media in Cloudflare R2 / AWS S3.
- `MEDIA_UPLOADS_PREFIX` → base key prefix for presigned uploads.

## Deployment targets
- **Railway:** set Monorepo root to `services/api`, build with Nixpacks or the local `Dockerfile`.
- **Docker Compose (prod):** see `../../docker-compose.prod.yml` (Nginx + Gunicorn).

## Presigned media endpoints
- `POST /api/media/presign-upload` → returns `PUT` URL for S3-compatible storage.
- `POST /api/media/presign-read` → returns temporary `GET` URL.

Ensure the bucket CORS policy allows your frontend origins for `GET`, `PUT`, `HEAD`.

