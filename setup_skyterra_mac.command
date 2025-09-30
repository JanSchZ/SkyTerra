#!/bin/bash

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/services/api"
FRONTEND_DIR="$PROJECT_ROOT/apps/web"
ENV_FILE="$PROJECT_ROOT/.env"
VENV_DIR="$BACKEND_DIR/.venv"
VENV_PY="$VENV_DIR/bin/python"
MANUAL_ACTIONS=()
FAILED_STEPS=0

log() {
    printf '%s\n' "$1"
}

add_manual() {
    MANUAL_ACTIONS+=("$1")
}

require_command() {
    local binary="$1"
    local install_hint="$2"
    if ! command -v "$binary" >/dev/null 2>&1; then
        log "[FALTA] No se encontro '$binary'."
        add_manual "Instala '$binary'. Sugerencia: $install_hint"
        FAILED_STEPS=$((FAILED_STEPS+1))
        return 1
    fi
    return 0
}

version_ge() {
    local v1="$1"
    local v2="$2"
    IFS='.' read -r -a ver1 <<<"$v1"
    IFS='.' read -r -a ver2 <<<"$v2"
    for ((i=${#ver1[@]}; i<3; i++)); do ver1[i]=0; done
    for ((i=${#ver2[@]}; i<3; i++)); do ver2[i]=0; done
    for ((i=0; i<3; i++)); do
        if ((10#${ver1[i]} > 10#${ver2[i]})); then
            return 0
        elif ((10#${ver1[i]} < 10#${ver2[i]})); then
            return 1
        fi
    done
    return 0
}

run_step() {
    local description="$1"
    shift
    log "\n=> $description"
    if "$@"; then
        log "[OK] $description"
        return 0
    else
        local status=$?
        log "[ERROR] $description (codigo $status)"
        add_manual "$description. Ejecuta manualmente: $*"
        FAILED_STEPS=$((FAILED_STEPS+1))
        return $status
    fi
}

log "SkyTerra - Setup automatico para macOS"
log "Proyecto: $PROJECT_ROOT"

require_command python3 "Descarga desde https://www.python.org/downloads/"
require_command node "Usa https://nodejs.org/ (version LTS recomendada)"
require_command npm "npm viene con Node.js; reinstala Node si falta"

if command -v python3 >/dev/null 2>&1; then
    PY_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:3])))')
    if ! version_ge "$PY_VERSION" "3.9"; then
        log "[WARN] Python 3.9+ requerido. Detectado: $PY_VERSION"
        add_manual "Actualiza Python a 3.9 o superior (actual: $PY_VERSION)"
    fi
fi

if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v 2>/dev/null | sed 's/^v//')
    if [[ -n "$NODE_VERSION" ]] && ! version_ge "$NODE_VERSION" "18.0.0"; then
        log "[WARN] Node 18+ requerido. Detectado: $NODE_VERSION"
        add_manual "Actualiza Node a 18 o superior (actual: $NODE_VERSION)"
    fi
fi

if [[ ! -d "$BACKEND_DIR" ]]; then
    log "[ERROR] No se encontro el backend en $BACKEND_DIR"
    add_manual "Verifica que el backend exista en services/api"
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
    log "[ERROR] No se encontro el frontend en $FRONTEND_DIR"
    add_manual "Verifica que el frontend exista en apps/web"
fi

if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "$PROJECT_ROOT/env.example" ]]; then
        cp "$PROJECT_ROOT/env.example" "$ENV_FILE"
        log "[OK] Se creo .env a partir de env.example"
        add_manual "Revisa y actualiza $ENV_FILE con claves reales (Railway DATABASE_URL, Cloudflare R2 AWS_*, Stripe, Mapbox)"
    else
        log "[ERROR] No se encontro env.example para generar .env"
        add_manual "Crea un archivo .env en la raiz siguiendo la documentacion"
    fi
else
    log "[OK] Se detecto $ENV_FILE"
fi

DB_MODE="sqlite"
DB_PLACEHOLDER="postgres://user:password@host:5432/dbname"
if [[ -f "$ENV_FILE" ]]; then
    DB_LINE=$(grep '^DATABASE_URL=' "$ENV_FILE" | tail -n1 || true)
    DB_VALUE="${DB_LINE#DATABASE_URL=}"
    if [[ -n "$DB_VALUE" && "$DB_VALUE" != "$DB_PLACEHOLDER" ]]; then
        DB_MODE="custom"
        log "[INFO] DATABASE_URL personalizado detectado. Se usara para migraciones."
    else
        if [[ "$DB_VALUE" == "$DB_PLACEHOLDER" ]]; then
            log "[WARN] DATABASE_URL usa un placeholder. Se usara SQLite local."
            add_manual "Copia la DATABASE_URL desde Railway en $ENV_FILE o comenta la linea para usar SQLite"
        else
            log "[INFO] No se configuro DATABASE_URL. Se usara SQLite local."
        fi
    fi
fi

if [[ -d "$BACKEND_DIR" ]]; then
    if [[ ! -d "$VENV_DIR" ]]; then
        run_step "Crear entorno virtual" python3 -m venv "$VENV_DIR"
    else
        log "[OK] Entorno virtual existente encontrado en $VENV_DIR"
    fi

    if [[ -x "$VENV_PY" ]]; then
        run_step "Actualizar pip" "$VENV_PY" -m pip install --upgrade pip
        run_step "Instalar dependencias backend" "$VENV_PY" -m pip install -r "$BACKEND_DIR/requirements.txt"

        MIGRATE_CMD=("$VENV_PY" "$BACKEND_DIR/manage.py" migrate --noinput)
        if [[ "$DB_MODE" == "sqlite" ]]; then
            run_step "Aplicar migraciones Django" env DATABASE_URL= "${MIGRATE_CMD[@]}"
        else
            run_step "Aplicar migraciones Django" "${MIGRATE_CMD[@]}"
        fi
    else
        log "[ERROR] No se encontro el interprete de la venv en $VENV_PY"
        add_manual "Revisa la creacion de la venv en $VENV_DIR"
    fi
fi

if [[ -d "$FRONTEND_DIR" ]]; then
    pushd "$FRONTEND_DIR" >/dev/null 2>&1 || {
        log "[ERROR] No se pudo acceder a $FRONTEND_DIR"
        add_manual "Verifica permisos en $FRONTEND_DIR"
    }
    if [[ "$PWD" == "$FRONTEND_DIR" ]]; then
        run_step "Instalar dependencias frontend" npm install
    fi
    popd >/dev/null 2>&1 || true
fi

log "\n=== Resumen ==="
if [[ ${#MANUAL_ACTIONS[@]} -eq 0 && $FAILED_STEPS -eq 0 ]]; then
    log "Setup completado sin errores."
else
    log "Se requieren acciones manuales:"
    for action in "${MANUAL_ACTIONS[@]}"; do
        log " - $action"
    done
    log "Revisa los mensajes anteriores para mas detalle."
fi

log "Listo. Puedes usar ./start_skyterra_mac.command o ./start_skyterra.sh para iniciar los servicios."
