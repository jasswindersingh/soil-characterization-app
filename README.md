# soil-characterization-app

A full-stack soil characterization application with a FastAPI backend and React + Vite frontend.

## Features

- Crop recommendation from soil metrics (N, P, K, temperature, humidity, pH, rainfall)
- Soil type classification from images
- User registration, login, and usage history
- Local JSON database storage for user profiles and history
- Separate `backend` and `frontend` workspaces for easy development

## Repository structure

- `backend/` — FastAPI application, Python requirements, local database, and model artifacts
- `frontend/` — React + Vite single-page application
- `README.md` — this file
- `.gitignore` — ignored files for Python, Node, and development artifacts

## Prerequisites

- Python 3.11+ (or compatible 3.x)
- Node.js 18+ and npm
- `pip` and `npm`

## Backend setup

1. Open a terminal in `backend/`
2. Create and activate a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Start the FastAPI server:

```bash
uvicorn main:app --reload
```

The backend will be available at `http://127.0.0.1:8000`.

## Frontend setup

1. Open a terminal in `frontend/`
2. Install dependencies:

```bash
npm install
```

3. Start the Vite development server:

```bash
npm run dev
```

The frontend will typically be available at `http://localhost:5173`.

## Notes

- The backend currently uses a hard-coded `SECRET_KEY` in `backend/main.py` for development. Change it before deploying to production.
- The local database file `backend/local_database.json` is ignored in Git and managed locally.
- Model artifact files like `soil_image_model.h5` and serialized model files are also ignored by Git.

## Useful commands

- Backend: `cd backend && uvicorn main:app --reload`
- Frontend: `cd frontend && npm run dev`

## License

This repository does not include a license file. Add one if you want to share or publish the project.
