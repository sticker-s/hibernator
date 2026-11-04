from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.github_service import fetch_github_user, save_candidate_from_github
from app.models.models import Candidate

router = APIRouter(prefix="/candidates", tags=["Candidates"])

@router.post("/import/github/{username}")
async def import_github_candidate(username: str, db: Session = Depends(get_db)):
    data = await fetch_github_user(username)
    if not data:
        raise HTTPException(status_code = 404, detail = "GitHub user not found")

    candidate = save_candidate_from_github(db, data)
    return{
        "message": f"Successfully imported candidate {username}",
        "candidate": {
            "id": candidate.id,
            "name": candidate.full_name,
            "location": candidate.location,
            "company": candidate.current_org
        }
    }

@router.get("/")
def list_candidates(db: Session = Depends(get_db)):
    candidates = db.query(Candidate).all()
    return candidates