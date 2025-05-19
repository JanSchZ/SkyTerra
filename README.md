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
- [PowerShell 5+](https://docs.microsoft.com/en-us/powershell/) (para Windows)
- Clave API de [Google Gemini](https://ai.google.dev/)

## Configuración rápida

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/skyterra.git
cd skyterra
```

### 2. Configurar el archivo .env

Crea un archivo `.env` en la carpeta `backend/` con la siguiente información:

```
DEBUG=True
SECRET_KEY=tu-clave-secreta-para-django
GOOGLE_GEMINI_API_KEY=tu-clave-api-de-gemini
```

Para generar una clave secreta de Django, puedes usar:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Para obtener una clave API de Gemini, visita [Google AI Studio](https://makersuite.google.com/app/apikey).

### 3. Iniciar la aplicación

#### En Windows

Simplemente ejecuta el script de inicio:

```powershell
.\start_skyterra.ps1
```

#### Manualmente

Si prefieres iniciar los servicios manualmente:

**Backend (Django)**:
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate  # En Windows
source .venv/bin/activate  # En Unix/MacOS
pip install -r requirements.txt
python manage.py migrate
python manage.py create_demo_data
python manage.py runserver
```

**Frontend (React/Vite)**:
```bash
cd frontend
npm install
npm run dev
```

## Solución de problemas comunes

### Error en la API de Gemini
- Verifica que tu clave API de Gemini sea válida
- Asegúrate de que el archivo `.env` esté correctamente configurado
- Verifica los logs del servidor para más detalles

### Errores en la búsqueda por IA
- La búsqueda por IA puede mostrar errores en la consola (F12) si la respuesta no tiene el formato esperado
- Si ves errores al realizar búsquedas, verifica que la API key de Gemini sea válida
- La aplicación incluye manejo de errores robusto para evitar que la interfaz se rompa

### El servidor no inicia
- Asegúrate de estar en el directorio correcto
- Verifica que Python y Node.js estén instalados correctamente
- Comprueba si los puertos 8000 y 5173 están disponibles

### Errores de SQL
- Si encuentras errores de base de datos, intenta eliminar el archivo `db.sqlite3` y vuelve a ejecutar `python manage.py migrate`

### Visualización del mapa
- Si el mapa se muestra con un fondo negro estrellado en niveles de zoom bajos, actualiza a la última versión del código
- La aplicación está configurada para usar proyección Mercator en todo momento

## Tecnologías utilizadas

- **Backend**: Django, Django REST Framework
- **Frontend**: React, Material-UI, Mapbox
- **IA**: Google Gemini API
- **Base de datos**: SQLite (desarrollo), PostgreSQL (producción)

## Recursos adicionales

- [Documentación de la API de Gemini](https://ai.google.dev/gemini-api/docs?hl=es-419)
- [Documentación de Django](https://docs.djangoproject.com/)
- [Documentación de React](https://reactjs.org/docs/getting-started.html)

## Contacto

Para reportar problemas o sugerencias, por favor abre un issue en este repositorio.

---

Desarrollado con ❤️ por el equipo de SkyTerra 