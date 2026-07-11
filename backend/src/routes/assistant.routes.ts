import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AIService } from '../services/ai.service';
import { PreparednessPlan, SafetyAlert } from '../db/models';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validates that a route param is a valid MongoDB ObjectId.
 * Sends a 400 response and returns false when the id is invalid.
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
    vulnerabilities: z.array(z.string().max(60)).max(10),
  })).max(30).default([]),
  language: z.string().max(30).default('English'),
});

const ChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.string().max(2000),
  })).max(50).default([]),
  language: z.string().max(30).default('English'),
});

const TravelSchema = z.object({
  origin: z.string().min(2, 'Origin location is required').max(100),
  destination: z.string().min(2, 'Destination location is required').max(100),
  mode: z.string().max(30).default('driving'),
});

const ChecklistUpdateSchema = z.object({
  itemId: z.string().min(1).max(50),
  completed: z.boolean(),
  quantity: z.string().max(50).optional().default('0'),
});

// ─── Validation Middleware ────────────────────────────────────────────────────

/**
 * Factory that returns an Express middleware which validates `req.body`
 * against the provided Zod schema. Sends 400 with structured error details
 * on failure; replaces `req.body` with the coerced/defaulted values on success.
 */
const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }
  req.body = result.data;
  next();
};

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /plan
 * Creates a new household preparedness plan.
 * Calls Gemini AI to generate a personalised checklist and before/during/after
 * safety instructions based on location, building type, and member profiles.
 * Returns the persisted plan document (201).
 */
router.post('/plan', validate(CreatePlanSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { profileName, location, householdSize, buildingType, vulnerabilities, members, language } = req.body;

    const rawPlan = await AIService.generatePreparednessPlan(
      location, householdSize, buildingType, vulnerabilities, members, language
    );

    const plan = new PreparednessPlan({
      profileName, location, householdSize, buildingType,
      vulnerabilities, members, language,
      riskLevel: rawPlan.riskLevel,
      checklist: rawPlan.checklist,
      safetyInstructions: rawPlan.safetyInstructions,
    });
    await plan.save();

    res.status(201).json(plan);
  } catch (err) {
    console.error('[RainReady] Plan creation error:', err);
    res.status(500).json({ error: 'Failed to create preparedness plan. Please try again.' });
  }
});

/**
 * PUT /plan/:id/checklist
 * Updates a single checklist item's `completed` status and `quantity`.
 * Uses optimistic-safe atomic field update — only the target item is mutated.
 * Returns the updated plan document (200).
 */
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

/**
 * POST /travel
 * Assesses monsoon travel safety between two Indian cities.
 * Returns a hazard rating (1-10), advisory text, and a list of precautions
 * generated by Gemini AI or a heuristic fallback when AI is unavailable.
 */
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

/**
 * POST /chat
 * Multilingual emergency safety chatbot powered by Gemini.
 * Accepts a message, conversation history, and preferred language.
 * Responds in the requested language with concise, life-safety-first advice.
 */
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

/**
 * GET /plans
 * Returns the 20 most recently created household preparedness profiles.
 * Sorted by creation date descending; excludes the internal `__v` field.
 */
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

/**
 * GET /alerts/:location
 * Returns active monsoon safety alerts for the given city.
 * Falls back to a Gemini-generated real-time alert when the database
 * contains no records for the requested location, ensuring every city
 * always receives actionable guidance.
 */
router.get('/alerts/:location', async (req: Request, res: Response): Promise<void> => {
  try {
    const { location } = req.params;
    if (!location || location.trim().length < 2) {
      res.status(400).json({ error: 'Location parameter too short.' });
      return;
    }

    const safeLocation = escapeRegex(location.trim());
    const dbAlerts = await SafetyAlert.find({
      location: new RegExp(safeLocation, 'i'),
    }).sort({ createdAt: -1 }).limit(10).select('-__v');

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

/**
 * DELETE /plan/:id
 * Permanently removes a household preparedness profile by its MongoDB ObjectId.
 * Returns `{ success: true, deleted: id }` on success (200),
 * or 404 when the profile does not exist.
 */
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
