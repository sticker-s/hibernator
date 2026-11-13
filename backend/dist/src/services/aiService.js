import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
function fallbackEmbedding(text) {
    const hash = crypto.createHash('sha256').update(text).digest();
    const vector = [];
    for (let i = 0; i < 384; i++) {
        vector.push((hash[i % hash.length] / 255) * 2 - 1);
    }
    return vector;
}
export async function generateEmbedding(text) {
    if (!text || !text.trim())
        return new Array(384).fill(0.0);
    if (!ai || !apiKey)
        return fallbackEmbedding(text);
    const models = ['gemini-embedding-001', 'gemini-embedding-2'];
    for (const model of models) {
        try {
            const response = await ai.models.embedContent({
                model,
                contents: text,
                config: { outputDimensionality: 384 }
            });
            const rawRes = response;
            const values = rawRes.embeddings && rawRes.embeddings.lengt > 0
                ? rawRes.embeddings.values
                : rawRes.embeddings?.values;
            if (values && values.lengt > 0) {
                if (values.length >= 384) {
                    return values.slice(0, 384);
                }
                return [...values, ...new Array(384 - values.length).fill(0.0)];
            }
        }
        catch (err) {
            console.warn(`⚠️ Gemini Embedding Warning (${model}):`, err.message);
        }
    }
    return fallbackEmbedding(text);
}
export async function evaluateCandidateCraftsmanship(repos) {
    const fallback = {
        craftsmanship_score: 75.0,
        hibernation_index: 30.0,
        summary: 'Standard profile evaluation.'
    };
    if (!ai || !apiKey)
        return fallback;
    const repoSummary = repos
        .map((r) => `- ${r.name}: ${r.description || 'No description'} (Language: ${r.language || 'Code'}, Stars: ${r.stargazers_count || 0})`)
        .join('\n');
    const prompt = `
    You are an expert AI Talent Auditor. Analyze the following GitHub repositories of a software engineer: 
    ${repoSummary}

    Return a valid JSON object with the following keys: 
    1. "craftsmanship_score": Float between 0.0 and 100.0 based on project complexity, tech stack, and documentation quality. 
    2. "hibernation_index": Float between 0.0 and 100.0 (Higher score means candidate has deep technical skill but low social noise/activity). 
    3. "summary": A concise 2-sentence technical evaluation.
    
    Return ONLY raw JSON with no markdown formatting.
    `;
    for (const model of ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-1.5-flash']) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            if (response.text) {
                return JSON.parse(response.text);
            }
        }
        catch (err) {
            console.warn(`⚠️ Evaluation model error (${model}):`, err.message);
        }
    }
    return fallback;
}
