from fastapi import FastAPI
from app.core.database import init_db

app = FastAPI(title="Hibernator Intelligence Engine")

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def read_root():
    return {"status": "online", "system": "Hibernator API running"}