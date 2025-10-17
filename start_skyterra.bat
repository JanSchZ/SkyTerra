@echo off

REM ## Script de inicio rápido para SkyTerra en Windows ##
REM Este script inicia el backend (Django) y el frontend (React) en ventanas separadas.

SET "SCRIPT_DIR=%~dp0"
SET "BACKEND_DIR=%SCRIPT_DIR%services\api"
SET "FRONTEND_DIR=%SCRIPT_DIR%apps\web"
SET "OPERATOR_DIR=%SCRIPT_DIR%apps\operator-mobile"

REM Iniciar el Backend
echo Iniciando el backend...
IF NOT EXIST "%BACKEND_DIR%" (
    echo Error: El directorio del backend no se encontró en "%BACKEND_DIR%"
    echo Asegurese de que la carpeta 'backend' este en el mismo directorio que 'start_skyterra.bat'.
    pause
    exit /b 1
)

cd /d "%BACKEND_DIR%"
IF NOT EXIST ".venv\Scripts\activate" (
    echo Error: El entorno virtual no se encontro en "%BACKEND_DIR%\.venv"
    echo Por favor, ejecute 'python -m venv .venv' en la carpeta 'backend' y luego 'pip install -r requirements.txt'.
    pause
    exit /b 1
)

REM La opción "start" abre el comando en una nueva ventana y permite que el script continúe.
REM Backend: fijamos variables de entorno para CORS/CSRF y puertos locales.
start "SkyTerra Backend" cmd /k "set DEBUG=True && set CLIENT_URL=http://localhost:3000 && set CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 && set CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 && set JWT_COOKIE_SECURE=False && .\.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000"

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
REM Frontend: si no existe .env, forzamos la API base a 8000 para evitar CORS.
start "SkyTerra Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm.cmd run dev -- --port 3000"

REM Iniciar app de operadores si existe
IF EXIST "%OPERATOR_DIR%" (
    echo Iniciando app de operadores (Expo)...
    start "SkyTerra Operadores" cmd /k "cd /d "%OPERATOR_DIR%" && npx.cmd expo start --env-file .env.development"
) ELSE (
    echo [INFO] No se encontro "%OPERATOR_DIR%". Omitiendo app de operadores.
)

IF EXIST "%OPERATOR_DIR%" (
    echo SkyTerra ha sido iniciado. Se abrieron ventanas para backend, frontend y operadores.
) ELSE (
    echo SkyTerra ha sido iniciado. Se abrieron ventanas para backend y frontend.
    echo (No se encontro apps\operator-mobile; omitiendo app de operadores.)
)
echo Visita http://localhost:3000 en tu navegador y conecta un dispositivo con la app Expo (npx expo start).
