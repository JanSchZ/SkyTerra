#!/bin/bash

# Script de inicio rápido para SkyTerra en macOS
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/services/api"
FRONTEND_DIR="$SCRIPT_DIR/apps/web"
VENVDIR="$BACKEND_DIR/.venv/bin/activate"

err() {
    echo "Error: $1" >&2
    exit 1
}

command -v osascript >/dev/null 2>&1 || err "Este script requiere 'osascript', que debería estar disponible en macOS."
[ -d "$BACKEND_DIR" ] || err "El directorio del backend no se encontró en '$BACKEND_DIR'."
[ -d "$FRONTEND_DIR" ] || err "El directorio del frontend no se encontró en '$FRONTEND_DIR'."
[ -f "$VENVDIR" ] || err "El entorno virtual no se encontró en '$BACKEND_DIR/.venv'. Ejecuta 'python3 -m venv .venv' y luego instala las dependencias."

BACKEND_CMD=$(printf "cd %q && source .venv/bin/activate && export DEBUG=True CLIENT_URL=http://localhost:3000 CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173 CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173 JWT_COOKIE_SECURE=False && python manage.py runserver 0.0.0.0:8000" "$BACKEND_DIR")
FRONTEND_CMD=$(printf "cd %q && npm run dev" "$FRONTEND_DIR")

osascript <<EOF_APPLESCRIPT
tell application "Terminal"
    activate
    do script "$BACKEND_CMD"
    delay 1
    do script "$FRONTEND_CMD"
end tell
EOF_APPLESCRIPT

echo "SkyTerra ha sido iniciado en dos ventanas de Terminal."
echo "Backend: $BACKEND_DIR"
echo "Frontend: $FRONTEND_DIR"
echo "Para detenerlos, cierre las ventanas o ejecute 'killall python' y 'killall node'."
