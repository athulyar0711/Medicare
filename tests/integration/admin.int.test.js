import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { TEST_DATA } from '../setup.js';
import jwt from 'jsonwebtoken';

let app;
const token = jwt.sign(
  { id: TEST_DATA.admin.userId, role: 'admin' }, 
  process.env.JWT_SECRET || 'medicare_test_secret_2024'
);

beforeAll(async () => {
    process.env.VITEST = 'true';
    const serverModule = await import('../../server.js');
    app = serverModule.default || serverModule;
});

describe('Admin Integration Experiments', () => {
  it('should view system statistics', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    
    if (res.status !== 200) console.error('ADMIN STATS FAILED:', res.body);
    expect(res.status).toBe(200);
    // Keys match routes/admin.js: totalPatients, totalAppointments, etc.
    expect(res.body.totalPatients).toBeDefined();
    expect(res.body.totalDoctors).toBeDefined();
  });
});
