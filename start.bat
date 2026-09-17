@echo off
echo Starting BI Dashboard...

echo Starting FastAPI Backend...
start cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn main:app --reload"

echo Starting Next.js Frontend...
start cmd /k "cd frontend && npm run dev"

echo Done! Both servers are booting up.
