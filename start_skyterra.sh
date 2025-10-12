#!/bin/bash

# Script de inicio rápido para SkyTerra (macOS/Linux)
# Inicia backend (Django), frontend (Vite) y la app de operadores (Expo) en segundo plano.

# Ruta base del proyecto (script directory)
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Definir las rutas completas del backend y frontend
BACKEND_DIR="$BASE_DIR/services/api"
FRONTEND_DIR="$BASE_DIR/apps/web"
OPERATOR_DIR="$BASE_DIR/apps/operator-mobile"

BACKEND_PORT=8000
FRONTEND_PORT=3000
EXPO_PORT=8081

echo "DEBUG: Directorio actual de trabajo (PWD): $PWD"
echo "DEBUG: BASE_DIR: $BASE_DIR"
echo "DEBUG: BACKEND_DIR: $BACKEND_DIR"
echo "DEBUG: FRONTEND_DIR: $FRONTEND_DIR"

# Listar el contenido del directorio raíz para verificar la existencia de 'frontend' y 'backend'
echo "Contenido del directorio base ($BASE_DIR):"
ls -l "$BASE_DIR"

# Terminar procesos existentes en los puertos 8000 y 3000
echo "Terminando procesos existentes en los puertos $BACKEND_PORT (backend), $FRONTEND_PORT (frontend) y $EXPO_PORT (Expo)..."
lsof -i :$BACKEND_PORT -t | xargs kill > /dev/null 2>&1 || true
lsof -i :$FRONTEND_PORT -t | xargs kill > /dev/null 2>&1 || true
lsof -i :$EXPO_PORT -t | xargs kill > /dev/null 2>&1 || true
# Detener procesos residuales comunes
pkill -f "expo" >/dev/null 2>&1 || true
sleep 2 # Dar un momento para que los procesos terminen

# Iniciar el Backend en segundo plano dentro de un sub-shell
echo "Iniciando el backend en segundo plano..."
(
    cd "$BACKEND_DIR" || { echo "Error: No se pudo cambiar al directorio del backend: $BACKEND_DIR"; exit 1; }
    source .venv/bin/activate > /dev/null 2>&1 # Activar el entorno virtual de forma silenciosa
    python manage.py runserver 0.0.0.0:$BACKEND_PORT > backend.log 2>&1
) &
BACKEND_PID=$! # Obtener el PID del proceso del sub-shell del backend
echo "Backend iniciado con PID: $BACKEND_PID. La salida se guarda en backend.log"

# Esperar 5 segundos para que el backend inicie
sleep 5

# Iniciar el Frontend en segundo plano dentro de un sub-shell
echo "Iniciando el frontend en segundo plano..."
(
    cd "$FRONTEND_DIR" || { echo "Error: No se pudo cambiar al directorio del frontend: $FRONTEND_DIR"; exit 1; }
    npm run dev -- --port $FRONTEND_PORT > frontend.log 2>&1
) &
FRONTEND_PID=$! # Obtener el PID del proceso del sub-shell del frontend
echo "Frontend iniciado con PID: $FRONTEND_PID. La salida se guarda en frontend.log"

# Iniciar la app de operadores si existe
EXPO_PID=""
if [ -d "$OPERATOR_DIR" ]; then
    echo "Iniciando la app de operadores (Expo)..."
    (
        cd "$OPERATOR_DIR" || { echo "Error: No se pudo cambiar al directorio de operadores: $OPERATOR_DIR"; exit 1; }
        npx expo start > operator.log 2>&1
    ) &
    EXPO_PID=$!
    echo "App de operadores iniciada con PID: $EXPO_PID. La salida se guarda en operator.log"
    sleep 5
else
    echo "[INFO] No se encontró $OPERATOR_DIR. Omite inicio de app de operadores."
fi

# Esperar a que el frontend levante
sleep 5

# Abrir la aplicación en el navegador
echo "Abriendo la aplicación en tu navegador..."
if command -v open >/dev/null 2>&1; then
    open http://localhost:$FRONTEND_PORT >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:$FRONTEND_PORT >/dev/null 2>&1 || true
else
    echo "Visita http://localhost:$FRONTEND_PORT en tu navegador."
fi

echo "SkyTerra ha sido iniciado. Se ejecutará en segundo plano."
if [ -n "$EXPO_PID" ]; then
    echo "Procesos activos: Backend ($BACKEND_PID), Frontend ($FRONTEND_PID), Expo ($EXPO_PID)"
    echo "Para detenerlos, ejecuta: kill $BACKEND_PID $FRONTEND_PID $EXPO_PID"
else
    echo "Procesos activos: Backend ($BACKEND_PID), Frontend ($FRONTEND_PID)"
    echo "Para detenerlos, ejecuta: kill $BACKEND_PID $FRONTEND_PID"
fi
echo "Opcional: killall python && killall node && killall expo" >/dev/null 2>&1 || true
