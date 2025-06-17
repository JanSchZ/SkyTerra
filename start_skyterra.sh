#!/bin/bash

# Script de inicio rápido para SkyTerra en macOS
# Este script inicia el backend (Django) y el frontend (React) en ventanas separadas.

SCRIPT_DIR=$(dirname "$0")
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Iniciar el Backend
echo "Iniciando el backend..."
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: El directorio del backend no se encontró en $BACKEND_DIR"
    echo "Asegurese de que la carpeta 'backend' este en el mismo directorio que 'start_skyterra.sh'."
    exit 1
fi

# Abre nueva ventana de terminal para backend
osascript -e "tell application \"Terminal\" to do script \"cd '$BACKEND_DIR' && source .venv/bin/activate && python manage.py runserver\""

# Esperar 5 segundos para que el backend inicie
sleep 5

# Iniciar el Frontend
echo "Iniciando el frontend..."
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Error: El directorio del frontend no se encontró en $FRONTEND_DIR"
    echo "Asegurese de que la carpeta 'frontend' este en el mismo directorio que 'start_skyterra.sh'."
    exit 1
fi

# Abre nueva ventana de terminal para frontend
osascript -e "tell application \"Terminal\" to do script \"cd '$FRONTEND_DIR' && npm run dev\""

echo "SkyTerra ha sido iniciado. Se abrieron dos ventanas separadas."
