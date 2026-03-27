import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { TEST_DATA } from '../setup.js';
import jwt from 'jsonwebtoken';

let app;
const token = jwt.sign(
  { id: TEST_DATA.patient.userId, role: 'patient' }, 
  process.env.JWT_SECRET || 'medicare_test_secret_2024'
);

beforeAll(async () => {
    process.env.VITEST = 'true';
    const serverModule = await import('../../server.js');
    app = serverModule.default || serverModule;
});

describe('Chat Integration Experiments', () => {
  it('should save message to MongoDB and preserve history', async () => {
    const message = "Hello AI, I feel a bit dizzy today.";
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: message });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();

    const historyRes = await request(app)
      .get('/api/chat')
      .set('Authorization', `Bearer ${token}`);
    
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.messages.length).toBeGreaterThanOrEqual(1);
  }, 15000);
});
