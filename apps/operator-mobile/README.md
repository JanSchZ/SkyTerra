# SkyTerra Operator App

Aplicación móvil para colaboradores y pilotos de dron. Stack elegido: **Expo + React Native (TypeScript)** para mover más rápido y compartir JS con el portal.

## Requisitos

- Node.js 20+
- Expo CLI (`npm install -g expo-cli` opcional)
- Android Studio / Xcode para emuladores (o Expo Go en dispositivos físicos)

## Estructura

```
apps/operator-mobile
├─ app.json               # Configuración de Expo
├─ babel.config.js        # Babel para React Native
├─ metro.config.js        # Alias y resolvers metro
├─ package.json
├─ tsconfig.json
├─ .env.example           # Variables API
└─ src/
   ├─ App.tsx             # Entry principal
   ├─ navigation/
   │   └─ RootNavigator.tsx
   ├─ screens/
   │   ├─ SignInScreen.tsx
   │   ├─ JobListScreen.tsx
   │   └─ JobDetailScreen.tsx
   ├─ components/
   │   └─ JobCard.tsx
   ├─ context/
   │   └─ AuthContext.tsx
   ├─ services/
   │   ├─ apiClient.ts
   │   └─ operatorJobs.ts
   └─ theme/
       └─ index.ts
```

## Levantar en local

```bash
cd apps/operator-mobile
npm install
cp .env.example .env        # Ajusta API_URL y endpoints
npm run start               # Expo start (web dashboard)
npm run android / ios / web
```

## Próximos pasos

1. **Autenticación**: conectar con `/api/auth/login/` y `profile/` del backend (cookies -> tokens). El `AuthContext` ya espera endpoints.
2. **Notificaciones push**: habilitar Expo Notifications y registrar deviceToken: POST `/api/operator/devices/` (endpoint a implementar).
3. **Ubicación en segundo plano**: usar Expo Location con geofencing; requiere endpoints `/api/operator/locations/`.
4. **Gestión de trabajos**: completar endpoints en `services/operatorJobs.ts` (`/api/operator/jobs/`) para aceptar, iniciar, completar y subir media (usa presign S3 `POST /api/media/presign-upload`).

Los endpoints necesarios se documentan en `docs/operator_api.md` (pendiente de expandir). Backlog coordinado con `services/api`.
