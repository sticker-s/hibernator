import mongoose, { Schema, Document } from 'mongoose';

// 1\. Candidate Model 
export interface ICandidate extends Document {
    id: string;
    full_name?: string;
    primary_email?: string;
    location?: string;
    current_org?: string;
    craftsmanship_score: number;
    hibernation_index: number;
    identities: {
        platform: string;
        handle: string;
        profile_url?: string;
    }[];
    created_at: Date;
}

const CandidateSchema = new Schema<ICandidate>({
    id: { type: String, required: true, unique: true },
    full_name: { type: String },
    primary_email: { type: String },
    location: { type: String },
    current_org: { type: String },
    craftsmanship_score: { type: Number, default: 0.0 },
    hibernation_index: { type: Number, default: 0.0 },
    identities: [
        {
            platform: { type: String, required: true },
            handle: { type: String, required: true },
            profile_url: { type: String }
        }
    ],
    created_at: { type: Date, default: Date.now }
});

export const Candidate = mongoose.model<ICandidate>('Candidate', CandidateSchema);

export interface ITechnicalArtifact extends Document {
    id: string;
    candidate_id: string;
    artifact_type: string;
    title: string;
    summary?: string;
    url?: string;
    embedding: number[];
    raw_metadata: Record<string, any>;
    created_at: Date;
}

const TechnicalArtifactSchema = new Schema<ITechnicalArtifact>({
    id: { type: String, required: true, unique: true },
    candidate_id: { type: String, required: true, ref: 'Candidate' },
    artifact_type: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String },
    url: { type: String },
    embedding: { type: [Number], default: [] },
    raw_metadata: { type: Schema.Types.Mixed },
    created_at: { type: Date, default: Date.now }
});

export const TechnicalArtifact = mongoose.model<ITechnicalArtifact>('TechnicalArtifact', TechnicalArtifactSchema);

export interface ICampaign extends Document {
    id: string;
    title: string;
    target_role: string;
    tone_profile: string;
    created_at: Date;
}

const CampaignSchema = new Schema<ICampaign>({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    target_role: { type: String, required: true },
    tone_profile: { type: String, default: 'engineer-to-engineer' },
    created_at: { type: Date, default: Date.now }
});

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);

export interface IOutreachLog extends Document {
    id: string;
    campaign_id: string;
    candidate_id: string;
    status: string;
    email_subject?: string;
    email_body?: string;
    sent_at?: Date;
}

const OutreachLogSchema = new Schema<IOutreachLog>({
    id: { type: String, required: true, unique: true },
    campaign_id: { type: String, required: true, ref: 'Campaign' },
    candidate_id: { type: String, required: true, ref: 'Candidate' },
    status: { type: String, default: 'drafted' },
    email_subject: { type: String },
    email_body: { type: String },
    sent_at: { type: Date }
});

export const OutreachLog = mongoose.model<IOutreachLog>('OutreachLog', OutreachLogSchema);