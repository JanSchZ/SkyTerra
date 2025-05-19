# SkyTerra - Plataforma de Propiedades Rurales

SkyTerra es una plataforma innovadora para la visualización y búsqueda de propiedades rurales que utiliza inteligencia artificial para mejorar la experiencia del usuario.

## Características principales

- **Búsqueda impulsada por IA**: Utiliza Google Gemini 2.0 Flash para interpretar consultas en lenguaje natural
- **Visualización geoespacial**: Explora propiedades en un mapa interactivo
- **Filtrado inteligente**: Filtra propiedades por tipo, precio, características y ubicación
- **Tours virtuales**: Explora propiedades con tours 360°

## Requisitos previos

- [Python 3.9+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)
- Clave API de [Google Gemini](https://ai.google.dev/)
- Se recomienda el uso de entornos virtuales para Python (`venv` o `.venv`).

## Configuración rápida

### 1. Clonar el repositorio

```bash
git clone https://github.com/JanSchZ/SkyTerra.git
cd SkyTerra
```
*(Nota: La URL del repositorio puede variar si lo has bifurcado o clonado de otro lugar)*

### 2. Configurar las variables de entorno

Crea un archivo `.env` en la **raíz** del proyecto (junto a `.gitignore` y `README.md`) copiando el contenido de `.env.example` y rellenando tus datos.

```bash
cp .env.example .env
# Luego edita .env con tus claves y configuraciones
```

Para generar una `SECRET_KEY` para Django, puedes usar:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Para obtener una `GEMINI_API_KEY`, visita [Google AI Studio](https://makersuite.google.com/app/apikey).
Para obtener una `VITE_MAPBOX_TOKEN`, visita [Mapbox](https://account.mapbox.com/).

### 3. Instalar dependencias

Instala las dependencias del backend y frontend:

```bash
# Backend (desde la raíz del proyecto)
cd backend
python -m venv .venv  # Crea un entorno virtual si no lo tienes
.\.venv\Scripts\activate  # Activa el entorno virtual en Windows (PowerShell/CMD)
# source .venv/bin/activate  # Activa el entorno virtual en Unix/MacOS
pip install -r requirements.txt
python manage.py migrate
python manage.py create_demo_data # Opcional: crea datos de ejemplo
deactivate # Desactiva el entorno virtual en Windows
# unset VIRTUAL_ENV # Desactiva en Unix/MacOS
cd .. # Vuelve a la raíz

# Frontend (desde la raíz del proyecto)
cd frontend
npm install
cd .. # Vuelve a la raíz
```

### 4. Iniciar la aplicación

#### Inicio rápido con script (Windows)

Si estás en Windows, puedes usar el script `start_app.bat` ubicado en la raíz del proyecto para iniciar tanto el backend como el frontend con un solo comando. Asegúrate de haber completado los pasos 1-3 primero.

Simplemente ejecuta:

```cmd
start_app.bat
```

Este script activará los entornos virtuales, ejecutará los servidores de desarrollo de Django y Vite, y abrirá la aplicación en tu navegador.

#### Manualmente

Si prefieres iniciar los servicios manualmente (o si no usas Windows):

**Backend (Django)**:
```bash
cd backend
.\.venv\Scripts\activate  # Activa el entorno virtual en Windows (PowerShell/CMD)
# source .venv/bin/activate  # Activa el entorno virtual en Unix/MacOS
python manage.py runserver
```

**Frontend (React/Vite)**:
```bash
cd frontend
npm run dev
```

## Solución de problemas comunes

### Problemas con entornos virtuales
- Asegúrate de activar el entorno virtual correcto (`.venv` o `venv`) antes de instalar dependencias o ejecutar el servidor Django.
- Si `pip install -r requirements.txt` falla, verifica que el entorno virtual esté activado.

### Archivo .env no encontrado o errores de variables de entorno
- Verifica que copiaste `.env.example` a `.env` en la raíz del proyecto.
- Asegúrate de haber rellenado correctamente todas las variables necesarias en tu archivo `.env`.

### Error en la API de Gemini
- Verifica que tu clave API de Gemini en el `.env` sea válida.
- Asegúrate de que el archivo `.env` esté correctamente configurado.
- Verifica los logs del servidor backend para más detalles (`python manage.py runserver`).

### Errores en la búsqueda por IA
- La búsqueda por IA puede mostrar errores en la consola del navegador (F12) si la respuesta del backend no tiene el formato esperado.
- Si ves errores al realizar búsquedas, verifica que la `GEMINI_API_KEY` en el `.env` sea válida y que el backend esté funcionando correctamente.

### El servidor no inicia (Backend o Frontend)
- Asegúrate de estar en el directorio correcto (`backend/` para Django, `frontend/` para Vite).
- Verifica que Python y Node.js estén instalados correctamente.
- Comprueba si los puertos 8000 (backend) y 5173 (frontend) están disponibles. Puedes cambiarlos si es necesario (revisa la documentación de Django y Vite).

### Errores de SQL / Base de datos
- Si encuentras errores de base de datos (SQLite durante el desarrollo), intenta eliminar el archivo `db.sqlite3` en la carpeta `backend/` y vuelve a ejecutar `python manage.py migrate`.

### Visualización del mapa
- Si el mapa no carga o muestra errores, verifica que el `VITE_MAPBOX_TOKEN` en tu `.env` sea correcto.

## Tecnologías utilizadas

- **Backend**: Django, Django REST Framework, psycopq2-binary (para PostgreSQL)
- **Frontend**: React, Material-UI, react-map-gl, Mapbox GL JS
- **IA**: Google Gemini API
- **Base de datos**: SQLite (desarrollo), PostgreSQL (producción)

## Recursos adicionales

- [Documentación de la API de Gemini](https://ai.google.dev/gemini-api/docs?hl=es-419)
- [Documentación de Django](https://docs.djangoproject.com/)
- [Documentación de React](https://react.dev/)
- [Documentación de Vite](https://vitejs.dev/)
- [Documentación de Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/)

## Contacto

Para reportar problemas o sugerencias, por favor abre un issue en este repositorio de GitHub.

---

Desarrollado con ❤️ por el equipo de SkyTerra 