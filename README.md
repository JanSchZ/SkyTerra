# SkyTerra

## Overview

SkyTerra is a cutting-edge geospatial property platform designed to revolutionize how users discover, analyze, and manage real estate. It features AI-powered search, interactive map visualizations, virtual 360° tours, and robust property management tools.

## Project Structure

The project is composed of two main applications:

*   `backend/`: A powerful Django application providing the API, database management, and business logic.
*   `frontend/`: A dynamic React application built with Vite, offering a rich user interface.

## Key Features

*   **AI-Powered Search**: Natural language query interpretation powered by Google Gemini.
*   **Geospatial Visualization**: Interactive property exploration using Mapbox GL JS.
*   **Smart Filtering**: Advanced filtering capabilities by type, price, features, and location.
*   **Virtual Tours**: Immersive 360° virtual tours for properties.
*   **Secure Payments**: Integrated Stripe for subscription management and secure transactions.
*   **Support Ticketing**: Built-in system for user support and issue resolution.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Python**: Version 3.9 or higher (3.13 recommended).
*   **Node.js**: Version 18.x or higher.
*   **npm**: Comes bundled with Node.js.
*   **PostgreSQL**: A database instance is recommended for production. SQLite is used by default for development.
*   **Google Gemini API Key**: Obtain one from [Google AI Studio](https://makersuite.google.com/app/apikey).
*   **Mapbox Access Token**: Get your public token from [Mapbox](https://account.mapbox.com/).
*   **Stripe API Keys**: Obtain your secret and publishable keys from your [Stripe Dashboard](https://dashboard.stripe.com/apikeys).
*   **Stripe Webhook Secret**: Generated when you set up a webhook endpoint (e.g., via Stripe CLI or Dashboard).

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SkyTerraV1 # Or your repository's root folder name
```

### 2. Configure Environment Variables

Create a `.env` file in the **root** of the project by copying the example:

```bash
cp env.example .env
```

Edit the `.env` file and fill in your specific configurations. Below are the essential variables:

```dotenv
# ----------------------------------------------------------------------------------
# Django / Backend configuration
SECRET_KEY=your_django_secret_key_here # Generate using: python -c "import secrets; print(secrets.token_urlsafe(50))"
DEBUG=True # Set to False for production
ALLOWED_HOSTS=localhost,127.0.0.1 # Add your domain in production

# Database (PostgreSQL example)
# DATABASE_URL=postgres://user:password@host:port/database_name
# For SQLite (default if DATABASE_URL is not set or commented out):
# No specific setting needed, db.sqlite3 will be created in backend/

# Stripe (Backend)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# External APIs
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key_here

# Client URL (frontend base URL used for redirects)
CLIENT_URL=http://localhost:3000

# AWS / S3 (optional – required only if USE_S3=True in Django settings)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_STORAGE_BUCKET_NAME=
# AWS_S3_REGION_NAME=us-east-1

# ----------------------------------------------------------------------------------
# Frontend / Vite variables (exposed to the browser)
VITE_API_BASE_URL=http://localhost:8000/api
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### 3. Backend Setup (Django)

Navigate to the `backend/` directory and set up the Python environment:

```bash
cd backend

# Create and activate a virtual environment
# On Windows (PowerShell/CMD):
python -m venv .venv
.venv\Scripts\activate
# On macOS/Linux:
python3 -m venv .venv
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# (Optional) Create a superuser for Django Admin
python manage.py createsuperuser

# (Optional) Create demo data
python manage.py create_demo_data

# Return to project root
cd ..
```

### 4. Frontend Setup (React/Vite)

Navigate to the `frontend/` directory and install Node.js dependencies:

```bash
cd frontend

# Install Node.js dependencies
npm install

# Return to project root
cd ..
```

## Running the Application

SkyTerra provides convenient scripts to start both the backend and frontend concurrently.

### On Windows

Use the `start_skyterra.bat` script from the project root:

```cmd
start_skyterra.bat
```

This script will open two separate command prompt windows, one for the backend and one for the frontend.

### On macOS/Linux

Use the `start_skyterra.sh` script from the project root:

```bash
./start_skyterra.sh
```

This script will start both services in the background and attempt to open the frontend in your default web browser.

### Manual Start (Advanced)

If you prefer to start services manually or need more control:

*   **Terminal 1 (Backend):**
    ```bash
    cd backend
    # Activate virtual environment (e.g., .venv\Scripts\activate or source .venv/bin/activate)
    python manage.py runserver
    ```
*   **Terminal 2 (Frontend):**
    ```bash
    cd frontend
    npm run dev
    ```

The backend will typically run on `http://127.0.0.1:8000/` and the frontend on `http://localhost:5173/` (or `http://localhost:3000/`).

## Testing

### Backend Tests

To run Django's backend tests:

```bash
cd backend
# Activate virtual environment
python manage.py test
```

### Frontend Tests

(Currently, no dedicated frontend tests are configured. This is a future improvement area.)

## Troubleshooting Common Issues

*   **Environment Variables:** Ensure `.env` is in the project root and all required variables are set.
*   **Virtual Environment:** Always activate your Python virtual environment before running Django commands.
*   **Port Conflicts:** If a server fails to start, another application might be using the required port (8000 for backend, 5173/3000 for frontend).
*   **Database Issues:**
    *   For SQLite, try deleting `backend/db.sqlite3` and re-running `python manage.py migrate`.
    *   For PostgreSQL, verify `DATABASE_URL` and database server accessibility.
*   **API Key Errors:** Double-check your Google Gemini, Mapbox, and Stripe API keys in `.env`.
*   **Frontend Not Loading Map/Images:** Ensure `VITE_MAPBOX_ACCESS_TOKEN` is correctly set in `.env`.
*   **Stripe Webhooks:** For local testing of Stripe webhooks, use the Stripe CLI:
    ```bash
    stripe listen --forward-to localhost:8000/api/payments/webhook/
    ```
    Copy the `whsec_...` secret provided by the CLI into your `.env` as `STRIPE_WEBHOOK_SECRET`.

## Technologies Used

*   **Backend**: Django, Django REST Framework, psycopg2, Stripe Python library, Google AI Gemini API.
*   **Frontend**: React, Vite, Material-UI, react-map-gl, Mapbox GL JS, Axios, Stripe.js.
*   **Database**: PostgreSQL (recommended), SQLite.

## Further Documentation

*   **Development Progress Log**: Refer to `skyterra_progress_log.txt` for a detailed log of audit findings and implemented improvements.
*   **Codespaces Setup**: `CODESPACES_SETUP.md` (may contain additional setup notes for Codespaces environment).
*   **Complete Configuration**: `CONFIGURACION_COMPLETA.md` (may contain more detailed configuration notes).

---

Developed by the SkyTerra team.