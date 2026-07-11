import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AIService } from '../services/ai.service';
import { PreparednessPlan, SafetyAlert } from '../db/models';

const router = Router();

// Zod schemas for input validation
const CreatePlanSchema = z.object({
  location: z.string().min(2, 'Location is required'),
  householdSize: z.number().min(1, 'Household size must be at least 1'),
  buildingType: z.enum(['ground_floor', 'high_rise', 'independent']),
  vulnerabilities: z.array(z.string()),
  language: z.string().default('English')
});

const ChatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.string()
  })).default([]),
  language: z.string().default('English')
});

const TravelSchema = z.object({
  origin: z.string().min(2, 'Origin location is required'),
  destination: z.string().min(2, 'Destination location is required'),
  mode: z.string().default('driving')
});

const ChecklistUpdateSchema = z.object({
  itemId: z.string(),
  completed: z.boolean(),
  quantity: z.string()
});

// Middleware for validation
const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err: any) {
    res.status(400).json({ error: 'Validation failed', details: err.errors });
  }
};

// Endpoints
router.post('/plan', validate(CreatePlanSchema), async (req: Request, res: Response) => {
  try {
    const { location, householdSize, buildingType, vulnerabilities, language } = req.body;
    
    // Call Gemini AI
    const rawPlan = await AIService.generatePreparednessPlan(
      location,
      householdSize,
      buildingType,
      vulnerabilities,
      language
    );

    // Save plan to MongoDB
    const plan = new PreparednessPlan({
      location,
      householdSize,
      buildingType,
      vulnerabilities,
      riskLevel: rawPlan.riskLevel,
      checklist: rawPlan.checklist,
      safetyInstructions: rawPlan.safetyInstructions,
      language
    });
    await plan.save();

    res.status(201).json(plan);
  } catch (err) {
    console.error('Plan creation error:', err);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// Toggle checklist items
router.put('/plan/:id/checklist', validate(ChecklistUpdateSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { itemId, completed, quantity } = req.body;

    const plan = await PreparednessPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const item = plan.checklist.find(c => c.id === itemId);
    if (item) {
      item.completed = completed;
      item.quantity = quantity;
      await plan.save();
    }

    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});

// Travel safety advisor
router.post('/travel', validate(TravelSchema), async (req: Request, res: Response) => {
  try {
    const { origin, destination, mode } = req.body;
    const assessment = await AIService.assessTravelSafety(origin, destination, mode);
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: 'Travel advisory failed' });
  }
});

// Chatbot assistant
router.post('/chat', validate(ChatSchema), async (req: Request, res: Response) => {
  try {
    const { message, history, language } = req.body;
    const response = await AIService.chatAssistant(history, message, language);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Assistant communication failed' });
  }
});

// Get recent plans
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await PreparednessPlan.find().sort({ createdAt: -1 }).limit(10);
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve plans' });
  }
});

// Get emergency alerts
router.get('/alerts/:location', async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    // Find alerts matching location
    const alerts = await SafetyAlert.find({ 
      location: new RegExp(location, 'i') 
    }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

export default router;
