# Dockerfile para SkyTerra Backend (Django) - Producción Ready
FROM python:3.11-slim

# Configurar variables de entorno para Python y Gunicorn
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    GUNICORN_WORKERS=2 \
    GUNICORN_THREADS=2 \
    GUNICORN_TIMEOUT=90

# Crear directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para PostgreSQL y build
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias de Python
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copiar código de la aplicación
COPY . .

# Crear directorio para logs
RUN mkdir -p logs

# Crear directorio para archivos estáticos
RUN mkdir -p staticfiles

# Configurar usuario no-root para seguridad
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

# Exponer puerto por defecto (Railway utilizará una variable PORT distinta si es necesario)
EXPOSE 8080

# Comando por defecto - Gunicorn usa el puerto proporcionado (fallback 8000)
CMD ["bash", "-lc", "gunicorn skyterra_backend.wsgi:application -b 0.0.0.0:${PORT:-8000} --workers ${GUNICORN_WORKERS} --threads ${GUNICORN_THREADS} --timeout ${GUNICORN_TIMEOUT} --access-logfile - --error-logfile -"]
