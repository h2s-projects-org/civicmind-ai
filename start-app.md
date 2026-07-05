To start the app:

Backend: PYTHONPATH=. uvicorn apps.api.main:app --reload --port 8000
Frontend: cd apps/web && npm run dev



Step 2 — Set up Python backend:
cd /Users/jenisten/Downloads/civicmind-ai/apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

Step 3 — Install frontend deps:
cd /Users/jenisten/Downloads/civicmind-ai/apps/web
npm install

Step 4 — Run tests (from project root):
cd /Users/jenisten/Downloads/civicmind-ai
source apps/api/.venv/bin/activate
PYTHONPATH=. python -m pytest apps/api/tests/ -v


To deploy to GCP Cloud Run, you can run this command from the project root:
gcloud run deploy civicmind-ai \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8080 \
    --set-env-vars="ENVIRONMENT=production,DEBUG=false"


