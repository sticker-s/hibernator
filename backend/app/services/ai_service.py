import json
from google import genai
from google.genai import types
from app.core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

def generate_embedding(text: str) -> list[float]:
    """ generate a 384-dim vector embedding using gemini text-embedding for semantic search"""
    if not client or not settings.GEMINI_API_KEY:
        return [0.0] * 384
    try:
        repsonse = client.models.embed_content(
            model = "text-embedding-004",
            contents=text,
            config=types.EmbedContentConfig(
                outputDimensionality=384
            )
        )
        return repsonse.embeddings.values
    except Exception as e:
        print(f"⚠️ gemini Embedding Error: {e}")
        return [0.0] * 384

def evaluate_candidate_craftsmanship(repos: list[dict]) -> dict:
    # use gemini flash to score craftsmanship and hibernation
    if not client or not settings.GEMINI_API_KEY:
        print("⚠️ GEMINI kEY MISSING. Returning baseline scores (75.0 / 30.0).")
        return {
            "craftsmanship_score": 75.0,
            "hibernation_index": 30.0,
            "summary": "Standard profile evaluation."
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
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"❌ Gemini Evaluation Error: {e}")
        return {
            "craftsmanship_score": 75.0,
            "hibernation_index": 30.0,
            "summary": "Standard profile fallback."
        }