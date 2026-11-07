from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
from app.api.candidates import router as candidate_router
from app.api.campaigns import router as campaign_router

app = FastAPI(title="Hibernator Intelligence Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(candidate_router)
app.include_router(campaign_router)

@app.get("/")
def read_root():
    return {"status": "online", "system": "Hibernator API running"}