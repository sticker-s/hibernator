from fastapi import FastAPI
from app.core.database import init_db
from app.api.candidates import router as candidate_router

app = FastAPI(title="Hibernator Intelligence Engine")

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(candidate_router)

@app.get("/")
def read_root():
    return {"status": "online", "system": "Hibernator API running"}