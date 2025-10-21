#!/bin/bash

# Build script para generar APK de producción de la app de operadores (macOS/Linux).
# Usa apps/operator-mobile/.env.production para apuntar al backend en Railway.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/apps/operator-mobile"
ENV_FILE=".env.production"

err() {
  echo "Error: $1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || err "Node.js no está instalado. Instálalo desde https://nodejs.org/."
command -v npx >/dev/null 2>&1 || err "npx no está disponible. Asegúrate de instalar Node.js 18 o superior."

[ -d "$APP_DIR" ] || err "No se encontró el directorio de la app de operadores en '$APP_DIR'."

if [ ! -f "$APP_DIR/$ENV_FILE" ]; then
  err "No existe '$ENV_FILE' en apps/operator-mobile. Copia .env.production.example o crea el archivo."
fi

DEFAULT_ANDROID_HOME="$HOME/Library/Android/sdk"
if [ -z "${ANDROID_HOME:-}" ] && [ -d "$DEFAULT_ANDROID_HOME" ]; then
  export ANDROID_HOME="$DEFAULT_ANDROID_HOME"
fi
[ -d "${ANDROID_HOME:-}" ] || err "No encontramos el SDK de Android. Instálalo y asegúrate de que ANDROID_HOME apunte a él."

SDK_PATH=$(cd "$ANDROID_HOME" && pwd)

echo "📦 Preparando dependencias en $APP_DIR ..."
cd "$APP_DIR"
npm install

echo "🔐 Usando variables de $ENV_FILE (API_URL=$(grep '^API_URL' "$ENV_FILE" | cut -d= -f2-))."

export APP_ENV=production

echo "🧹 Limpiando proyecto nativo..."
npx expo prebuild --clean --platform android --no-install

echo "🛠  Escribiendo android/local.properties con sdk.dir=$SDK_PATH"
cat > android/local.properties <<EOF
sdk.dir=$SDK_PATH
EOF

echo "🏗  Ejecutando Gradle assembleRelease..."
pushd android >/dev/null
./gradlew clean assembleRelease
popd >/dev/null

unset APP_ENV

APK_PATH="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"
APK_DIR="$(dirname "$APK_PATH")"
echo ""
if [ -f "$APK_PATH" ]; then
  echo "✅ Build finalizado: $APK_PATH"
  echo ""
  echo "📂 Contenido de la carpeta de salida:"
  ls -lh "$APK_DIR"
  echo ""
  echo "👀 Abriendo la carpeta en Finder..."
  open "$APK_DIR" >/dev/null 2>&1 || echo "No se pudo abrir Finder automáticamente. Navega manualmente a: $APK_DIR"
else
  echo "⚠️  Build finalizado pero no encontramos el APK en $APK_PATH. Revisa los logs."
fi
