import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
});

export interface Candidate {
    id: string;
    full_name: string;
    primary_email?: string;
    location?: string;
    current_org?: string;
    craftsmanship_score: number;
    hibernation_index: number;
    created_at: string;
}

export interface SearchResult {
    artifact_id: string;
    title: string;
    summary: string;
    url: string;
    artifact_type: string;
    candidate_id: string;
    candidate_name: string;
    candidate_org?: string;
    candidate_location?: string;
    craftsmanship_score: number;
    hibernation_index: number;
}

export interface Campaign {
    id: string;
    title: string;
    target_role: string;
    tone_profile: string;
    created_at: string;
}

export interface OutreachLog {
    id: string;
    campaign_id: string;
    candidate_id: string;
    status: string;
    email_subject?: string;
    email_body?: string;
    sent_at?: string;
}

export interface GeneratedOutreach {
    message: string;
    outreach: {
        id: string;
        campaign_id: string;
        candidate_id: string;
        subject: string;
        body: string;
        status: string;
    };
}

export const CandidateService = {
    async getAll(): Promise<Candidate[]> {
        const res = await api.get('/candidates/');
        return res.data;
    },

    async importGitHub(username: string) {
        const res = await api.post(`/candidates/import/github/${username}`);
        return res.data;
    },

    async semanticSearch(query: string, limit = 5): Promise<SearchResult[]> {
        const res = await api.get(`/candidates/search/semantic`, {
            params: { query, limit }
        });
        return res.data;
    },
};


export const CampaignService = {
    async getAll(): Promise<Campaign[]> {
        const res = await api.get('/campaigns/');
        return res.data;
    },

    async create(title: string, target_role: string, tone_profile = 'engineer-to-engineer'): Promise<Campaign> {
        const res = await api.post('/campaigns/', { title, target_role, tone_profile }, {
            params: { title, target_role, tone_profile }
        });
        return res.data;
    },

    async generateOutreach(campaign_id: string, candidate_id: string): Promise<GeneratedOutreach> {
        const res = await api.post(`/campaigns/${campaign_id}/generate-outreach/${candidate_id}`);
        return res.data;
    },

    async getOutreachLogs(campaign_id: string): Promise<OutreachLog[]> {
        const res = await api.get(`/campaigns/${campaign_id}/outreach-logs`);
        return res.data;
    },
};
