# 🚀 SkyTerra - Configuración Completa para GitHub Codespaces

## 📋 Lista de Verificación Rápida

### ✅ Configuración Automática
1. **Ejecutar script de inicio**: `./start_skyterra.sh`
2. **Verificar puertos**: Backend (8000) y Frontend (5173)
3. **Configurar variables de entorno**: `.env` files
4. **Crear datos de prueba**: Comando automático incluido

---

## 🔧 Configuración Inicial (Solo Primera Vez)

### 1. **Variables de Entorno Requeridas**

#### Backend (.env en `/workspaces/SkyTerra/backend/.env`)
```bash
SECRET_KEY=django-insecure-oz7k_zw9rjk8qc_01i9ataa7a0-1=z&2pq7=l14lq@w-9)%a&n
DEBUG=True
GOOGLE_GEMINI_API_KEY=tu_gemini_api_key_aqui
FRONTEND_URL=https://CODESPACE_NAME-5173.app.github.dev
```

#### Frontend (.env en `/workspaces/SkyTerra/frontend/.env`)
```bash
VITE_MAPBOX_ACCESS_TOKEN=tu_mapbox_token_aqui
VITE_API_BASE_URL=https://CODESPACE_NAME-8000.app.github.dev
```

### 2. **Obtener API Keys Necesarias**

