import axios from "axios";

const API_BASE_URL = 'http://localhost:8000';

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

export const CandidateService = {
    async getAll(): Promise<Candidate[]> {
        const res = await api.get('/candidates/');
        return res.data;
    },

    async importGitHub(username: string) {
        const res = await api.post(`/candidates/import/github/${username}`);
        return res.data;
    },

    async semanticSearch(query: string) {
        const res = await api.get(`/candidates/search/semantic?query=${encodeURIComponent(query)}`);
        return res.data;
    },
};