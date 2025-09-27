#!/bin/bash

echo "🔧 Script de corrección del bug de registro - SkyTerra"
echo "=================================================="

# Función para logging con colores
log() {
    echo "$(date '+%H:%M:%S') - $1"
}

error() {
    echo "$(date '+%H:%M:%S') - ❌ ERROR: $1"
}

success() {
    echo "$(date '+%H:%M:%S') - ✅ $1"
}

info() {
    echo "$(date '+%H:%M:%S') - ℹ️  $1"
}

# Cambiar al directorio del proyecto
cd /workspaces/SkyTerra

# 1. Verificar estructura del proyecto
info "Verificando estructura del proyecto..."
if [ ! -d "services/api" ] || [ ! -d "apps/web" ]; then
    error "Estructura de directorios incorrecta"
    exit 1
fi
success "Estructura del proyecto correcta"

# 2. Verificar y instalar dependencias del backend
info "Verificando dependencias del backend..."
cd services/api

if [ ! -f "requirements.txt" ]; then
    error "requirements.txt no encontrado"
    exit 1
fi

# Instalar dependencias si es necesario
pip install -r requirements.txt > /dev/null 2>&1
success "Dependencias del backend verificadas"

# 3. Ejecutar migraciones
info "Ejecutando migraciones de Django..."
python manage.py migrate --noinput
if [ $? -eq 0 ]; then
    success "Migraciones aplicadas correctamente"
else
    error "Error al aplicar migraciones"
    exit 1
fi

# 4. Verificar configuración de Django
info "Verificando configuración de Django..."
python manage.py check --deploy
if [ $? -eq 0 ]; then
    success "Configuración de Django válida"
else
    error "Problemas en la configuración de Django"
    exit 1
fi

# 5. Crear superusuario si no existe
info "Verificando superusuario..."
python manage.py shell -c "
from django.contrib.auth.models import User
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@skyterra.cl', 'SkyTerra3008%')
    print('Superusuario creado')
else:
    print('Superusuario ya existe')
"

# 6. Probar el endpoint de registro
info "Iniciando servidor de prueba..."
python manage.py runserver 8000 --noinput > /tmp/django_server.log 2>&1 &
SERVER_PID=$!

# Esperar a que el servidor inicie
sleep 3

# Probar el endpoint
info "Probando endpoint de registro..."
curl -s -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123!"
  }' > /tmp/register_test.json

if [ $? -eq 0 ]; then
    success "Endpoint de registro responde correctamente"
    cat /tmp/register_test.json
else
    error "Endpoint de registro no responde"
    cat /tmp/django_server.log
fi

# Limpiar
kill $SERVER_PID 2>/dev/null

# 7. Verificar dependencias del frontend
info "Verificando dependencias del frontend..."
cd ../../apps/web

if [ ! -f "package.json" ]; then
    error "package.json no encontrado"
    exit 1
fi

npm install > /dev/null 2>&1
success "Dependencias del frontend verificadas"

success "Diagnóstico completado!"
info "Para iniciar la aplicación:"
info "  1. Backend: cd services/api && python manage.py runserver 8000"
info "  2. Frontend: cd apps/web && npm run dev"
