import { Router, Request, Response } from 'express';
import { Candidate, TechnicalArtifact } from '../models/index.js';
import { fetchGitHubUser, saveCandidateFromGitHub } from '../services/githubService.js';
import { generateEmbedding } from '../services/aiService.js';

const router = Router();

// 1. Ingest GitHub Candidate
router.post('/import/github/:username', async (req: Request, res: Response) => {
    try {
        const rawParam = req.params.username;
        const username: string = Array.isArray(rawParam) ? rawParam[0] : (rawParam as string);

        if (!username) {
            return res.status(400).json({ detail: 'Username is required' });
        }

        const data = await fetchGitHubUser(username);
        if (!data) {
            return res.status(404).json({ detail: 'GitHub user not found' });
        }

        const candidate = await saveCandidateFromGitHub(data);
        return res.json({
            message: `Successfully imported and evaluated candidate ${username}`,
            candidate: {
                id: candidate.id,
                name: candidate.full_name,
                craftsmanship_score: candidate.craftsmanship_score,
                hibernation_index: candidate.hibernation_index,
                location: candidate.location,
                company: candidate.current_org
            }
        });
    } catch (err: any) {
        console.error('❌ Import error:', err);
        return res.status(500).json({ detail: err.message || 'Failed to import candidate' });
    }

});

// 2. list all candidates
router.get('/', async (_req: Request, res: Response) => {
    try {
        const candidates = await Candidate.find().sort({ created_at: -1 });
        return res.json(candidates);
    } catch (err: any) {
        console.error('❌ List candidates error:', err);
        return res.status(500).json({ detail: 'Failed to fetch candidates' });
    }
});

// 3. vector semantic search
function euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

router.get('/search/semantic', async (req: Request, res: Response) => {
    try {
        const query = (req.query.query as string) || '';
        const limit = parseInt((req.query.limit as string) || '5', 10);

        const queryVector = await generateEmbedding(query);
        const artifacts = await TechnicalArtifact.find({ embedding: { $exists: true, $not: { $size: 0 } } });

        const scored = artifacts.map((art) => ({
            art,
            dist: euclideanDistance(art.embedding, queryVector)
        }));

        scored.sort((a, b) => a.dist - b.dist);
        const topMatches = scored.slice(0, limit);

        const results = await Promise.all(
            topMatches.map(async ({ art }) => {
                const candidate = await Candidate.findOne({ id: art.candidate_id });
                return {
                    artifact_id: art.id,
                    title: art.title,
                    summary: art.summary,
                    url: art.url,
                    artifact_type: art.artifact_type,
                    candidate_id: art.candidate_id,
                    candidate_name: candidate?.full_name || 'Unknown',
                    candidate_org: candidate?.current_org || null,
                    candidate_location: candidate?.location || null,
                    craftsmanship_score: candidate?.craftsmanship_score || 0,
                    hibernation_index: candidate?.hibernation_index || 0
                };
            })
        );
        return res.json(results);
    }
    catch (err: any) {
        console.error('❌ Semantic search error:', err);
        return res.status(500).json({ detail: err.message || 'Failed to execute vector search' });
    }
});

export default router;