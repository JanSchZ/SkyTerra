@echo off

REM ## Script de inicio rápido para SkyTerra en Windows ##
REM Este script inicia el backend (Django) y el frontend (React) en ventanas separadas.

REM Iniciar el Backend
echo Iniciando el backend...
REM La opción "start" abre el comando en una nueva ventana y permite que el script continúe.
REM Usa "cmd /k" para mantener la ventana abierta después de ejecutar el comando.
start "SkyTerra Backend" cmd /k "cd backend && .venv\Scripts\python.exe manage.py runserver"

REM Dar un momento para que el backend inicie (opcional, ajusta según sea necesario)
timeout /t 5 /nobreak

REM Iniciar el Frontend
echo Iniciando el frontend...
start "SkyTerra Frontend" cmd /k "cd frontend && npm run dev"

echo SkyTerra ha sido iniciado. Se abrieron dos ventanas separadas. 