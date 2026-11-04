import httpx 
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Candidate, Identity, TechnicalArtifact

GITHUB_API_BASE = "https://api.github.com"

async def fetch_github_user(username: str):
    headers = {
        "Accept": "application/vnd.github.v3+json"
    }
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"
    
    async with httpx.AsyncClient() as client:
        user_res = await client.get(f"{GITHUB_API_BASE}/users/{username}", headers=headers)
        if user_res.status_code != 200:
            return None
        user_data = user_res.json()

        repos_res = await client.get(f"{GITHUB_API_BASE}/users/{username}/repos?sort=updated&per_page=5", headers=headers)
        repos_data = repos_res.json() if repos_res.status_code == 200 else []

        return {
            "profile": user_data,
            "repos": repos_data
        }

def save_candidate_from_github(db: Session, github_data: dict):
    profile = github_data["profile"]
    repos = github_data["repos"]

    candidate_id = f"gh_{profile['id']}"

    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        candidate = Candidate(
            id = candidate_id,
            full_name = profile.get("name") or profile.get("login"),
            primary_email = profile.get("email"),
            location = profile.get("location"),
            current_org = profile.get("company"),
            craftsmanship_score = 75.0,
            hibernation_index = 20.0
        )
        db.add(candidate)
        db.flush()
        
        identity = Identity(
            id = f"id_gh_{profile['id']}",
            candidate_id = candidate.id,
            platform = "github",
            handle = profile["login"],
            profile_url = profile["html_url"]
        )
        db.add(identity)
    for repo in repos:
        artifact_id = f"repo_{repo['id']}"
        existing_art = db.query(TechnicalArtifact).filter(TechnicalArtifact.id == artifact_id).first()
        if not existing_art:
            artifact = TechnicalArtifact(
                id = artifact_id,
                candidate_id = candidate.id,
                artifact_type = "repository",
                title = repo["name"],
                summary = repo.get("description") or "Public Repository",
                url = repo["html_url"],
                raw_metadata = {
                    "stars": repo.get("stargazers_count", 0),
                    "language": repo.get("language"),
                    "forks": repo.get("forks_count", 0)
                }
            )
            db.add(artifact)
            
    db.commit()
    db.refresh(candidate)
    return candidate