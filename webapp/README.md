# SkyTerra V1

This is the main repository for the SkyTerra V1 project.

## Project Structure

The project is divided into two main parts:

*   `backend/`: Contains the Django backend application.
*   `frontend/`: Contains the React frontend application.

## Key Features

*   **AI-Powered Search**: Utilizes Google Gemini for natural language query interpretation.
*   **Geospatial Visualization**: Explore properties on an interactive map (Mapbox).
*   **Smart Filtering**: Filter properties by type, price, features, and location.
*   **Virtual Tours**: Explore properties with 360° tours.

## Prerequisites

*   Python (version 3.13 or higher recommended, 3.9+ required)
*   Node.js (version 18.x or higher recommended)
*   npm (usually comes with Node.js)
*   A PostgreSQL database instance (for production/persistent data). SQLite can be used for initial development.
*   Google Gemini API Key: Obtain from [Google AI Studio](https://makersuite.google.com/app/apikey).
*   Mapbox Access Token: Obtain from [Mapbox](https://account.mapbox.com/) (for the `VITE_MAPBOX_TOKEN` in the frontend).

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url> # Replace <repository-url> with the actual URL of this repository
cd SkyTerraV1 # Or your repository's root folder name
```

### 2. Configure Environment Variables

*   Copy the example `.env.example` file to a new file named `.env` in the **root** of the project.
    ```bash
    cp .env.example .env
    ```
*   Edit the `.env` file with your specific configurations:
    *   `SECRET_KEY`: A unique secret key for your Django application. You can generate one using:
        ```bash
        python -c "import secrets; print(secrets.token_urlsafe(50))"
        ```
    *   `DEBUG`: Set to `True` for development, `False` for production.
    *   `DATABASE_URL`: Your PostgreSQL connection string (e.g., `postgres://user:password@host:port/dbname`). For initial development, Django will default to SQLite if this is not set or is misconfigured, creating a `db.sqlite3` file in the `backend/` directory.
    *   `GEMINI_API_KEY`: Your Google Gemini API key.
    *   `VITE_MAPBOX_TOKEN`: Your Mapbox access token (this will be used by the frontend).

### 3. Backend Setup (Django)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Create and activate a virtual environment:**
    On Windows (PowerShell/CMD):
    ```bash
    python -m venv .venv
    .venv\Scripts\activate
    ```
    On macOS/Linux:
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    ```
3.  **Install Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Apply database migrations:**
    This will set up your database schema. If using SQLite for the first time, this will create the `db.sqlite3` file.
    ```bash
    python manage.py migrate
    ```
5.  **(Optional) Create demo data:**
    ```bash
    python manage.py create_demo_data
    ```
6.  **Run the development server:**
    ```bash
    python manage.py runserver
    ```
    The backend will usually be available at `http://127.0.0.1:8000/`.
7.  **Deactivate the virtual environment when done (optional):**
    ```bash
    deactivate
    ```

### 4. Frontend Setup (React/Vite)

1.  **Navigate to the frontend directory (from the project root):**
    ```bash
    cd frontend
    ```
2.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```
3.  **Run the development server:**
    ```bash
    npm run dev # or npm start, depending on your package.json scripts
    ```
    The frontend development server will usually start on `http://localhost:3000/` or `http://localhost:5173/` (for Vite) and may open automatically in your browser.
    Ensure your `.env` file in the project root has `VITE_MAPBOX_TOKEN` set, as the frontend might depend on it during its build/run process.

### 5. Running Both Frontend and Backend Concurrently

It's recommended to use two separate terminal windows/tabs:

*   **Terminal 1 (Backend):**
    ```bash
    cd backend
    # Activate virtual environment (e.g., .venv\Scripts\activate or source .venv/bin/activate)
    python manage.py runserver
    ```
*   **Terminal 2 (Frontend):**
    ```bash
    cd frontend
    npm run dev # or npm start
    ```

### Quick Start Script (Windows - `start_skyterra.bat`)

The `start_skyterra.bat` script in the root directory is intended to automate starting both backend and frontend services on Windows. Review and adapt this script to ensure it aligns with the current setup steps (virtual environment activation, correct paths, and commands).

To use it (after completing steps 1-3 for initial setup):
```cmd
start_skyterra.bat
```

## Troubleshooting Common Issues

*   **Virtual Environment Problems:**
    *   Ensure the correct virtual environment is activated before installing dependencies or running the Django server.
    *   If `pip install -r requirements.txt` fails, double-check activation.
*   **.env File Not Found or Environment Variable Errors:**
    *   Verify you copied `.env.example` to `.env` in the **project root**.
    *   Ensure all required variables are correctly filled in `.env`.
*   **Gemini API Errors:**
    *   Confirm your `GEMINI_API_KEY` in `.env` is valid.
    *   Check backend server logs (`python manage.py runserver`) for details.
*   **AI Search Errors:**
    *   AI search issues might show in the browser console (F12) if the backend response isn't as expected.
    *   Ensure `GEMINI_API_KEY` is valid and the backend is running correctly.
*   **Server Not Starting (Backend or Frontend):**
    *   Make sure you are in the correct directory (`backend/` or `frontend/`).
    *   Verify Python and Node.js are installed correctly and accessible in your PATH.
    *   Check if ports (e.g., 8000 for backend, 3000/5173 for frontend) are available. You can configure different ports if needed (see Django and Vite/React script documentation).
*   **SQL / Database Errors:**
    *   If using SQLite and encountering issues, you can try deleting `backend/db.sqlite3` and re-running `python manage.py migrate` (this will erase existing SQLite data).
    *   For PostgreSQL, ensure your `DATABASE_URL` is correct and the server is accessible.
*   **Map Visualization Issues:**
    *   If the map doesn't load, verify `VITE_MAPBOX_TOKEN` in `.env` is correct and the frontend is configured to read it (often as `import.meta.env.VITE_MAPBOX_TOKEN` in Vite projects).

## Technologies Used

*   **Backend**: Django, Django REST Framework, psycopg2-binary (for PostgreSQL)
*   **Frontend**: React, Material-UI, react-map-gl, Mapbox GL JS (likely with Vite as a build tool)
*   **AI**: Google Gemini API
*   **Database**: SQLite (development), PostgreSQL (production)

## Additional Resources & Documentation

*   Project-specific development guides: `Guía de desarrollo1.txt`, `Guia de desarrollo2.txt` (Note: these appear to be in Spanish)
*   [Google Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
*   [Django Documentation](https://docs.djangoproject.com/)
*   [React Documentation](https://react.dev/)
*   [Vite Documentation](https://vitejs.dev/) (if used for the frontend)
*   [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/api/)

## Contributing

Please refer to the project-specific development guides for details on the code of conduct and the process for submitting pull requests.

## Progress Log

Refer to `skyterra_progress_log.txt` for a log of development progress.

## Contact

For reporting problems or suggestions, please open an issue in this GitHub repository.

---

Developed by the SkyTerra team. 