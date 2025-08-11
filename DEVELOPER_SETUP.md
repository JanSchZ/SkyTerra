# SkyTerra • Guía Rápida de Configuración para Desarrolladores

Esta guía resume los pasos que seguimos para levantar el proyecto en **local** y en **GitHub Codespaces**, evitando los tropiezos más comunes (por ejemplo, paquetes faltantes, entorno virtual en subcarpeta, superusuario inexistente, etc.).

---
## 1. Prerrequisitos

| Herramienta | Versión recomendada |
|-------------|---------------------|
| Python      | 3.10+               |
| Node.js / npm | 20+               |
| Git         | Última estable      |
| Docker (opcional) | 24+           |

---
## 2. Clonar el repositorio
```bash
git clone https://github.com/<tu-org>/skyterra.git
cd skyterra
```

---
## 3. Backend (Django)
### 3.1 Crear y activar el entorno virtual
El proyecto incluye **el venv dentro de `backend/.venv`** (importante: _no_ en la raíz).

```bash
# Windows (PowerShell)
cd backend
python -m venv .venv
.\.venv\Scripts\activate

# macOS / Linux
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

### 3.2 Instalar dependencias
```bash
pip install -r requirements.txt
```

### 3.3 Migraciones y superusuario
```bash
python manage.py migrate               # Crea la BD SQLite
python manage.py createsuperuser       # Crea usuario admin
```
> Si aparece `That username is already taken`, abre la shell de Django y bórralo:
> ```python
> python manage.py shell
> >>> from django.contrib.auth import get_user_model; get_user_model().objects.filter(username='admin').delete()
> >>> exit()
> ```

### 3.4 Ejecutar backend
```bash
python manage.py runserver 0.0.0.0:8000
```
Visita `http://localhost:8000/admin`.

---
## 4. Frontend (React + Vite)
### 4.1 Instalar dependencias
Algunos paquetes **no estaban listados inicialmente** (`@mui/x-data-grid`, `@emotion/*`).

```bash
cd ../frontend
npm install                # instala lo del package.json
npm install @emotion/react @emotion/styled @mui/x-data-grid
```

### 4.2 Ejecutar frontend
```bash
npm run dev -- --host      # escucha en 5173
```
Abre `http://localhost:5173/dashboard`.

---
## 5. Scripts de ayuda (Windows)
En la raíz existe `start_skyterra.bat` que:
1. Activa `backend/.venv` y levanta el backend
2. Lanza el frontend

Simplemente:
```cmd
start_skyterra.bat
```

---
## 7. Problemas comunes
| Síntoma | Solución |
|---------|----------|
| Pantalla blanca y consola muestra `Could not resolve "@emotion/styled"` | Asegúrate de haber corrido `npm install @emotion/react @emotion/styled @mui/x-data-grid` dentro de **frontend/**. |
| `ps1 cannot be loaded` al activar venv en PowerShell | Ejecuta `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` una sola vez. |
| Error de puerto en Codespaces | Usa `npm run dev -- --host 0.0.0.0`, luego abre el puerto en la UI. |

¡Listo! Con esto cualquier dev debería poner SkyTerra en marcha en <5 min. 😉 