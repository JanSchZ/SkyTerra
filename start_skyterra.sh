#!/bin/bash

# Script de inicio rápido para SkyTerra en macOS
# Este script inicia el backend (Django) y el frontend (React) en segundo plano.

# Ruta base del proyecto (script directory)
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Definir las rutas completas del backend y frontend
BACKEND_DIR="$BASE_DIR/services/api"
FRONTEND_DIR="$BASE_DIR/apps/web"

echo "DEBUG: Directorio actual de trabajo (PWD): $PWD"
echo "DEBUG: BASE_DIR: $BASE_DIR"
echo "DEBUG: BACKEND_DIR: $BACKEND_DIR"
echo "DEBUG: FRONTEND_DIR: $FRONTEND_DIR"

# Listar el contenido del directorio raíz para verificar la existencia de 'frontend' y 'backend'
echo "Contenido del directorio base ($BASE_DIR):"
ls -l "$BASE_DIR"

# Terminar procesos existentes en los puertos 8000 y 3000
echo "Terminando procesos existentes en los puertos 8000 y 3000..."
lsof -i :8000 -t | xargs kill > /dev/null 2>&1 || true
lsof -i :3000 -t | xargs kill > /dev/null 2>&1 || true
sleep 2 # Dar un momento para que los procesos terminen

# Iniciar el Backend en segundo plano dentro de un sub-shell
echo "Iniciando el backend en segundo plano..."
(
    cd "$BACKEND_DIR" || { echo "Error: No se pudo cambiar al directorio del backend: $BACKEND_DIR"; exit 1; }
    source .venv/bin/activate > /dev/null 2>&1 # Activar el entorno virtual de forma silenciosa
    python manage.py runserver > backend.log 2>&1
) &
BACKEND_PID=$! # Obtener el PID del proceso del sub-shell del backend
echo "Backend iniciado con PID: $BACKEND_PID. La salida se guarda en backend.log"

# Esperar 5 segundos para que el backend inicie
sleep 5

# Iniciar el Frontend en segundo plano dentro de un sub-shell
echo "Iniciando el frontend en segundo plano..."
(
    cd "$FRONTEND_DIR" || { echo "Error: No se pudo cambiar al directorio del frontend: $FRONTEND_DIR"; exit 1; }
    npm run dev > frontend.log 2>&1
) &
FRONTEND_PID=$! # Obtener el PID del proceso del sub-shell del frontend
echo "Frontend iniciado con PID: $FRONTEND_PID. La salida se guarda en frontend.log"

# Esperar 10 segundos para que el frontend inicie completamente
sleep 10

# Abrir la aplicación en el navegador
echo "Abriendo la aplicación en tu navegador..."
open http://localhost:3000

echo "SkyTerra ha sido iniciado. Se ejecutará en segundo plano."
echo "Para detener los procesos, ejecuta: kill $BACKEND_PID $FRONTEND_PID"
echo "Alternativamente, puedes usar: killall python && killall node"
