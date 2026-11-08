import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
from app.api.candidates import router as candidate_router
from app.api.campaigns import router as campaign_router

app = FastAPI(title="Hibernator Intelligence Engine")

# Build allowed origins list
default_origins = [
    "http://localhost:3000",
    "https://hibernator-frontend.vercel.app",
]
custom_origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]
allowed_origins = list(set(default_origins + custom_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
