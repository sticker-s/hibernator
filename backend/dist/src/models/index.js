import mongoose, { Schema } from 'mongoose';
const CandidateSchema = new Schema({
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
export const Candidate = mongoose.model('Candidate', CandidateSchema);
const TechnicalArtifactSchema = new Schema({
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
export const TechnicalArtifact = mongoose.model('TechnicalArtifact', TechnicalArtifactSchema);
const CampaignSchema = new Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    target_role: { type: String, required: true },
    tone_profile: { type: String, default: 'engineer-to-engineer' },
    created_at: { type: Date, default: Date.now }
});
export const Campaign = mongoose.model('Campaign', CampaignSchema);
const OutreachLogSchema = new Schema({
    id: { type: String, required: true, unique: true },
    campaign_id: { type: String, required: true, ref: 'Campaign' },
    candidate_id: { type: String, required: true, ref: 'Candidate' },
    status: { type: String, default: 'drafted' },
    email_subject: { type: String },
    email_body: { type: String },
    sent_at: { type: Date }
});
export const OutreachLog = mongoose.model('OutreachLog', OutreachLogSchema);
