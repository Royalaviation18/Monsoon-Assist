import { AIService } from '../services/ai.service';

describe('AIService - Unit Tests', () => {
  describe('Heuristic calculations (with no api key / fallbacks)', () => {
    
    it('should correctly assign high risk to flood zones like Mumbai', async () => {
      const plan = await AIService.generatePreparednessPlan(
        'Mumbai, Maharashtra',
        3,
        'independent',
        [],
        []
      );
      expect(plan.riskLevel).toBe('high');
      expect(plan.checklist.length).toBeGreaterThan(0);
    });

    it('should assign moderate risk to high_rise buildings', async () => {
      const plan = await AIService.generatePreparednessPlan(
        'Delhi NCR',
        2,
        'high_rise',
        [],
        []
      );
      expect(plan.riskLevel).toBe('moderate');
    });

    it('should provide custom travel advisory warnings for Western Ghats routes', async () => {
      const origin = 'Mumbai';
      const destination = 'Lonavala';
      const assessment = await AIService.assessTravelSafety(origin, destination, 'driving');
      
      expect(assessment.hazardRating).toBeGreaterThanOrEqual(7);
      expect(assessment.advisory).toContain('Ghats');
      expect(assessment.precautions.length).toBeGreaterThan(0);
    });

    it('should fall back safely for normal routes', async () => {
      const origin = 'Delhi';
      const destination = 'Jaipur';
      const assessment = await AIService.assessTravelSafety(origin, destination, 'driving');
      
      expect(assessment.hazardRating).toBeLessThanOrEqual(5);
      expect(assessment.precautions.length).toBeGreaterThan(0);
    });

    it('should return default chatbot response on fallback', async () => {
      const result = await AIService.chatAssistant([], 'How to prepare?', 'English');
      expect(result.reply).toContain('Offline Mode');
    });

  });
});
