import json
import hashlib
import struct
from google import genai
from google.genai import types
from app.core.config import settings

# Initialize Gemini client
_gemini_client = None
if settings.GEMINI_API_KEY:
    try:
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception as _e:
        print(f"⚠️ Could not initialize Gemini client: {_e}")


def _sha256_fallback_embedding(text: str) -> list[float]:
    """Deterministic 384-dim fallback vector from text SHA-256."""
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    repeats = (384 * 4) // len(digest) + 1
    expanded = (digest * repeats)[: 384 * 4]
    ints = struct.unpack(f"{384}I", expanded)
    max_uint = 2 ** 32 - 1
    return [i / max_uint for i in ints]


def generate_embedding(text: str) -> list[float]:
    """Generate a 384-dim semantic embedding for pgvector.
    Uses Gemini embedding models (gemini-embedding-001 / gemini-embedding-2).
    """
    if not text or not text.strip():
        return [0.0] * 384

    if _gemini_client and settings.GEMINI_API_KEY:
        for model_name in ["gemini-embedding-001", "gemini-embedding-2"]:
            try:
                response = _gemini_client.models.embed_content(
                    model=model_name,
                    contents=text,
                    config=types.EmbedContentConfig(output_dimensionality=384)
                )
                if hasattr(response, "embeddings") and response.embeddings:
                    values = response.embeddings[0].values
                    if len(values) >= 384:
                        return values[:384]
                    return values + [0.0] * (384 - len(values))
                if hasattr(response, "embedding") and response.embedding:
                    values = response.embedding.values
                    if len(values) >= 384:
                        return values[:384]
                    return values + [0.0] * (384 - len(values))
            except Exception as e:
                print(f"⚠️ Gemini Embedding Error ({model_name}): {e}")

    # Fallback if API key is missing or calls failed
    return _sha256_fallback_embedding(text)


def evaluate_candidate_craftsmanship(repos: list[dict]) -> dict:
    """Use Gemini to score craftsmanship and hibernation index."""
    if not _gemini_client or not settings.GEMINI_API_KEY:
        print("⚠️ GEMINI KEY MISSING. Returning baseline scores (75.0 / 30.0).")
        return {
            "craftsmanship_score": 75.0,
            "hibernation_index": 30.0,
            "summary": "Standard profile evaluation."
        }

    repo_summary = "\n".join([
        f"- {r.get('name')}: {r.get('description', 'No description')} "
        f"(Language: {r.get('language')}, Stars: {r.get('stargazers_count', 0)})"
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

    for model_name in ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]:
        try:
            response = _gemini_client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"❌ Gemini Evaluation Error ({model_name}): {e}")

    return {
        "craftsmanship_score": 75.0,
        "hibernation_index": 30.0,
        "summary": "Standard profile fallback."
    }