#### 🗺️ Mapbox Token (OBLIGATORIO)
1. Ir a [Mapbox Account](https://account.mapbox.com/access-tokens/)
2. Crear token o usar existente
3. Añadir a `frontend/.env` como `VITE_MAPBOX_ACCESS_TOKEN`

#### 🤖 Gemini API Key (OPCIONAL - pero recomendado)
1. Ir a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crear nueva API key
3. Añadir a `backend/.env` como `GOOGLE_GEMINI_API_KEY`

---

## 🏃‍♂️ Inicio Rápido

### **Opción 1: Script Automático (Recomendado)**
```bash
cd /workspaces/SkyTerra
chmod +x start_skyterra.sh
./start_skyterra.sh
```

### **Opción 2: Manual**

#### Terminal 1 - Backend:
```bash
cd /workspaces/SkyTerra/backend
python3 -m venv .venv
source .venv/bin/activate
pip install django djangorestframework django-cors-headers python-dotenv django-filter
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

#### Terminal 2 - Frontend:
```bash
cd /workspaces/SkyTerra/frontend
npm install  # Solo si es necesario
npm run dev
```

---

## 🌐 URLs de Acceso en Codespaces

Reemplaza `CODESPACE_NAME` con el nombre real de tu codespace:

- **🏠 Aplicación Principal**: `https://CODESPACE_NAME-5173.app.github.dev`
- **📱 Registro**: `https://CODESPACE_NAME-5173.app.github.dev/register`
- **🔐 Login**: `https://CODESPACE_NAME-5173.app.github.dev/login`
- **⚙️ Admin Panel**: `https://CODESPACE_NAME-8000.app.github.dev/admin`
- **🔧 API Backend**: `https://CODESPACE_NAME-8000.app.github.dev/api`

---

## 🔍 Verificación del Estado

### **Comprobar Servicios**
```bash
# Verificar puertos activos
lsof -i :8000  # Backend
lsof -i :5173  # Frontend

# Ver logs en tiempo real
tail -f /tmp/backend.log   # Logs del backend
tail -f /tmp/frontend.log  # Logs del frontend
```

### **Probar APIs**
```bash
# Test backend
curl https://CODESPACE_NAME-8000.app.github.dev/api/properties/

# Test frontend
curl https://CODESPACE_NAME-5173.app.github.dev
```

---

## 🐛 Solución de Problemas Comunes

### **Backend no inicia**
```bash
cd backend
source .venv/bin/activate
python manage.py check
python manage.py migrate
```

### **Frontend no carga**
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

### **Error de CORS**
- Verificar que `CODESPACE_NAME` esté configurado correctamente
- Confirmar URLs en `backend/skyterra_backend/settings.py`

### **Mapa no carga**
- Verificar `VITE_MAPBOX_ACCESS_TOKEN` en `frontend/.env`
- Comprobar cuota de Mapbox

### **IA no funciona**
- Verificar `GOOGLE_GEMINI_API_KEY` en `backend/.env`
- La aplicación funciona sin IA (modo fallback automático)

---

## 📦 Dependencias Principales

### **Backend Python**
- Django 5.2+
- Django REST Framework
- django-cors-headers
- python-dotenv
- django-filter

### **Frontend Node.js**
- React 18
- Vite
- Material-UI
- Mapbox GL
- Framer Motion

---

## 🎯 Funcionalidades Principales

### **✅ Mapa 3D Interactivo**
- Terreno 3D activado
- Controles de ángulo de visión
- Vuelos cinematográficos automáticos

### **✅ Búsqueda Global**
- 50+ ubicaciones predefinidas
- Integración con Geocoding API
- Búsqueda en todo el mundo

### **✅ IA Integrada**
- Búsqueda inteligente de propiedades
- Filtros automáticos
- Modo fallback sin IA

### **✅ Gestión de Propiedades**
- CRUD completo
- Tours virtuales 360°
- Sistema de admin

---

## 🔧 Configuraciones Específicas de Codespaces

### **Archivo de Configuración Automática** (`.devcontainer/devcontainer.json`)
```json
{
  "name": "SkyTerra Development",
  "image": "mcr.microsoft.com/devcontainers/python:3.12",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "18"
    }
  },
  "forwardPorts": [5173, 8000],
  "portsAttributes": {
    "5173": {
      "label": "Frontend (Vite)",
      "onAutoForward": "openBrowser"
    },
    "8000": {
      "label": "Backend (Django)",
      "onAutoForward": "notify"
    }
  },
  "postCreateCommand": "chmod +x start_skyterra.sh",
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "bradlc.vscode-tailwindcss",
        "esbenp.prettier-vscode"
      ]
    }
  }
}
```

---

## 📝 Comandos de Mantenimiento

### **Reiniciar Servicios**
```bash
# Detener todo
pkill -f 'runserver\|vite'

# Reiniciar
./start_skyterra.sh
```

### **Actualizar Dependencias**
```bash
# Backend
cd backend && source .venv/bin/activate && pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### **Crear Datos de Prueba**
```bash
cd backend
source .venv/bin/activate
python manage.py create_demo_data
```

---

## 🎉 Resultado Esperado

Después de seguir esta configuración:

1. **✅ Backend Django** corriendo en puerto 8000
2. **✅ Frontend React** corriendo en puerto 5173
3. **✅ Mapa 3D** funcionando con Mapbox
4. **✅ IA integrada** (si se configuró Gemini)
5. **✅ Propiedades de prueba** cargadas
6. **✅ Admin panel** accesible
7. **✅ CORS** configurado para Codespaces

---

## 🚨 Notas Importantes

1. **Reemplazar CODESPACE_NAME**: Actualizar en todas las URLs
2. **Configurar API Keys**: Mapbox es obligatorio, Gemini opcional
3. **Puertos públicos**: GitHub Codespaces los maneja automáticamente
4. **Persistencia**: Los archivos `.env` deben crearse manualmente
5. **Primera ejecución**: Puede tardar más por instalación de dependencias

---

## 📞 Soporte Rápido

**¿No funciona algo?**
1. Verificar logs: `tail -f /tmp/backend.log` y `tail -f /tmp/frontend.log`
2. Comprobar puertos: `lsof -i :8000` y `lsof -i :5173`
3. Verificar variables de entorno en archivos `.env`
4. Ejecutar `./start_skyterra.sh` nuevamente

**¡SkyTerra listo para desarrollo en Codespaces! 🌍✨**
