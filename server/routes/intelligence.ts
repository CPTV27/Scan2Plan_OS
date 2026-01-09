import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  generateProposal,
  generateNegotiationBrief,
  generateMarketingContent,
  generateTargetedContent,
  getAllPersonas,
  getPersonaByCode,
  getAllVoices,
  getSolutionMappingsForPersona,
  getNegotiationPlaysForPersona,
  updateContentFeedback,
} from '../lib/intelligence_engine';

const router = Router();

const proposalSchema = z.object({
  buyerCode: z.string(),
  projectName: z.string(),
  projectType: z.string(),
  squareFootage: z.string(),
  timeline: z.string(),
  specialConditions: z.array(z.string()).optional(),
  scopeNotes: z.string().optional(),
});

const negotiationSchema = z.object({
  buyerCode: z.string(),
  objectionRaised: z.string(),
  projectContext: z.string().optional(),
  relationshipHistory: z.string().optional(),
});

const marketingSchema = z.object({
  buyerCode: z.string(),
  contentFormat: z.enum(['email_sequence', 'ad_copy', 'social_post', 'case_study', 'landing_page']),
  campaignTheme: z.string().optional(),
  specificAngle: z.string().optional(),
});

const contentSchema = z.object({
  buyerCode: z.string(),
  contentType: z.enum(['proposal', 'negotiation_brief', 'email', 'ad_copy', 'case_study', 'social']),
  projectContext: z.object({
    projectName: z.string().optional(),
    projectType: z.string().optional(),
    squareFootage: z.string().optional(),
    timeline: z.string().optional(),
    specialConditions: z.array(z.string()).optional(),
  }).optional(),
  specificRequest: z.string().optional(),
});

const feedbackSchema = z.object({
  qualityScore: z.number().min(1).max(5),
  wasUsed: z.boolean(),
});

router.get('/personas', async (_req: Request, res: Response) => {
  try {
    const personas = await getAllPersonas();
    res.json(personas);
  } catch (error) {
    console.error('Error fetching personas:', error);
    res.status(500).json({ error: 'Failed to fetch personas' });
  }
});

router.get('/personas/:code', async (req: Request, res: Response) => {
  try {
    const persona = await getPersonaByCode(req.params.code);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    res.json(persona);
  } catch (error) {
    console.error('Error fetching persona:', error);
    res.status(500).json({ error: 'Failed to fetch persona' });
  }
});

router.get('/personas/:code/solutions', async (req: Request, res: Response) => {
  try {
    const solutions = await getSolutionMappingsForPersona(req.params.code);
    res.json(solutions);
  } catch (error) {
    console.error('Error fetching solutions:', error);
    res.status(500).json({ error: 'Failed to fetch solutions' });
  }
});

router.get('/personas/:code/playbook', async (req: Request, res: Response) => {
  try {
    const plays = await getNegotiationPlaysForPersona(req.params.code);
    res.json(plays);
  } catch (error) {
    console.error('Error fetching playbook:', error);
    res.status(500).json({ error: 'Failed to fetch playbook' });
  }
});

router.get('/voices', async (_req: Request, res: Response) => {
  try {
    const voices = await getAllVoices();
    res.json(voices);
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

router.post('/generate/proposal', async (req: Request, res: Response) => {
  try {
    const validation = proposalSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error.errors });
    }

    const content = await generateProposal(validation.data);
    res.json({ content });
  } catch (error) {
    console.error('Proposal generation error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/generate/negotiation', async (req: Request, res: Response) => {
  try {
    const validation = negotiationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error.errors });
    }

    const content = await generateNegotiationBrief(validation.data);
    res.json({ content });
  } catch (error) {
    console.error('Negotiation generation error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/generate/marketing', async (req: Request, res: Response) => {
  try {
    const validation = marketingSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error.errors });
    }

    const content = await generateMarketingContent(validation.data);
    res.json({ content });
  } catch (error) {
    console.error('Marketing generation error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/generate/content', async (req: Request, res: Response) => {
  try {
    const validation = contentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error.errors });
    }

    const content = await generateTargetedContent(validation.data);
    res.json({ content });
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/content/:id/feedback', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    if (isNaN(contentId)) {
      return res.status(400).json({ error: 'Invalid content ID' });
    }

    const validation = feedbackSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error.errors });
    }

    await updateContentFeedback(contentId, validation.data.qualityScore, validation.data.wasUsed);
    res.json({ success: true });
  } catch (error) {
    console.error('Feedback update error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
