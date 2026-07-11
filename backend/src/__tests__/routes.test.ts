import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import router from '../routes/assistant.routes';
import { PreparednessPlan } from '../db/models';

jest.mock('../db/models', () => {
  return {
    PreparednessPlan: {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn()
    },
    SafetyAlert: {
      find: jest.fn()
    }
  };
});

const app = express();
app.use(bodyParser.json());
app.use('/api', router);

describe('Router API Integration Tests', () => {
  const mockPlan = {
    _id: '60d5ec49f83f2a1b88e1a111',
    profileName: 'Mock Home',
    location: 'Mumbai',
    riskLevel: 'high',
    checklist: [{ id: 'c1', item: 'Water', category: 'Survival', quantity: '0', requiredQuantity: '10L', completed: false }],
    safetyInstructions: [{ phase: 'during', action: 'Elevate items', details: 'Details' }],
    members: [],
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/plans should return a list of profiles', async () => {
    (PreparednessPlan.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([mockPlan])
    });

    const res = await request(app).get('/api/plans');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].profileName).toBe('Mock Home');
  });

  it('POST /api/plan should fail if name is too short', async () => {
    const res = await request(app).post('/api/plan').send({
      profileName: 'A',
      location: 'Mumbai',
      householdSize: 2,
      buildingType: 'ground_floor'
    });
    expect(res.status).toBe(400);
  });

  it('PUT /api/plan/:id/checklist should fail on invalid mongo ID', async () => {
    const res = await request(app)
      .put('/api/plan/invalid-id/checklist')
      .send({ itemId: 'c1', completed: true });
    expect(res.status).toBe(400);
  });

  it('POST /api/travel should perform hazard calculations', async () => {
    const res = await request(app).post('/api/travel').send({
      origin: 'Mumbai',
      destination: 'Pune',
      mode: 'driving'
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hazardRating');
  });

  it('POST /api/chat should interact with emergency agent', async () => {
    const res = await request(app).post('/api/chat').send({
      message: 'Is it safe to drive in rain?',
      history: [],
      language: 'English'
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reply');
  });

  it('DELETE /api/plan/:id should delete active profile', async () => {
    (PreparednessPlan.findByIdAndDelete as jest.Mock).mockResolvedValue(mockPlan);

    const res = await request(app).delete('/api/plan/60d5ec49f83f2a1b88e1a111');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

});
