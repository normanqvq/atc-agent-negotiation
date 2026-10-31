"""uvicorn src.api:app --port 8000; Vite proxies /api here."""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from src.negotiation import run, normalize_environment
from src.scenario import load_pool

app = FastAPI(title="Concord negotiation")


class RunRequest(BaseModel):
    pool_index: int = Field(strict=True)
    environment: dict[str, str] = Field(default_factory=dict)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/run")
def run_negotiation(request: RunRequest):
    # sync route runs in FastAPI's worker pool; SDK calls do not block the event loop.
    try:
        env = normalize_environment(request.environment)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if request.pool_index not in {f["pool_index"] for f in load_pool()}:
        raise HTTPException(status_code=422, detail="Unknown pool_index")
    return run(request.pool_index, env)
