import axios from 'axios';
import { Candidate, TechnicalArtifact } from '../models/index.js';
import { evaluateCandidateCraftsmanship, generateEmbedding } from './aiService.js';
import { profile } from 'node:console';
import { array } from 'node:stream/iter';

const GITHUB_API_BASE = 'https://api.github.com';

export async function fetchGitHubUser(username: string) {
    const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    try {
        const userRes = await axios.get(`${GITHUB_API_BASE}/users/${username}`, { headers });
        const reposRes = await axios.get(`${GITHUB_API_BASE}/users/${username}/repos?sort=updated&per_page=5`, { headers });

        return {
            profile: userRes.data,
            repos: Array.isArray(reposRes.data) ? reposRes.data : []
        };
    } catch (err) {
        return null;
    }
}

export async function saveCandidateFromGitHub(githubData: any) {
    const { profile, repos } = githubData;
    const candidateId = `gh_${profile.id}`;
    const aiEval = await evaluateCandidateCraftsmanship(repos);

    let candidate = await Candidate.findOne({ id: candidateId });
    if (!candidate) {
        candidate = new Candidate({
            id: candidateId,
            full_name: profile.name || profile.login,
            primary_email: profile.email,
            location: profile.location,
            current_org: profile.company,
            craftsmanship_score: aiEval.craftsmanship_score,
            hibernation_index: aiEval.hibernation_index,
            identities: [
                {
                    platform: 'github',
                    handle: profile.login,
                    profile_url: profile.html_url
                }
            ]
        });
        await candidate.save();
    } else {
        candidate.craftsmanship_score = aiEval.craftsmanship_score;
        candidate.hibernation_index = aiEval.hibernation_index;
        await candidate.save();
    }

    for (const repo of repos) {
        const artifactId = `repo_${repo.id}`;
        const summaryText = repo.description || `Public repo ${repo.name} written in ${repo.language || 'code'}`;
        const textToEmbed = `${repo.name}: ${summaryText}`;
        const embedding = await generateEmbedding(textToEmbed);

        await TechnicalArtifact.findOneAndUpdate(
            { id: artifactId },
            {
                id: artifactId,
                candidate_id: candidate.id,
                artifact_type: 'repository',
                title: repo.name,
                summary: summaryText,
                url: repo.html_url,
                embedding,
                raw_metadata: {
                    stars: repo.stargazers_count || 0,
                    language: repo.language,
                    forks: repo.forks_count || 0
                }
            },
            { upsert: true, new: true }
        );
    }
    return candidate;
}   