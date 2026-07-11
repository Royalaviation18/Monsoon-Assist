import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import router from '../routes/assistant.routes';
import { PreparednessPlan, SafetyAlert } from '../db/models';

jest.mock('../db/models', () => ({
  PreparednessPlan: {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  SafetyAlert: {
    find: jest.fn(),
  },
}));

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
    safetyInstructions: [
      { phase: 'before', action: 'Stock water', details: 'Store 20L drinking water.' },
      { phase: 'during', action: 'Elevate items', details: 'Move appliances off the ground.' },
      { phase: 'after', action: 'Sanitize', details: 'Use disinfectant on standing water spots.' },
    ],
    members: [],
    save: jest.fn().mockResolvedValue(true),
  };

  // Helper — full .sort().limit().select() chain mock
  const mockQueryChain = (result: unknown) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue(result),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Plans ────────────────────────────────────────────────────────────────

  it('GET /api/plans returns a list of household profiles', async () => {
    (PreparednessPlan.find as jest.Mock).mockReturnValue(mockQueryChain([mockPlan]));

    const res = await request(app).get('/api/plans');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].profileName).toBe('Mock Home');
  });

  it('GET /api/plans returns empty array when no profiles exist', async () => {
    (PreparednessPlan.find as jest.Mock).mockReturnValue(mockQueryChain([]));

    const res = await request(app).get('/api/plans');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // ─── Plan creation validation ────────────────────────────────────────────

  it('POST /api/plan rejects if profileName is too short', async () => {
    const res = await request(app).post('/api/plan').send({
      profileName: 'A',
      location: 'Mumbai',
      householdSize: 2,
      buildingType: 'ground_floor',
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/plan rejects an invalid buildingType', async () => {
    const res = await request(app).post('/api/plan').send({
      profileName: 'My Home',
      location: 'Mumbai',
      householdSize: 2,
      buildingType: 'tent',
    });
    expect(res.status).toBe(400);
  });

  // ─── Checklist ───────────────────────────────────────────────────────────

  it('PUT /api/plan/:id/checklist rejects an invalid Mongo ID', async () => {
    const res = await request(app)
      .put('/api/plan/invalid-id/checklist')
      .send({ itemId: 'c1', completed: true });
    expect(res.status).toBe(400);
  });

  // ─── Travel ──────────────────────────────────────────────────────────────

  it('POST /api/travel returns a hazard assessment', async () => {
    const res = await request(app).post('/api/travel').send({
      origin: 'Mumbai',
      destination: 'Pune',
      mode: 'driving',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hazardRating');
    expect(res.body).toHaveProperty('advisory');
    expect(Array.isArray(res.body.precautions)).toBe(true);
  });

  it('POST /api/travel rejects missing origin', async () => {
    const res = await request(app).post('/api/travel').send({
      destination: 'Pune',
      mode: 'driving',
    });
    expect(res.status).toBe(400);
  });

  // ─── Chat ────────────────────────────────────────────────────────────────

  it('POST /api/chat returns a reply', async () => {
    const res = await request(app).post('/api/chat').send({
      message: 'Is it safe to drive in rain?',
      history: [],
      language: 'English',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reply');
    expect(typeof res.body.reply).toBe('string');
  });

  it('POST /api/chat rejects an empty message', async () => {
    const res = await request(app).post('/api/chat').send({
      message: '',
      history: [],
      language: 'English',
    });
    expect(res.status).toBe(400);
  });

  // ─── Alerts ──────────────────────────────────────────────────────────────

  it('GET /api/alerts/:location returns DB alerts when they exist', async () => {
    const mockAlert = {
      _id: 'alert1',
      severity: 'critical',
      title: 'Heavy Rainfall Alert',
      message: 'Mumbai flood risk high.',
      location: 'Mumbai',
      recommendations: ['Stay indoors', 'Charge devices'],
    };
    (SafetyAlert.find as jest.Mock).mockReturnValue(mockQueryChain([mockAlert]));

    const res = await request(app).get('/api/alerts/Mumbai');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].title).toBe('Heavy Rainfall Alert');
  });

  it('GET /api/alerts/:location returns AI-generated fallback when DB is empty', async () => {
    (SafetyAlert.find as jest.Mock).mockReturnValue(mockQueryChain([]));

    const res = await request(app).get('/api/alerts/Bhopal');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toHaveProperty('title');
    expect(res.body[0]).toHaveProperty('severity');
    expect(res.body[0]).toHaveProperty('recommendations');
  });

  // ─── Delete ──────────────────────────────────────────────────────────────

  it('DELETE /api/plan/:id deletes an existing profile', async () => {
    (PreparednessPlan.findByIdAndDelete as jest.Mock).mockResolvedValue(mockPlan);

    const res = await request(app).delete('/api/plan/60d5ec49f83f2a1b88e1a111');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/plan/:id returns 404 when profile does not exist', async () => {
    (PreparednessPlan.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

    const res = await request(app).delete('/api/plan/60d5ec49f83f2a1b88e1a111');
    expect(res.status).toBe(404);
  });
});
