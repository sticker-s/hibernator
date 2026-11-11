import httpx 
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Candidate, Identity, TechnicalArtifact
from app.services.ai_service import evaluate_candidate_craftsmanship, generate_embedding

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

    ai_evaluaion = evaluate_candidate_craftsmanship(repos)
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        candidate = Candidate(
            id = candidate_id,
            full_name = profile.get("name") or profile.get("login"),
            primary_email = profile.get("email"),
            location = profile.get("location"),
            current_org = profile.get("company"),
            craftsmanship_score = ai_evaluaion["craftsmanship_score"],
            hibernation_index = ai_evaluaion["hibernation_index"]
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
    else:
        candidate.craftsmanship_score = ai_evaluaion["craftsmanship_score"]
        candidate.hibernation_index = ai_evaluaion["hibernation_index"]

    for repo in repos:
        artifact_id = f"repo_{repo['id']}"
        existing_art = db.query(TechnicalArtifact).filter(TechnicalArtifact.id == artifact_id).first()

        summary_text = repo.get("description") or f"Public repo {repo['name']} written in {repo.get('language', 'code')}"
        text_to_embed = f"{repo['name']}: {summary_text}"
        embedding_vector = generate_embedding(text_to_embed)

        if not existing_art:
            artifact = TechnicalArtifact(
                id = artifact_id,
                candidate_id = candidate.id,
                artifact_type = "repository",
                title = repo["name"],
                summary = summary_text,
                url = repo["html_url"],
                embedding = embedding_vector,
                raw_metadata = {
                    "stars": repo.get("stargazers_count", 0),
                    "language": repo.get("language"),
                    "forks": repo.get("forks_count", 0)
                }
            )
            db.add(artifact)
        else:
            # Update embedding and summary for existing artifacts
            existing_art.summary = summary_text
            existing_art.embedding = embedding_vector
            
    db.commit()
    db.refresh(candidate)
    return candidate