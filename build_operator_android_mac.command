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

echo "📦 Preparando dependencias en $APP_DIR ..."
cd "$APP_DIR"
npm install

echo "🔐 Usando variables de $ENV_FILE (API_URL=$(grep '^API_URL' "$ENV_FILE" | cut -d= -f2-))."
echo "📱 Asegúrate de tener un dispositivo/emulador Android conectado y ANDROID_HOME configurado."

echo "🚀 Compilando APK release..."
DOTENV_CONFIG_PATH="$ENV_FILE" npx expo run:android --variant release

echo ""
echo "✅ Build finalizado. El APK se encuentra normalmente en:"
echo "   apps/operator-mobile/android/app/build/outputs/apk/release/app-release.apk"
echo "   Si usas tu propio keystore, asegúrate de actualizar android/app/build.gradle."
