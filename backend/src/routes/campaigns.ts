import { Router, Request, Response } from 'express';
import { Campaign, Candidate, TechnicalArtifact, OutreachLog } from '../models/index.js';
import { GoogleGenAI } from '@google/genai';

const router = Router();
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// 1. create campaign
router.post('/', async (req: Request, res: Response) => {
    const titleVal = req.body?.title || req.query.title;
    const targetRoleVal = req.body?.target_role || req.query.target_role;
    const toneProfileVal = req.body?.tone_profile || req.query.tone_profile;
    // Ensure plain string values 
    const campTitle = typeof titleVal === 'string' && titleVal.trim() ? titleVal.trim() : 'General Sourcing';
    const targetRole = typeof targetRoleVal === 'string' && targetRoleVal.trim() ? targetRoleVal.trim() : 'Senior Software Engineer';
    const toneProfile = typeof toneProfileVal === 'string' && toneProfileVal.trim() ? toneProfileVal.trim() : 'engineer-to-engineer';

    const campaignId = `camp_${Math.abs(campTitle.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 1000000}`;
    const campaign = await Campaign.findOneAndUpdate(
        { id: campaignId },
        {
            id: campaignId,
            title: campTitle,
            target_role: targetRole,
            tone_profile: toneProfile
        },
        { upsert: true, returnDocument: 'after' }
    );
    return res.json(campaign);
});

// 2. list all campaigns
router.get('/', async (_req: Request, res: Response) => {
    const campaigns = await Campaign.find();
    return res.json(campaigns);
});

// 3. generate Candidate outreach
router.post('/:campaign_id/generate-outreach/:candidate_id', async (req: Request, res: Response) => {
    const rawCampId = req.params.campaign_id;
    const rawCandId = req.params.candidate_id;

    const campaign_id = Array.isArray(rawCampId) ? rawCampId[0] : (rawCampId as string);
    const candidate_id = Array.isArray(rawCandId) ? rawCandId[0] : (rawCandId as string);
    if (!campaign_id || !candidate_id) {
        return res.status(400).json({ detail: 'Campaign ID and Candidate ID are required' });
    }

    const candidate = await Candidate.findOne({ id: candidate_id });
    const campaign = await Campaign.findOne({ id: campaign_id });
    if (!candidate || !campaign) {
        return res.status(404).json({ detail: 'Campaign or Candidate not found' });
    }

    const artifacts = await TechnicalArtifact.find({ candidate_id });
    const artifactDetails = artifacts
        .map((a) => `- Repository: ${a.title} | Summary: ${a.summary} | URL: ${a.url || '#'}`)
        .join('\n');

    const defaultRepoTitle = artifacts.length > 0 && artifacts[0].title ? artifacts[0].title : 'open source';
    let subject = `Connecting regarding work on ${defaultRepoTitle}`;
    let body = `Hi ${candidate.full_name || 'there'},\n\nI was reviewing your technical artifacts and would love to chat about ${campaign.target_role} opportunities.`;

    if (ai) {
        const prompt = `
        You are a Principal Engineer reaching out to a passive developer on behalf of a tech team. 
        Campaign Target Role: ${campaign.target_role} 
        Tone Profile: ${campaign.tone_profile} 
        Candidate Name: ${candidate.full_name || 'Engineer'} 
        Craftsmanship Score: ${candidate.craftsmanship_score}/100 
        Technical Repositories: ${artifactDetails || 'General open source developer.'}
        
        Draft a brief, highly personalized, engineer-to-engineer email referencing specific repositories. 
        Return ONLY a JSON object with keys: "subject" and "body".
        `;
        for (const model of ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-1.5-flash']) {
            try {
                const resp = await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: { responseMimeType: 'application/json' }
                });
                if (resp.text) {
                    const parsed = JSON.parse(resp.text);
                    subject = parsed.subject || subject;
                    body = parsed.body || body;
                    break;
                }
            } catch (err: any) {
                console.warn('⚠️ Outreach generation error:', err.message);
            }
        }
    }
    const outreachId = `out_${campaign_id}_${candidate_id}`;
    const outreach = await OutreachLog.findOneAndUpdate(
        { id: outreachId },
        {
            id: outreachId,
            campaign_id,
            candidate_id,
            status: 'drafted',
            email_subject: subject,
            email_body: body
        },
        { upsert: true, returnDocument: 'after' }
    );

    return res.json({
        message: 'Outreach draft generated successfully',
        outreach: {
            id: outreach.id,
            campaign_id: outreach.campaign_id,
            candidate_id: outreach.candidate_id,
            subject: outreach.email_subject,
            body: outreach.email_body,
            status: outreach.status
        }
    });
});

// 4. Get Campaign Outreach Logs 
router.get('/:campaign_id/outreach-logs', async (req: Request, res: Response) => {
    const rawCampId = req.params.campaign_id;
    const campaign_id = Array.isArray(rawCampId) ? rawCampId[0] : (rawCampId as string);
    const logs = await OutreachLog.find({ campaign_id });
    return res.json(logs);
});

export default router;