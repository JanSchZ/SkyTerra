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

## Google Maps en Android (clave requerida)

Para que el mapa funcione en Android (React Native Maps con Google Play Services), necesitas una API key de Google Maps:

- Activa en Google Cloud: “Maps SDK for Android”. Opcional: Places/Directions/Geocoding si las usas.
- Restricción recomendada de la key: tipo "Android apps", paquete `com.skyterra.operators` y SHA‑1 (usa `./gradlew signingReport`).

Cómo pasar la clave al build (no la subas al repo):

- Opción 1 (recomendada): crea `apps/operator-mobile/android/gradle.properties.local` con
  ```
  GOOGLE_MAPS_API_KEY=AIza...
  ```
- Opción 2 (variable de entorno puntual):
  ```bash
  cd apps/operator-mobile/android
  GOOGLE_MAPS_API_KEY=AIza... ./gradlew assembleDebug
  # para release: ./gradlew assembleRelease
  ```
- Opción 3 (global en tu máquina, sin commitear): añade en `~/.gradle/gradle.properties`:
  ```
  GOOGLE_MAPS_API_KEY=AIza...
  ```
- Opción 4 (EAS/CI): crea un secreto `GOOGLE_MAPS_API_KEY` y compila normalmente.

El proyecto ya está configurado con un placeholder en el manifest (`com.google.android.geo.API_KEY`). No necesitas tocar código: si la variable existe al compilar, la app no crashea y el mapa carga.

Si te falta la clave, el build se detendrá con el mensaje:  
`Falta la API key de Google Maps. Crea apps/operator-mobile/android/gradle.properties.local con GOOGLE_MAPS_API_KEY=tu_clave (pídesela a Jan).`

Verifica en Android Studio (Merged Manifest) que aparezca la línea `<meta-data android:name="com.google.android.geo.API_KEY" ...>` con tu valor.

## Builds nativas (APK/AAB) con EAS

1. **Preparar configuración**
   - Ajusta `API_URL` en `.env` para desarrollo local si necesitas un backend distinto al productivo. Si no defines nada, la app usará por defecto `https://skyterra.cl`.
   - Para builds cloud define `API_URL` desde [expo.dev](https://expo.dev/) → tu proyecto → **Build → Environment variables** (perfiles `preview`/`production`).
   - Revisa `app.json` y `app.config.ts` para mantener `version`, `android.package` y `versionCode` actualizados antes de cada release.
2. **Instalar dependencias**
   ```bash
   cd apps/operator-mobile
   npm install
   ```
3. **Autenticarse en Expo/EAS**
   ```bash
   npx expo login
   npx eas login
   ```
4. **Generar APK de prueba**
   ```bash
   npx eas build -p android --profile preview
   ```
   - Acepta crear/reutilizar el keystore cuando te lo pida (Expo lo almacena por ti; descarga el backup).
   - Al finalizar, descarga el APK desde el enlace que imprime la CLI y distribúyelo manualmente (`adb install` o copia al dispositivo).
5. **Build para Play Store**
   ```bash
   npx eas build -p android --profile production
   ```
   Esto produce un `.aab` listo para subir a Google Play. Recuerda incrementar `versionCode` y `version` antes de cada subida.

## Próximos pasos

1. **Autenticación**: conectar con `/api/auth/login/` y `profile/` del backend (cookies -> tokens). El `AuthContext` ya espera endpoints.
2. **Notificaciones push**: habilitar Expo Notifications y registrar deviceToken: POST `/api/operator/devices/` (endpoint a implementar).
3. **Ubicación en segundo plano**: usar Expo Location con geofencing; requiere endpoints `/api/operator/locations/`.
4. **Gestión de trabajos**: completar endpoints en `services/operatorJobs.ts` (`/api/operator/jobs/`) para aceptar, iniciar, completar y subir media (usa presign S3 `POST /api/media/presign-upload`).

Los endpoints necesarios se documentan en `docs/operator_api.md` (pendiente de expandir). Backlog coordinado con `services/api`.
