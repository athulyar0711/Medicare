import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { TEST_DATA } from '../setup.js';
import jwt from 'jsonwebtoken';

let app;
const token = jwt.sign(
  { id: TEST_DATA.doctor.userId, role: 'doctor_user' }, 
  process.env.JWT_SECRET || 'medicare_test_secret_2024'
);

beforeAll(async () => {
    process.env.VITEST = 'true';
    const serverModule = await import('../../server.js');
    app = serverModule.default || serverModule;
});

describe('Doctor Integration Experiments', () => {
  it('should list appointments for the doctor', async () => {
    const res = await request(app)
      .get('/api/doctor/appointments')
      .set('Authorization', `Bearer ${token}`);
    
    if (res.status !== 200) console.error('FETCH APPOINTMENTS FAILED:', res.body);
    expect(res.status).toBe(200);
    // Backend returns an object with 'today', 'upcoming' keys
    expect(res.body.upcoming).toBeDefined();
    expect(Array.isArray(res.body.upcoming)).toBe(true);
  });
});
