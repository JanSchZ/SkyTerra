#!/bin/bash

echo "🚀 INICIANDO SKYTERRA - PLATAFORMA INMOBILIARIA"
echo "============================================="

# Función para verificar si un puerto está en uso
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Función para esperar que un puerto esté disponible
wait_for_port() {
    local port=$1
    local service=$2
    echo "⏳ Esperando que $service inicie en puerto $port..."
    
    for i in {1..30}; do
        if check_port $port; then
            echo "✅ $service está listo en puerto $port"
            return 0
        fi
        sleep 1
    done
    
    echo "❌ $service no pudo iniciarse en puerto $port"
    return 1
}

cd /workspaces/SkyTerra

echo "📋 Verificando estado de los servicios..."

# Verificar si el backend ya está corriendo
if check_port 8000; then
    echo "✅ Backend ya está corriendo en puerto 8000"
else
    echo "🔄 Iniciando backend Django..."
    cd backend
    python manage.py runserver 0.0.0.0:8000 > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "🆔 Backend PID: $BACKEND_PID"
    cd ..
    
    if ! wait_for_port 8000 "Backend"; then
        echo "❌ Error al iniciar backend. Ver log:"
        tail /tmp/backend.log
        exit 1
    fi
fi

# Verificar si el frontend ya está corriendo
if check_port 5173; then
    echo "✅ Frontend ya está corriendo en puerto 5173"
else
    echo "🔄 Iniciando frontend React..."
    cd frontend
    npm run dev > /tmp/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "🆔 Frontend PID: $FRONTEND_PID"
    cd ..
    
    if ! wait_for_port 5173 "Frontend"; then
        echo "❌ Error al iniciar frontend. Ver log:"
        tail /tmp/frontend.log
        exit 1
    fi
fi

echo ""
echo "🎉 ¡SKYTERRA ESTÁ LISTO!"
echo ""
echo "🌐 URLs disponibles:"
echo "   📱 Aplicación:    http://localhost:5173"
echo "   📝 Registro:      http://localhost:5173/register"
echo "   🔐 Login:         http://localhost:5173/login"
echo "   🏠 Propiedades:   http://localhost:5173/properties"
echo "   ⚙️  Admin Panel:   http://localhost:8000/admin"
echo "   🔧 API Backend:   http://localhost:8000/api"
echo ""
echo "👤 Credenciales Admin:"
echo "   Usuario: admin"
echo "   Contraseña: SkyTerra3008%"
echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs backend:  tail -f /tmp/backend.log"
echo "   Ver logs frontend: tail -f /tmp/frontend.log"
echo "   Detener todo:      pkill -f 'runserver\|vite'"
echo ""
echo "🐛 ¿Problemas? El bug de registro ha sido solucionado."
echo "   Puedes crear nuevas cuentas sin problemas."
echo ""

# Esperar un poco y mostrar un último estado
sleep 2
echo "📊 Estado final de los servicios:"
if check_port 8000; then
    echo "   ✅ Backend activo en puerto 8000"
else
    echo "   ❌ Backend no responde en puerto 8000"
fi

if check_port 5173; then
    echo "   ✅ Frontend activo en puerto 5173"
else
    echo "   ❌ Frontend no responde en puerto 5173"
fi

echo ""
echo "🚀 ¡Listo para usar SkyTerra!"
