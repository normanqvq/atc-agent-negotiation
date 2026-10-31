"""
The one endpoint the UI calls.

run:  uvicorn src.api:app --port 8000
UI:   cd ui && npm run dev   (vite forwards /api to :8000, so no CORS needed)

POST /api/run    {"pool_index": 7, "environment": {...6 dimensions...}} -> log (data/sample_log.json shape)
GET  /api/health {"ok": true}
"""
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from src.negotiation import run
from src.agents import ai_available

# reads ANTHROPIC_API_KEY from .env if there is one. no key = rule-based agents
load_dotenv()

app = FastAPI(title="Concord")


class RunRequest(BaseModel):
    pool_index: int
    environment: dict = {}


@app.get("/api/health")
def health():
    return {"ok": True, "ai_enabled": ai_available()}


# plain def (not async): FastAPI runs it in a thread, the agents block on the network
@app.post("/api/run")
def run_endpoint(req: RunRequest):
    try:
        return run(req.pool_index, req.environment)
    except ValueError as e:
        # unknown pool_index or environment value
        raise HTTPException(status_code=400, detail=str(e))
