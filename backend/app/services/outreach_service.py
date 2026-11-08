import json
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Candidate, Campaign, TechnicalArtifact, OutreachLog

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
    
    default_repo_title = artifacts.title if artifacts else 'open source'
    subject = f"Connecting regarding work on {default_repo_title}"
    body = f"Hi {candidate.full_name or 'there'},\n\nI was reviewing your technical artifacts and would love to chat about {campaign.target_role} opportunities."
    if settings.GEMINI_API_KEY:
        try:
            client = genai.Client(
                api_key=settings.GEMINI_API_KEY,
                http_options={"api_version": "v1beta"}
            )
            prompt = f"""
            You are a Principal Engineer reaching out to a passive developer on behalf of a tech team.
            
            Campaign Target Role: {campaign.target_role}
            Tone Profile: {campaign.tone_profile}

            Candidate Name: {candidate.full_name or "Engineer"}
            Craftsmanship Score: {candidate.craftsmanship_score}/100

            Technical Repositories: 
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

            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            data = json.loads(response.text)
            subject = data.get("subject",subject )
            body = data.get("body",body)
        except Exception as e:
            print(f" Gemini Outreach error: {e}")

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