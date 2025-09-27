# SkyTerra Android App

Aplicacion nativa oficial para clientes SkyTerra construida con Kotlin + Jetpack Compose y Mapbox.

## Caracteristicas iniciales
- Arquitectura Compose single-activity (`MainActivity`) con `SkyTerraRoot`.
- Home con mapa 3D Mapbox (Compose) y bottom sheet de propiedades.
- Top bar con busqueda (Sam) y menu para navegar hacia guardados/dashboard/suscripcion/cuenta.
- Datos mock (`Property.mockProperties`) mientras se conecta al backend (`services/api`).

## Ejecutar

1. Instala Android Studio y el SDK (API 35).
2. Desde la raiz del proyecto:
   ```bash
   cd apps/android
   ./gradlew assembleDebug
   ```
3. Abre el modulo en Android Studio (`File > Open > apps/android`).

### Configurar Mapbox

1. Registra un token de descargas (`MAPBOX_DOWNLOADS_TOKEN`) en tu cuenta Mapbox y guardalo en `~/.gradle/gradle.properties` o `apps/android/gradle.properties`.
2. Obtén un access token publico (`MAPBOX_ACCESS_TOKEN`) y la URI de estilo (puedes reutilizar la del portal web).
3. En `apps/android/gradle.properties` o `local.properties` define:
   ```
   MAPBOX_DOWNLOADS_TOKEN=pk.your-service-token
   MAPBOX_ACCESS_TOKEN=pk.your-public-token
   MAPBOX_STYLE_URI=mapbox://styles/skyterra/your-style
   ```
4. Sincroniza Gradle (`./gradlew clean assembleDebug`).

## Proximos pasos
- Afinar estilo Mapbox para que coincida con el portal (tiles 3D, terreno, labels).
- Consumir API SkyTerra para propiedades segun el viewport (`/api/properties/`).
- Implementar autenticacion (JWT) y estado global (ViewModel + Flow).
- Completar navegacion a guardados, dashboard, suscripcion y cuenta.
- Sincronizar con la app de operadores para compartir componentes y estilos.
