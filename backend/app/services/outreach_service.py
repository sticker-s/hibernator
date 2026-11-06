from sqlalchemy.sql.functions import mode
import json
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Candidate, Campaign, TechnicalArtifact, OutreachLog
from app.services.ai_service import client

def generate_personalized_outreach(db: Session, campaign_id: str, candidate_id: str) -> OutreachLog:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()

    if not candidate or not campaign:
        return None
    
    artifacts = db.query(TechnicalArtifact).filter(TechnicalArtifact.candidate_id == candidate_id).all()
    artifact_details = "\n".join([
        f"- Repository: {a.title} | Summary: {a.summary} | URL: {a.url}"
        for a in artifacts
    ])

    if client and settings.OPENAI_API_KEY:
        prompt = f"""
        You are a Principal Engineer reaching out to a passive developer on behalf of a tech team.
        
        Campaign Target Role: {campaign.target_role}
        Tone Profile: {campaign.tone_profile}

        Candidate Name: {candidate.full_name or "Engineer"}
        Craftsmanship Score: {candidate.craftsmanship_score}/100
        Hibernation Index: {candidate.hibernation_index}/100

        Candidate Technical Repositories &amp; Artifacts: 
        {artifact_details or "General open-source contribution profile."}

        Task:
        Draft a brief, highly personalized, engineer-to-engineer email.
        - Reference AT LEAST ONE specific repository/artifact title and why their work caught your attention. 
        - Avoid recruiter buzzwords, corporate fluff, or aggressive sales pitches. 
        - Speak developer-to-developer with low friction.

        Return ONLY a JSON object with keys: 
        1. "subject": String 
        2. "body": String
        """

        try: 
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            data = json.loads(response.choices.message.content.strip())
            subject = data.get("subject", f"Impressive work on {artifacts[0].title if artifacts else 'your open source repos'}")
            body = data.get("body", "Hi, saw your work and would love to connect")
        except Exception:
            subject = f"Connecting regarding work on {artifacts[0].title if artifacts else 'open source'}"
            body = f"Hi {candidate.full_name or 'there'},\n\nI noticed your recent projects on GitHub and wanted to reach out regarding our {campaign.target_role} role."
    else:
        subject = f"Connecting regarding work on {artifacts[0].title if artifacts else 'open source'}"
        body = f"Hi {candidate.full_name or 'there'},\n\nI was reviewing your technical artifacts and would love to chat about {campaign.target_role} opportunities."

    outreach = OutreachLog(
        id = f"out_{campaign_id}_{candidate_id}",
        campaign_id=campaign_id,
        candidate_id=candidate_id,
        status="drafted",
        email_subject=subject,
        email_body=body
    )
    db.add(outreach)
    db.commit()
    db.refresh(outreach)
    return outreach