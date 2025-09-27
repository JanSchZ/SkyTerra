# SkyTerra Web App

React + Vite SPA served via Vercel.

## Local setup
```bash
cd apps/web
npm install
npm run dev
```

Configure environment variables via `.env` (copy `env.example`). Minimum:
- `VITE_API_BASE_URL` (only for non-local envs; in dev Vite proxy handles `/api`).
- `VITE_MAPBOX_ACCESS_TOKEN`
- `VITE_STRIPE_PUBLISHABLE_KEY`

## Build & deploy
- Production build: `npm run build` → outputs to `dist/`.
- Vercel project root: `apps/web` (build command `npm run build`, output `dist`).

## Media uploads
Use the backend presign endpoints to upload tours directly to R2/S3. The upload dialog expects the backend to return `{ url, key }` and PUTs the file with the provided `content_type`.

