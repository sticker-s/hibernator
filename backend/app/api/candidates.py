from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.services.github_service import fetch_github_user, save_candidate_from_github
from app.services.ai_service import generate_embedding
from app.models.models import Candidate, TechnicalArtifact

router = APIRouter(prefix="/candidates", tags=["Candidates"])

@router.post("/import/github/{username}")
async def import_github_candidate(username: str, db: Session = Depends(get_db)):
    data = await fetch_github_user(username)
    if not data:
        raise HTTPException(status_code = 404, detail = "GitHub user not found")

    candidate = save_candidate_from_github(db, data)
    return{
        "message": f"Successfully imported and evaluated candidate {username}",
        "candidate": {
            "id": candidate.id,
            "name": candidate.full_name,
            "craftsmanship_score": candidate.craftsmanship_score,
            "hibernation_index": candidate.hibernation_index,
            "location": candidate.location,
            "company": candidate.current_org
        }
    }

@router.get("/")
def list_candidates(db: Session = Depends(get_db)):
    return db.query(Candidate).all()

@router.get("/search/semantic")
def search_candidate_by_skill(query: str, limit: int = 5, db: Session = Depends(get_db)):
    query_vector = generate_embedding(query)    

    results = db.query(TechnicalArtifact).order_by(
        TechnicalArtifact.embedding.l2_distance(query_vector)
    ).limit(limit).all()

    return [
        {
            "artifact_id": art.id,
            "title": art.title,
            "summary": art.summary,
            "url": art.url,
            "candidate_id": art.candidate_id
        }
        for art in results
    ]