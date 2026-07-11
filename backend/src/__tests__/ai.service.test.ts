import { AIService } from '../services/ai.service';

describe('AIService — offline/fallback mode (no GEMINI_API_KEY)', () => {

  it('assigns high risk to known flood zones regardless of building type', async () => {
    const plan = await AIService.generatePreparednessPlan(
      'Mumbai, Maharashtra', 3, 'independent', [], []
    );
    expect(plan.riskLevel).toBe('high');
    expect(plan.checklist.length).toBeGreaterThan(0);
    expect(plan.safetyInstructions.length).toBeGreaterThan(0);
  });

  it('assigns high risk to ground_floor buildings regardless of location', async () => {
    const plan = await AIService.generatePreparednessPlan(
      'Shimla', 2, 'ground_floor', [], []
    );
    expect(plan.riskLevel).toBe('high');
  });

  it('assigns moderate risk to high_rise buildings outside flood zones', async () => {
    const plan = await AIService.generatePreparednessPlan(
      'Delhi NCR', 2, 'high_rise', [], []
    );
    expect(plan.riskLevel).toBe('moderate');
  });

  it('assigns low risk to independent houses outside flood zones', async () => {
    const plan = await AIService.generatePreparednessPlan(
      'Shimla', 2, 'independent', [], []
    );
    expect(plan.riskLevel).toBe('low');
    expect(plan.checklist.length).toBeGreaterThan(0);
  });

  it('returns before/during/after phases in safetyInstructions', async () => {
    const plan = await AIService.generatePreparednessPlan(
      'Mumbai', 4, 'ground_floor', ['elderly'], []
    );
    const phases = plan.safetyInstructions.map(i => i.phase);
    expect(phases).toContain('before');
    expect(phases).toContain('during');
    expect(phases).toContain('after');
  });

  it('returns high hazard rating for Western Ghats routes', async () => {
    const assessment = await AIService.assessTravelSafety('Mumbai', 'Lonavala', 'driving');
    expect(assessment.hazardRating).toBeGreaterThanOrEqual(7);
    expect(assessment.advisory).toContain('Ghats');
    expect(assessment.precautions.length).toBeGreaterThan(0);
  });

  it('returns low hazard rating for non-Ghats routes', async () => {
    const assessment = await AIService.assessTravelSafety('Delhi', 'Jaipur', 'driving');
    expect(assessment.hazardRating).toBeLessThanOrEqual(5);
    expect(assessment.precautions.length).toBeGreaterThan(0);
  });

  it('returns offline-mode reply from chatAssistant fallback', async () => {
    const result = await AIService.chatAssistant([], 'How to prepare?', 'English');
    expect(result.reply).toContain('Offline Mode');
  });

  it('generateLocationAlert fallback returns required fields', async () => {
    const alert = await AIService.generateLocationAlert('Bhopal');
    expect(alert).toHaveProperty('severity');
    expect(alert).toHaveProperty('title');
    expect(alert).toHaveProperty('message');
    expect(Array.isArray(alert.recommendations)).toBe(true);
    expect(alert.recommendations.length).toBeGreaterThan(0);
    expect(['info', 'warning', 'critical']).toContain(alert.severity);
  });

  it('generateLocationAlert title includes the location name', async () => {
    const alert = await AIService.generateLocationAlert('Bhopal');
    expect(alert.title).toContain('Bhopal');
  });

});
