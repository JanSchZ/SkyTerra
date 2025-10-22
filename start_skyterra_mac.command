#!/bin/bash

# Script de inicio rápido para SkyTerra en macOS
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/services/api"
FRONTEND_DIR="$SCRIPT_DIR/apps/web"
OPERATOR_DIR="$SCRIPT_DIR/apps/operator-mobile"
VENVDIR="$BACKEND_DIR/.venv/bin/activate"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

err() {
    echo "Error: $1" >&2
    exit 1
}

command -v osascript >/dev/null 2>&1 || err "Este script requiere 'osascript', que debería estar disponible en macOS."
[ -d "$BACKEND_DIR" ] || err "El directorio del backend no se encontró en '$BACKEND_DIR'."
[ -d "$FRONTEND_DIR" ] || err "El directorio del frontend no se encontró en '$FRONTEND_DIR'."
[ -f "$VENVDIR" ] || err "El entorno virtual no se encontró en '$BACKEND_DIR/.venv'. Ejecuta 'python3 -m venv .venv' y luego instala las dependencias."

CLIENT_ORIGINS=$(printf "http://localhost:%s,http://127.0.0.1:%s" "$FRONTEND_PORT" "$FRONTEND_PORT")
BACKEND_CMD=$(printf "cd %q && source .venv/bin/activate && export DEBUG=True CLIENT_URL=%s CORS_ALLOWED_ORIGINS=%s CSRF_TRUSTED_ORIGINS=%s JWT_COOKIE_SECURE=False ALLOWED_HOSTS=localhost,127.0.0.1,192.168.3.39 && python manage.py runserver 0.0.0.0:8000" "$BACKEND_DIR" "$CLIENT_ORIGINS" "$CLIENT_ORIGINS" "$CLIENT_ORIGINS")
FRONTEND_CMD=$(printf "cd %q && npm run dev -- --port %s" "$FRONTEND_DIR" "$FRONTEND_PORT")
if [ -d "$OPERATOR_DIR" ]; then
    OPERATOR_CMD=$(printf "cd %q && APP_ENV=development npx expo start" "$OPERATOR_DIR")
else
    OPERATOR_CMD=""
fi

osascript <<EOF_APPLESCRIPT
tell application "Terminal"
    activate
    do script "$BACKEND_CMD"
    delay 1
    do script "$FRONTEND_CMD"
end tell
EOF_APPLESCRIPT

if [[ -n "$OPERATOR_CMD" ]]; then
osascript <<EOF_APPLESCRIPT
tell application "Terminal"
    activate
    do script "$OPERATOR_CMD"
end tell
EOF_APPLESCRIPT
fi

if [ -n "$OPERATOR_CMD" ]; then
    echo "SkyTerra ha sido iniciado en tres ventanas de Terminal (backend, frontend, operadores)."
else
    echo "SkyTerra ha sido iniciado en dos ventanas de Terminal (backend y frontend)."
fi
echo "Backend: $BACKEND_DIR"
echo "Frontend: $FRONTEND_DIR"
echo "Puerto frontend: $FRONTEND_PORT"
if [ -d "$OPERATOR_DIR" ]; then
    echo "App Operadores: $OPERATOR_DIR"
fi
echo "Para detenerlos, cierre las ventanas o ejecute 'killall python' 'killall node' y 'killall expo'."
echo "Abriendo frontend en http://localhost:$FRONTEND_PORT …"
open "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1 || true
