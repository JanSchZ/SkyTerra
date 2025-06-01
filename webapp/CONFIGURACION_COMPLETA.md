# 🌍 SkyTerra - Configuración Completa

## ✅ **Mejoras Implementadas**

### 🔍 **Búsqueda Global Mejorada**
- ✅ Búsqueda de ubicaciones en **todo el mundo** (no solo Chile)
- ✅ 50+ ubicaciones predefinidas (New York, Tokyo, London, etc.)
- ✅ Integración con Mapbox Geocoding API global
- ✅ Vuelo suave a cualquier ubicación del mundo

### 🤖 **IA Integrada con Propiedades Reales**
- ✅ La IA ahora busca en la **base de datos real** de propiedades
- ✅ Recomendaciones basadas en propiedades existentes
- ✅ Filtros inteligentes que funcionan con datos reales
- ✅ Respuestas de fallback cuando la IA no está disponible
- ✅ Búsqueda por texto en nombres y descripciones

### 🗺️ **Mapa 3D Permanente**
- ✅ Mapa siempre en 3D (pitch 45° por defecto)
- ✅ Terreno 3D activado automáticamente
- ✅ Control de ángulos de visión (0°, 30°, 45°, 60°)
- ✅ Animaciones suaves entre ubicaciones

### 🎨 **Interfaz Mejorada**
- ✅ Resultados de búsqueda con altura limitada (no cubren toda la pantalla)
- ✅ Scroll en resultados largos
- ✅ Visualización mejorada de propiedades con detalles
- ✅ Chips informativos (agua, vistas, tipo de propiedad)
- ✅ Indicadores de estado (IA disponible/no disponible)

---

## 🔧 **Configuración Requerida**

### 1. **Variables de Entorno**

Crear archivo `.env` en la raíz del proyecto:

```bash
# Frontend - Mapbox
VITE_MAPBOX_ACCESS_TOKEN=tu_token_mapbox_aqui

# Backend - Django
SECRET_KEY=tu_django_secret_key_aqui
DEBUG=True
GOOGLE_GEMINI_API_KEY=tu_gemini_api_key_aqui

# Base de datos (opcional - usa SQLite por defecto)
DATABASE_URL=postgresql://user:password@localhost:5432/skyterra
```

### 2. **Obtener API Keys**

#### 🗺️ **Mapbox Token**
1. Ir a [Mapbox Account](https://account.mapbox.com/access-tokens/)
2. Crear nuevo token o usar existente
3. Copiar como `VITE_MAPBOX_ACCESS_TOKEN`

#### 🤖 **Gemini API Key**
1. Ir a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crear nueva API key
3. Copiar como `GOOGLE_GEMINI_API_KEY`

#### 🔐 **Django Secret Key**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 🚀 **Instalación y Ejecución**

### **Backend (Terminal 1)**
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py create_demo_data  # Crear datos de prueba
python manage.py runserver
```

### **Frontend (Terminal 2)**
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 **Pruebas de Funcionalidad**

### **Búsqueda Geográfica Global**
- ✅ "New York" → Vuela a Nueva York
- ✅ "Tokyo" → Vuela a Tokio  
- ✅ "London" → Vuela a Londres
- ✅ "Paris" → Vuela a París
- ✅ "Chile" → Vuela a Chile
- ✅ "Düsseldorf" → Busca con Mapbox API

### **Búsqueda de Propiedades con IA**
- ✅ "granja con agua" → Encuentra granjas con has_water=True
- ✅ "rancho barato" → Filtra ranchos por precio bajo
- ✅ "terreno grande" → Busca por tamaño
- ✅ "propiedad con vistas" → Filtra por has_views=True
- ✅ "bosque" → Encuentra propiedades tipo forest

### **Funcionalidades del Mapa**
- ✅ Mapa siempre en 3D
- ✅ Botón de ángulo de visión funcional
- ✅ Vuelos suaves entre ubicaciones
- ✅ Zoom inteligente según tipo de lugar

---

## 📊 **Datos de Prueba Incluidos**

El comando `python manage.py create_demo_data` crea:

- **8 propiedades** de diferentes tipos (granja, rancho, bosque, lago)
- **Precios variados** ($89,000 - $450,000)
- **Características diversas** (agua, vistas, tamaños)
- **Imágenes y tours** asociados
- **Descripciones detalladas**

---

## 🔍 **Cómo Funciona la IA**

### **Proceso de Búsqueda**
1. **Usuario escribe consulta** (ej: "granja con agua")
2. **IA analiza la consulta** usando Gemini
3. **Extrae filtros** (tipo: farm, característica: hasWater)
4. **Busca en base de datos real** con filtros
5. **Devuelve propiedades reales** que coinciden
6. **Muestra recomendaciones específicas**

### **Respuesta de Fallback**
Si Gemini no está disponible:
1. **Análisis básico** de palabras clave
2. **Búsqueda directa** en base de datos
3. **Resultados limitados** pero funcionales
4. **Indicador visual** de modo fallback

---

## 🎯 **Casos de Uso Principales**

### **Búsqueda Geográfica**
- Explorar ubicaciones mundiales
- Planificar viajes o inversiones
- Comparar regiones geográficas

### **Búsqueda de Propiedades**
- Encontrar terrenos específicos
- Filtrar por características
- Comparar precios y tamaños
- Ver propiedades con tours virtuales

### **Navegación 3D**
- Explorar terrenos en 3D
- Visualizar topografía
- Evaluar ubicaciones geográficas

---

## 🛠️ **Solución de Problemas**

### **IA no funciona**
- ✅ Verificar `GOOGLE_GEMINI_API_KEY` en `.env`
- ✅ Comprobar cuota de API de Gemini
- ✅ Revisar logs del backend
- ✅ Modo fallback activado automáticamente

### **Mapa no carga**
- ✅ Verificar `VITE_MAPBOX_ACCESS_TOKEN` en `.env`
- ✅ Comprobar cuota de Mapbox
- ✅ Verificar conexión a internet

### **No hay propiedades**
- ✅ Ejecutar `python manage.py create_demo_data`
- ✅ Verificar base de datos
- ✅ Comprobar migraciones

---

## 📈 **Próximas Mejoras Sugeridas**

1. **Filtros avanzados** en la interfaz
2. **Mapa de calor** de precios
3. **Comparación** de propiedades
4. **Favoritos** de usuario
5. **Notificaciones** de nuevas propiedades
6. **Integración** con más APIs inmobiliarias

---

## 📞 **Soporte**

Para problemas o mejoras:
1. Verificar este archivo de configuración
2. Revisar logs del backend y frontend
3. Comprobar variables de entorno
4. Verificar conectividad de APIs

**¡SkyTerra ahora es una plataforma completa de búsqueda inmobiliaria con IA integrada! 🎉** 