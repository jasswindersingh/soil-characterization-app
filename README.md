# soil-characterization-app

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**Author:** Jasswinder Singh

A full-stack soil characterization application with a FastAPI backend and React + Vite frontend.

## Features

- Crop recommendation from soil metrics (N, P, K, temperature, humidity, pH, rainfall)
- Soil type classification from image uploads
- User registration, login, and history tracking
- Local JSON database storage for user profiles and activity history
- Separate `backend` and `frontend` workspaces for easy local development

## Repository structure

- `backend/` — FastAPI application, Python dependencies, local database, and supporting model logic
- `frontend/` — React + Vite single-page application
- `README.md` — this file
- `.gitignore` — local and generated files excluded from source control

## Prerequisites

- Python 3.11+ (or compatible 3.x)
- Node.js 18+ and npm
- `pip` and `npm`

## Backend setup

1. Open a terminal in the repository root and switch to the backend folder:

```bash
cd backend
```

2. Create and activate a Python virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. Install Python dependencies:

```bash
pip install -r requirements.txt
```

4. Start the FastAPI backend:

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The backend should now be available at `http://127.0.0.1:8000/`.

## Frontend setup

1. Open a separate terminal and switch to the frontend folder:

```bash
cd frontend
```

2. Install frontend dependencies:

```bash
npm install
```

3. Start the Vite development server:

```bash
npm run dev
```

The frontend will usually be available at `http://localhost:5173/`.

## Running the app together

- Start the backend first at `http://127.0.0.1:8000`
- Then start the frontend
- Use the frontend UI to register, log in, and interact with the soil prediction features

## Important notes

- The backend currently contains a development `SECRET_KEY` in `backend/main.py`. Replace it before deploying.
- The project ignores local environment files and model artifacts in `.gitignore`, including `.venv`, `backend/local_database.json`, `backend/soil_image_model.h5`, and `backend/*.pkl`.
- If backend startup fails when running from a sandboxed environment, run it from a normal terminal so it can bind to `127.0.0.1:8000`.

## Useful commands

```bash
cd backend && source .venv/bin/activate && python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

```bash
cd frontend && npm run dev
```

## License

This project is licensed under the MIT License.

See the `LICENSE` file for details.

### Other common open-source licenses

If you want to choose a different license later, here are common options:

- **MIT License** — simple, permissive, and widely used.
- **Apache License 2.0** — permissive with patent protection and explicit contribution terms.
- **GNU GPL v3** — strong copyleft license for projects that must share derivative works under the same terms.

Add a `LICENSE` or `LICENSE.md` file and update this section if you switch to a different license.
