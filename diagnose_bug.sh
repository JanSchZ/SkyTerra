#!/bin/bash

echo "🚀 Iniciando diagnóstico del bug de registro..."

# Cambiar al directorio backend
cd /workspaces/SkyTerra/backend

echo "📁 Directorio actual: $(pwd)"
echo "🐍 Versión de Python: $(python --version 2>&1 || echo 'Python no encontrado')"

# Verificar si manage.py existe
if [ -f "manage.py" ]; then
    echo "✅ manage.py encontrado"
else
    echo "❌ manage.py no encontrado"
    exit 1
fi

# Probar Django directamente
echo "🔍 Probando Django..."
python -c "
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skyterra_backend.settings')
django.setup()

from django.contrib.auth.models import User
print('✅ Django configurado correctamente')
print(f'📊 Usuarios existentes: {User.objects.count()}')
"

echo "🌐 Probando servidor de desarrollo..."
# Intentar iniciar el servidor por 3 segundos
timeout 3s python manage.py runserver 8000 --noreload || echo "⚠️  Servidor no pudo iniciarse o se detuvo"

echo "🏁 Diagnóstico completado"
