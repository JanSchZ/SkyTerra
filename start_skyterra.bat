@echo off

REM ## Script de inicio rápido para SkyTerra en Windows ##
REM Este script inicia el backend (Django) y el frontend (React) en ventanas separadas.

SET "SCRIPT_DIR=%~dp0"
SET "BACKEND_DIR=%SCRIPT_DIR%backend"
SET "FRONTEND_DIR=%SCRIPT_DIR%frontend"

REM Iniciar el Backend
echo Iniciando el backend...
IF NOT EXIST "%BACKEND_DIR%" (
    echo Error: El directorio del backend no se encontró en "%BACKEND_DIR%"
    echo Asegurese de que la carpeta 'backend' este en el mismo directorio que 'start_skyterra.bat'.
    pause
    exit /b 1
)

REM La opción "start" abre el comando en una nueva ventana y permite que el script continúe.
REM Usa "cmd /k" para mantener la ventana abierta después de ejecutar el comando.
start "SkyTerra Backend" cmd /k "cd /d "%BACKEND_DIR%" && .\.venv\Scripts\activate && python manage.py runserver"

REM Dar un momento para que el backend inicie (opcional, ajusta según sea necesario)
timeout /t 5 /nobreak

REM Iniciar el Frontend
echo Iniciando el frontend...
IF NOT EXIST "%FRONTEND_DIR%" (
    echo Error: El directorio del frontend no se encontró en "%FRONTEND_DIR%"
    echo Asegurese de que la carpeta 'frontend' este en el mismo directorio que 'start_skyterra.bat'.
    pause
    exit /b 1
)
start "SkyTerra Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm install && npm run dev"

echo SkyTerra ha sido iniciado. Se abrieron dos ventanas separadas.