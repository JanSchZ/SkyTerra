@echo off
REM Script to start SkyTerra application (Backend and Frontend)

echo Starting SkyTerra Backend...
start "SkyTerra Backend" cmd /k "cd backend && (if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) else if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) else (echo WARNING: Could not find a virtual environment to activate in backend/venv or backend/.venv)) && python manage.py runserver"

echo Starting SkyTerra Frontend...
start "SkyTerra Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo Both Backend and Frontend processes have been started in separate windows.

REM Prevent this window from closing immediately (optional)
REM pause  