import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AIService } from '../services/ai.service';
import { PreparednessPlan, SafetyAlert } from '../db/models';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validates that a route param is a valid MongoDB ObjectId.
 * Returns false and sends a 400 response if invalid.
 */
const validateObjectId = (id: string, res: Response): boolean => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid ID format' });
    return false;
  }
  return true;
};

/**
 * Escapes special regex characters from user-supplied strings
 * to prevent ReDoS injection attacks.
 */
const escapeRegex = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── Zod Validation Schemas ───────────────────────────────────────────────────

const CreatePlanSchema = z.object({
  profileName: z.string().min(2, 'Profile name must be at least 2 characters').max(80, 'Profile name too long'),
  location: z.string().min(2, 'Location is required').max(100, 'Location too long'),
  householdSize: z.number().int().min(1, 'Household size must be at least 1').max(30, 'Unreasonably large household size'),
  buildingType: z.enum(['ground_floor', 'high_rise', 'independent']),
  vulnerabilities: z.array(z.string().max(60)).max(20),
  members: z.array(z.object({
    name: z.string().min(1).max(60),
    age: z.number().int().min(0).max(120),
    gender: z.string().max(20),
    vulnerabilities: z.array(z.string().max(60)).max(10)
  })).max(30).default([]),
  language: z.string().max(30).default('English')
});

const ChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.string().max(2000)
  })).max(50).default([]),
  language: z.string().max(30).default('English')
});

const TravelSchema = z.object({
  origin: z.string().min(2, 'Origin location is required').max(100),
  destination: z.string().min(2, 'Destination location is required').max(100),
  mode: z.string().max(30).default('driving')
});

const ChecklistUpdateSchema = z.object({
  itemId: z.string().min(1).max(50),
  completed: z.boolean(),
  quantity: z.string().max(50).optional().default('0')
});

// ─── Validation Middleware ────────────────────────────────────────────────────

const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
    return;
  }
  req.body = result.data; // Use coerced/defaulted values
  next();
};

// ─── POST /plan — Create new preparedness plan ────────────────────────────────
router.post('/plan', validate(CreatePlanSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { profileName, location, householdSize, buildingType, vulnerabilities, members, language } = req.body;

    const rawPlan = await AIService.generatePreparednessPlan(
      location, householdSize, buildingType, vulnerabilities, members, language
    );

    const plan = new PreparednessPlan({
      profileName,
      location,
      householdSize,
      buildingType,
      vulnerabilities,
      members,
      riskLevel: rawPlan.riskLevel,
      checklist: rawPlan.checklist,
      safetyInstructions: rawPlan.safetyInstructions,
      language
    });
    await plan.save();

    res.status(201).json(plan);
  } catch (err) {
    console.error('[RainReady] Plan creation error:', err);
    res.status(500).json({ error: 'Failed to create preparedness plan. Please try again.' });
  }
});

// ─── PUT /plan/:id/checklist — Toggle a checklist item ────────────────────────
router.put('/plan/:id/checklist', validate(ChecklistUpdateSchema), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!validateObjectId(id, res)) return;

  try {
    const { itemId, completed, quantity } = req.body;
    const plan = await PreparednessPlan.findById(id);

    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    const item = plan.checklist.find(c => c.id === itemId);
    if (item) {
      item.completed = completed;
      item.quantity = quantity ?? item.quantity;
      await plan.save();
    }

    res.json(plan);
  } catch (err) {
    console.error('[RainReady] Checklist update error:', err);
    res.status(500).json({ error: 'Failed to update checklist item.' });
  }
});

// ─── POST /travel — Travel safety assessment ──────────────────────────────────
router.post('/travel', validate(TravelSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { origin, destination, mode } = req.body;
    const assessment = await AIService.assessTravelSafety(origin, destination, mode);
    res.json(assessment);
  } catch (err) {
    console.error('[RainReady] Travel advisor error:', err);
    res.status(500).json({ error: 'Travel safety assessment failed. Please try again.' });
  }
});

// ─── POST /chat — Multilingual safety chatbot ─────────────────────────────────
router.post('/chat', validate(ChatSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, history, language } = req.body;
    const response = await AIService.chatAssistant(history, message, language);
    res.json(response);
  } catch (err) {
    console.error('[RainReady] Chat error:', err);
    res.status(500).json({ error: 'Safety assistant is temporarily unavailable. Please try again.' });
  }
});

// ─── GET /plans — List all household profiles ─────────────────────────────────
router.get('/plans', async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = await PreparednessPlan.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-__v');
    res.json(plans);
  } catch (err) {
    console.error('[RainReady] Plans fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve household profiles.' });
  }
});

// ─── GET /alerts/:location — Get emergency alerts for a location ──────────────
router.get('/alerts/:location', async (req: Request, res: Response): Promise<void> => {
  try {
    const { location } = req.params;
    if (!location || location.trim().length < 2) {
      res.status(400).json({ error: 'Location parameter too short.' });
      return;
    }

    const safeLocation = escapeRegex(location.trim());
    const dbAlerts = await SafetyAlert.find({
      location: new RegExp(safeLocation, 'i')
    }).sort({ createdAt: -1 }).limit(10).select('-__v');

    // If no DB alerts exist for this city, fall back to an AI-generated alert
    // so every location always gets relevant, real-time monsoon guidance.
    if (dbAlerts.length === 0) {
      const aiAlert = await AIService.generateLocationAlert(location.trim());
      res.json([{ _id: 'ai-generated', location: location.trim(), createdAt: new Date().toISOString(), ...aiAlert }]);
      return;
    }

    res.json(dbAlerts);
  } catch (err) {
    console.error('[RainReady] Alerts fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve safety alerts.' });
  }
});

// ─── DELETE /plan/:id — Remove a household profile ───────────────────────────
router.delete('/plan/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!validateObjectId(id, res)) return;

  try {
    const deleted = await PreparednessPlan.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ error: 'Household profile not found.' });
      return;
    }
    res.json({ success: true, deleted: deleted._id });
  } catch (err) {
    console.error('[RainReady] Delete plan error:', err);
    res.status(500).json({ error: 'Failed to delete household profile.' });
  }
});

export default router;
