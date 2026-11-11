from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Campaign, OutreachLog
from app.services.outreach_service import generate_personalized_outreach

router = APIRouter(prefix="/campaigns", tags=["Campaigns & Outreach"])

@router.post("/")
def create_campaign(title : str, target_role: str, tone_profile: str = "engineer-to-engineer", db: Session= Depends(get_db)):

    campaign_id = f"camp_{hash(title) % 1000000}"
    campaign = Campaign(
        id = campaign_id,
        title = title,
        target_role = target_role,
        tone_profile = tone_profile
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign

@router.get("/")
def list_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).all()

@router.post("/{campaign_id}/generate-outreach/{candidate_id}")
def generate_candidate_outreach(campaign_id : str, candidate_id: str, db: Session = Depends(get_db)):

    outreach = generate_personalized_outreach(db, campaign_id, candidate_id)
    if not outreach:
        raise HTTPException(status_code=404, detail="Campaign or Candidate not found")

    return{
        "message" : "Outreach draft generated successfully",
        "outreach" : {
            "id": outreach.id,
            "campaign_id" : outreach.campaign_id,
            "candidate_id" : outreach.candidate_id,
            "subject" : outreach.email_subject,
            "body" : outreach.email_body,
            "status" : outreach.status
        }
    }

@router.get("/{campaign_id}/outreach-logs")
def get_campaign_outreach_logs(campaign_id: str, db: Session = Depends(get_db)):
    return db.query(OutreachLog).filter(OutreachLog.campaign_id == campaign_id).all()

