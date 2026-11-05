import json
import numpy as np
from openai import OpenAI
from app.core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

def generate_embedding(text: str) -> list[float]:
    """ generate a vector embedding for semantic search"""
    if not client or not settings.OPENAI_API_KEY:
        np.random.seed(abs(hash(text)) % (2**32))
        return np.random.uniform(-1, 1, 384).tolist()

    try:
        repsonse = client.embeddings.create(
            model = "text-embedding-3small",
            input=text
        )
        return repsonse.data[0].embedding[:384]
    except Exception:
        np.random.seed(abs(hash(text)) % (2**32))
        return np.random.uniform(-1, 1, 384).tolist()

def evaluate_candidate_craftsmanship(repos: list[dict]) -> dict:
    # use llm to score craftsmanship and hibernation
    if not client or not settings.OPENAI_API_KEY:
        return {
            "craftsmanship_score": 78.5,
            "hibernation_index": 45.0,
            "summary": "Candidiate porfile imported with public repos"
        }
    
    repo_summary = "\n".join([
        f"- {r.get('name')}: {r.get('description', 'No description')} (Language: {r.get('Language')}, Stars: {r.get('stargazers_count', 0)})"
        for r in repos
    ])

    prompt = f"""
    You are an expert AI Talent Auditor. Analyze the following GitHub repositories of a software engineer:
    
    {repo_summary}

    Return a valid JSON object with the following keys:
    1. "craftsmanship_score": Float between 0.0 and 100.0 based on project complexity, tech stack, and documentation quality.
    2. "hibernation_index": Float between 0.0 and 100.0 (Higher score means candidate has deep technical skill but low social noise/activity). 
    3. "summary": A concise 2-sentence technical evaluation of the candidate.
    
    Return ONLY raw JSON with no extra commentary or markdown.
    """

    try: 
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )
        content = response.choices[0].message.content.strip()
        return json.loads(content)
    except Exception:
        return {
            "craftsmanship_score": 75.0,
            "hibernation_index": 30.0,
            "summary": "Standard github progile evaluation."
        }